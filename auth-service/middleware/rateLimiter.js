const { createClient } = require('redis');

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.connect();

function rateLimiter(maxRequests, windowSeconds) {
  return async (req, res, next) => {
    const key = `rate:${req.ip}:${req.path}`;
    const current = await redisClient.incr(key);

    if (current === 1) {
      await redisClient.expire(key, windowSeconds);
    }

    if (current > maxRequests) {
      return res.status(429).json({ error: 'Too many requests, please try again later' });
    }

    next();
  };
}

module.exports = rateLimiter;