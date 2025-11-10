// routes/dashboard.js

const express = require('express');
const router = express.Router();

// Simple, unlocked route
router.get('/dashboard', (req, res) => {
  res.json({ message: "Welcome to your dashboard!" });
});

module.exports = router;
