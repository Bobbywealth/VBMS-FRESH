// Only load .env in development - Railway provides env vars in production
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
  console.log('🔧 Loaded .env file for development');
} else {
  console.log('🚀 Production mode - using Railway environment variables');
}

// Debug environment variables (remove in production)
console.log('🔧 Environment Variables Check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
console.log('DATABASE_URL preview:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 60) + '...' : 'undefined');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Not set');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Not set');

// FORCE DATABASE_URL check
if (!process.env.DATABASE_URL) {
  console.error('🚨 CRITICAL: DATABASE_URL environment variable is not set!');
  console.error('🚨 Railway should provide DATABASE_URL = ${{Postgres.DATABASE_URL}}');
  console.error('🚨 Server will attempt to connect to localhost and fail');
} else {
  console.log('✅ DATABASE_URL is properly set, should connect to Railway PostgreSQL');
}

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
const OpenAI = require('openai');

// PostgreSQL database connection
const { pgPool, initializeDatabase } = require('./config/database');

// Security imports
const SecurityMiddleware = require('./middleware/security');
const ValidationMiddleware = require('./middleware/validation');

// Monitoring service
const monitoringService = require('./services/monitoringService');

// Task scheduler service
const taskScheduler = require('./services/taskScheduler');

// Initialize OpenAI (optional - only if API key is provided)
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-placeholder-key-not-configured') {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI initialized successfully');
  } catch (error) {
    console.log('⚠️ OpenAI initialization failed:', error.message);
    openai = null;
  }
} else {
  console.log('⚠️ OpenAI API key not provided - OpenAI features disabled');
}

const emailService = require('./services/emailService'); // Email service

const JWT_SECRET = process.env.JWT_SECRET || 'changeme123';

const app = express();

// Security middleware (applied before other middleware)
app.use(SecurityMiddleware.getHelmetConfig());
app.use(SecurityMiddleware.getCompression());
app.use(SecurityMiddleware.getSecurityLogger());
app.use(SecurityMiddleware.getSecurityHealthCheck());

// Rate limiting
app.use('/api/auth/login', SecurityMiddleware.getAuthRateLimit());
app.use('/api/auth/register', SecurityMiddleware.getAuthRateLimit());
app.use('/api/settings/upload-logo', SecurityMiddleware.getFileUploadRateLimit());
app.use('/api/settings/upload-file', SecurityMiddleware.getFileUploadRateLimit());
app.use('/api/', SecurityMiddleware.getAPIRateLimit());
app.use(SecurityMiddleware.getGeneralRateLimit());

// CORS configuration with security
app.use(cors(SecurityMiddleware.getCorsConfig()));
app.options('*', cors(SecurityMiddleware.getCorsConfig()));

// Body parsing with security
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization and validation
app.use(SecurityMiddleware.getMongoSanitizer());
app.use(SecurityMiddleware.getXSSProtection());
app.use(SecurityMiddleware.getHPPProtection());

// Initialize monitoring service
monitoringService.initialize();
monitoringService.setupErrorTracking();

// Add monitoring middleware
app.use(monitoringService.getRequestMonitoringMiddleware());
app.use(monitoringService.createPerformanceMiddleware());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes - ONLY ESSENTIAL WORKING ROUTES
const authRoutes = require('./routes/auth'); // ✅ Essential - login/register
const usersRoutes = require('./routes/users'); // ✅ Essential - user management
const healthRoutes = require('./routes/health'); // ✅ Essential - health checks
const onboardingRoutes = require('./routes/onboarding'); // ✅ Fixed for PostgreSQL

// ALL OTHER ROUTES TEMPORARILY DISABLED TO PREVENT CRASHES
// const adminRoutes = require('./routes/admin'); // ❌ DISABLED - imports old models
// const dashboardRoutes = require('./routes/dashboard'); // ❌ DISABLED - might import old models
// const taskRoutes = require('./routes/tasks'); // ❌ DISABLED - imports Task model
// const settingsRoutes = require('./routes/settings'); // ❌ DISABLED - imports Settings model
// const uberEatsRoutes = require('./routes/uber-eats'); // ❌ DISABLED - might import old models
// const stripeRoutes = require('./routes/stripe'); // ❌ DISABLED - imports old models
// const vapiRoutes = require('./routes/vapi'); // ❌ DISABLED - imports VAPICall model
// const inventoryRoutes = require('./routes/inventory'); // ❌ DISABLED - imports inventory models
// const monitoringRoutes = require('./routes/monitoring'); // ❌ DISABLED - might import old models
// const pricingRoutes = require('./routes/pricing'); // ❌ DISABLED - might import old models
// const emailRoutes = require('./routes/email'); // ❌ DISABLED - has stubs but might crash
// const emailSyncRoutes = require('./routes/email-sync'); // ❌ DISABLED - imports Email model
// const emailManagementRoutes = require('./routes/email-management'); // ❌ DISABLED - complex dependencies
// const affiliateRoutes = require('./routes/affiliates'); // ❌ DISABLED - imports Affiliate model
// const calendarRoutes = require('./routes/calendar'); // ❌ DISABLED - imports CalendarEvent model
// const notificationRoutes = require('./routes/notifications'); // ❌ DISABLED - has stubs but might crash

// Mount routes - ONLY ESSENTIAL WORKING ROUTES
app.use('/api/auth', authRoutes); // ✅ Essential - login/register works
app.use('/api/users', usersRoutes); // ✅ Essential - user management works
app.use('/api/health', healthRoutes); // ✅ Essential - health checks work
app.use('/api/onboarding', onboardingRoutes); // ✅ Fixed - onboarding works

// ALL OTHER ROUTES DISABLED TO PREVENT SERVER CRASHES
// Will be re-enabled one by one after PostgreSQL models are created
// app.use('/api/admin', adminRoutes); 
// app.use('/api/tasks', taskRoutes);
// app.use('/api/settings', settingsRoutes);
// app.use('/api/uber-eats', uberEatsRoutes);
// app.use('/api/stripe', stripeRoutes);
// app.use('/api/vapi', vapiRoutes);
// app.use('/api/inventory', inventoryRoutes);
// app.use('/api/monitoring', monitoringRoutes);
// app.use('/api/pricing', pricingRoutes);
// app.use('/api/email', emailRoutes);
// app.use('/api/email-sync', emailSyncRoutes);
// app.use('/api/email-management', emailManagementRoutes);
// app.use('/api/affiliates', affiliateRoutes);
// app.use('/api/calendar', calendarRoutes);
// app.use('/api/notifications', notificationRoutes);

// Dashboard routes also disabled during migration
// app.use('/api', dashboardRoutes);

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

// --- TEST ROUTE ---
app.get('/api/test', (req, res) => {
  res.json({ message: "API connection is working! 🎉" });
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
  
  // Database connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(503).json({
      error: 'Database connection failed',
      message: 'Unable to connect to the database. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Authentication failed. Please log in again.',
      timestamp: new Date().toISOString()
    });
  }
  
  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
  
  // Default error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 VBMS Backend server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: PostgreSQL`);
  console.log(`📊 Monitoring: ${monitoringService.isEnabled() ? 'Enabled' : 'Disabled'}`);
  
  // Start task scheduler if enabled
  if (process.env.ENABLE_SCHEDULER !== 'false') {
    taskScheduler.start();
    console.log('⏰ Task scheduler started');
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  try {
    await pgPool.end();
    console.log('✅ PostgreSQL connection pool closed');
  } catch (error) {
    console.error('❌ Error closing PostgreSQL pool:', error);
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  
  try {
    await pgPool.end();
    console.log('✅ PostgreSQL connection pool closed');
  } catch (error) {
    console.error('❌ Error closing PostgreSQL pool:', error);
  }
  
  process.exit(0);
});

module.exports = app;