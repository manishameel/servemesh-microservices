const express = require('express');
const { Kafka } = require('kafkajs');
require('dotenv').config();
const { createClient } = require('redis');

const redisPublisher = createClient({ url: process.env.REDIS_URL });

const app = express();
const PORT = process.env.PORT || 4004;

app.get('/health', (req, res) => {
  res.json({ service: 'notification-service', status: 'ok' });
});

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [process.env.KAFKA_BROKER],
});

const consumer = kafka.consumer({ groupId: 'notification-group' });

async function startConsumer() {
  await redisPublisher.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: 'booking-events', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());

      if (event.type === 'BookingCreated') {
        console.log(`📩 [Notification] New booking created! Notifying vendor #${event.booking.vendor_id} for: "${event.booking.service_name}"`);
      }

      if (event.type === 'BookingStatusUpdated') {
        console.log(`[Notification] Booking #${event.booking.id} status updated to "${event.booking.status}" — notifying user.`);
        await redisPublisher.publish('booking-status-updates', JSON.stringify({
          userId: event.booking.user_id,
          booking: event.booking,
        }));
      }
    },
  });

  console.log('Kafka consumer listening on booking-events');
}

async function start() {
  await startConsumer();
  app.listen(PORT, () => {
    console.log(`notification-service listening on port ${PORT}`);
  });
}

start();