// Only load .env in development - Railway provides env vars in production
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
  console.log('🔧 Loaded .env file for development');
} else {
  console.log('🚀 Production mode - using Railway environment variables');
}

// CRITICAL DEBUG - Show environment variables
console.log('🔧 Environment Variables Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
console.log('DATABASE_URL preview:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 60) + '...' : 'undefined');

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Initialize Stripe (optional - only if API key is provided)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder') {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe initialized successfully');
  } catch (error) {
    console.log('⚠️ Stripe initialization failed:', error.message);
    stripe = null;
  }
} else {
  console.log('⚠️ Stripe API key not provided - Stripe features disabled');
}

const path = require('path');

// Initialize OpenAI (optional - only if API key is provided)
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here') {
  try {
    const OpenAI = require('openai');
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI initialized successfully');
  } catch (error) {
    console.log('⚠️ OpenAI initialization failed:', error.message);
    openai = null;
  }
} else {
  console.log('⚠️ OpenAI API key not provided - AI features disabled');
}

// PostgreSQL database connection
const { pgPool, initializeDatabase } = require('./config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme123';

const app = express();

// Basic middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://vbmstest1.netlify.app', 'https://comfy-cannoli-f3cd91.netlify.app'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import ONLY working routes
const authRoutes = require('./routes/auth'); // ✅ Essential - login/register
const usersRoutes = require('./routes/users'); // ✅ Essential - user management
const healthRoutes = require('./routes/health'); // ✅ Essential - health checks
const onboardingRoutes = require('./routes/onboarding'); // ✅ Fixed for PostgreSQL
const affiliateRoutes = require('./routes/affiliates'); // ✅ Re-enabled with PostgreSQL Affiliate model
const adminRoutes = require('./routes/admin'); // ✅ Phase 1 - Admin management
const dashboardRoutes = require('./routes/dashboard'); // ✅ Phase 1 - Dashboard stats  
const settingsRoutes = require('./routes/settings'); // ✅ Phase 1 - Settings management

// Mount ONLY working routes
app.use('/api/auth', authRoutes); // ✅ Essential - login/register works
app.use('/api/users', usersRoutes); // ✅ Essential - user management works
app.use('/api/health', healthRoutes); // ✅ Essential - health checks work
app.use('/api/onboarding', onboardingRoutes); // ✅ Fixed - onboarding works
app.use('/api/affiliates', affiliateRoutes); // ✅ Re-enabled - affiliate management works
app.use('/api/admin', adminRoutes); // ✅ Phase 1 - Admin management works
app.use('/api/settings', settingsRoutes); // ✅ Phase 1 - Settings management works

// Mount dashboard routes at root level for backward compatibility
app.use('/api', dashboardRoutes);

const PORT = process.env.PORT || 5050;

// --- Connect to PostgreSQL ---
initializeDatabase()
  .then(() => {
    console.log('✅ PostgreSQL database initialized successfully');
  })
  .catch((err) => {
    console.error('❌ PostgreSQL initialization error:', err);
    process.exit(1);
  });

// --- HEALTH CHECK ---
app.get('/', (req, res) => {
  res.json({ 
    message: 'VBMS Backend is running!',
    database: 'PostgreSQL',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Railway health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'VBMS Backend is running!',
    database: 'PostgreSQL',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Database health check endpoint
app.get('/api/health/database', async (req, res) => {
  try {
    const client = await pgPool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    client.release();
    
    res.json({
      status: 'healthy',
      database: 'PostgreSQL',
      connection: 'active',
      timestamp: result.rows[0].current_time,
      version: result.rows[0].pg_version
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'PostgreSQL',
      connection: 'failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 VBMS Backend server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ Database: PostgreSQL`);
  console.log(`🔑 JWT Secret: ${JWT_SECRET ? 'Set' : 'Not set'}`);
  console.log(`💳 Stripe: ${stripe ? 'Enabled' : 'Disabled'}`);
  console.log(`🤖 OpenAI: ${openai ? 'Enabled' : 'Disabled'}`);
});

module.exports = app;

