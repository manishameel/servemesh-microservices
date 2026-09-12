const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const pool = require('./db');
const { verifyToken, requireRole } = require('./middleware/auth');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET;

app.get('/health', (req, res) => {
  res.json({ service: 'auth-service', status: 'ok' });
});


app.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, password required' });
    }

    
    const hashedPassword = await bcrypt.hash(password, 10);

    const allowedRoles = ['user', 'vendor', 'admin'];
    const finalRole = allowedRoles.includes(role) ? role : 'user';

    const result = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, hashedPassword, finalRole]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


app.post('/login', rateLimiter(5, 60), async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


app.get('/profile', verifyToken, (req, res) => {
  res.json({ message: 'You are authenticated!', user: req.user });
});


app.get('/admin-only', verifyToken, requireRole('admin'), (req, res) => {
  res.json({ message: 'Welcome, admin!' });
});

app.listen(PORT, () => {
  console.log(`auth-service listening on port ${PORT}`);
});