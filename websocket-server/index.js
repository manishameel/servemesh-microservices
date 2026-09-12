const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 4005;
const JWT_SECRET = process.env.JWT_SECRET;

app.get('/health', (req, res) => {
  res.json({ service: 'websocket-server', status: 'ok' });
});

const publisher = createClient({ url: process.env.REDIS_URL });
const subscriber = createClient({ url: process.env.REDIS_URL });

async function setupRedis() {
  await publisher.connect();
  await subscriber.connect();

  await subscriber.subscribe('chat-messages', (rawMessage) => {
    const data = JSON.parse(rawMessage);
    io.to(data.room).emit('receive_message', data);
  });

  console.log('Redis pub/sub connected');
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token provided'));

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: id=${socket.user.id}, role=${socket.user.role}`);

  socket.on('join_room', (room) => {
    socket.join(room);
    console.log(`User ${socket.user.id} joined room: ${room}`);
  });

  socket.on('send_message', async (data) => {
    const message = {
      room: data.room,
      senderId: socket.user.id,
      senderRole: socket.user.role,
      text: data.text,
      time: new Date().toISOString(),
    };
    await publisher.publish('chat-messages', JSON.stringify(message));
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: id=${socket.user.id}`);
  });
});

async function start() {
  await setupRedis();
  server.listen(PORT, () => {
    console.log(`websocket-server listening on port ${PORT}`);
  });
}

start();