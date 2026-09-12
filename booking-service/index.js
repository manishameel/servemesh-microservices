const express = require('express');
require('dotenv').config();
const pool = require('./db');
const { verifyToken, requireRole } = require('./middleware/auth');
const { connectProducer, sendEvent } = require('./kafka');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4002;

app.get('/health', (req, res) => {
  res.json({ service: 'booking-service', status: 'ok' });
});


app.post('/bookings', verifyToken, requireRole('user'), async (req, res) => {
  try {
    const { vendor_id, service_name, scheduled_time } = req.body;

    if (!vendor_id || !service_name) {
      return res.status(400).json({ error: 'vendor_id and service_name are required' });
    }

    const result = await pool.query(
      `INSERT INTO bookings (user_id, vendor_id, service_name, status, scheduled_time)
       VALUES ($1, $2, $3, 'created', $4)
       RETURNING *`,
      [req.user.id, vendor_id, service_name, scheduled_time || null]
    );

    const booking = result.rows[0];

    
    await sendEvent('booking-events', {
      type: 'BookingCreated',
      booking,
    });

    res.status(201).json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


app.get('/bookings/mine', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ bookings: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


app.patch('/bookings/:id/status', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['confirmed', 'vendor_assigned', 'on_the_way', 'completed', 'rejected'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowedStatuses.join(', ')}` });
    }

    const result = await pool.query(
      'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = result.rows[0];

    
    await sendEvent('booking-events', {
      type: 'BookingStatusUpdated',
      booking,
    });

    res.json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

async function start() {
  await connectProducer();
  app.listen(PORT, () => {
    console.log(`booking-service listening on port ${PORT}`);
  });
}

start();