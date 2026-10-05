const express = require('express');
const { Pool } = require('pg');
const { createClient } = require('redis');

const app = express();
const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 5,
});
const redis = createClient({ url: process.env.REDIS_URL || 'redis://cache:6379' });
redis.on('error', (e) => console.error('redis error:', e.message));

// Liveness: no external dependencies
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Readiness: checks DB + cache
app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    if (!redis.isOpen) await redis.connect();
    await redis.ping();
    res.json({ status: 'ready' });
  } catch (e) {
    res.status(503).json({ status: 'not-ready', error: e.message });
  }
});

app.get('/api/visits', async (_req, res) => {
  try {
    if (!redis.isOpen) await redis.connect();
    const visits = await redis.incr('visits');
    res.json({ visits });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = app;
