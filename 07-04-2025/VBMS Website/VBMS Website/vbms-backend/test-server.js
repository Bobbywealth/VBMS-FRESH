require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = 5051; // Different port to avoid conflicts

// Basic middleware
app.use(cors());
app.use(express.json());

// Import just the email management routes
const emailManagementRoutes = require('./routes/email-management');

// Simple auth middleware for testing
const testAuth = (req, res, next) => {
  req.user = { role: 'main_admin', id: 'test-user' };
  next();
};

// Mount email management routes with test auth
app.use('/api/email-management', testAuth, emailManagementRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'test-server' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
  }).catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// Start server
app.listen(PORT, () => {
  console.log(`Test server started on http://localhost:${PORT}`);
});

