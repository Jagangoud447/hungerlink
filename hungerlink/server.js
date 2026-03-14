require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();

// ─── Connect Database ──────────────────────────────────────────
connectDB();

// ─── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests, please try again later' }
});

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ────────────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/donations', require('./routes/donations'));
app.use('/api/farmers', require('./routes/farmers'));
app.use('/api/reports', require('./routes/reports'));

// ─── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', platform: 'HungerLink', timestamp: new Date().toISOString() });
});

// ─── Catch-all: serve frontend ────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('HungerLink running on http://localhost:' + PORT);
});
