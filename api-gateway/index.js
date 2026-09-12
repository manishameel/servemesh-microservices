const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

app.get('/health', (req, res) => {
  res.json({ service: 'api-gateway', status: 'ok' });
});

app.use('/api/auth', createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '' },
}));

app.use('/api/vendors', createProxyMiddleware({
  target: process.env.VENDOR_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/vendors': '' },
}));

app.use('/api/bookings', createProxyMiddleware({
  target: process.env.BOOKING_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/bookings': '' },
}));

app.listen(PORT, () => {
  console.log(`api-gateway listening on port ${PORT}`);
});