const express = require('express');
require('dotenv').config();
const pool = require('./db');
const { verifyToken, requireRole } = require('./middleware/auth');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4003;

app.get('/health', (req, res) => {
  res.json({ service: 'vendor-service', status: 'ok' });
});

app.post('/register', verifyToken, async (req, res) => {
  try {
    const { business_name, category } = req.body;

    if (!business_name) {
      return res.status(400).json({ error: 'business_name is required' });
    }

    const result = await pool.query(
      `INSERT INTO vendors (user_id, business_name, category, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [req.user.id, business_name, category || null]
    );

    res.status(201).json({ vendor: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


app.get('/my-status', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vendors WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No vendor profile found' });
    }

    res.json({ vendor: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


app.get('/pending', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM vendors WHERE status = 'pending'"
    );
    res.json({ vendors: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});


app.patch('/:id/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }

    const result = await pool.query(
      'UPDATE vendors SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({ vendor: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.listen(PORT, () => {
  console.log(`vendor-service listening on port ${PORT}`);
});