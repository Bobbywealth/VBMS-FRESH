require('dotenv').config(); // Always at the very top

// Global error handlers to catch ANY crash
process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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

// OpenAI initialized in routes/ai-chat.js

const emailService = require('./services/emailService'); // Email service

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET is not defined in environment variables.');
  } else {
    console.warn('⚠️  WARNING: JWT_SECRET not defined, using unsafe default for development only.');
  }
}
const FINAL_JWT_SECRET = JWT_SECRET || 'dev-secret-do-not-use-in-prod';

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
// REMOVED: MongoDB sanitizer - PostgreSQL only
// app.use(SecurityMiddleware.getMongoSanitizer());
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

// Serve frontend static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const dashboardRoutes = require('./routes/dashboard');
const usersRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const settingsRoutes = require('./routes/settings');
const uberEatsRoutes = require('./routes/uber-eats');
const stripeRoutes = require('./routes/stripe');
const onboardingRoutes = require('./routes/onboarding');
// const healthRoutes = require('./routes/health'); // REMOVED: MongoDB dependent
const vapiRoutes = require('./routes/vapi');
const inventoryRoutes = require('./routes/inventory');
// const reportRoutes = require('./routes/reports');
const monitoringRoutes = require('./routes/monitoring');
const pricingRoutes = require('./routes/pricing');
// const aiAgentRoutes = require('./routes/ai-agent');
// const emailRoutes = require('./routes/email'); // REMOVED: MongoDB dependent
const emailSyncRoutes = require('./routes/email-sync');
const emailManagementRoutes = require('./routes/email-management');
const affiliateRoutes = require('./routes/affiliates');
const calendarRoutes = require('./routes/calendar');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payments');
const aiChatRoutes = require('./routes/ai-chat');
const taskSchedulerRoutes = require('./routes/tasks-scheduler');
const webhookRoutes = require('./routes/webhooks');
const businessRoutes = require('./routes/business');

// Debug endpoint to check users (REMOVE IN PRODUCTION)
app.get('/api/debug/users', async (req, res) => {
  try {
    const client = await pgPool.connect();
    const result = await client.query('SELECT id, email, role, created_at FROM users');
    client.release();
    res.json({
      count: result.rows.length,
      users: result.rows,
      db_url_masked: process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1] : 'NOT_SET'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/uber-eats', uberEatsRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/vapi', vapiRoutes);
app.use('/api/inventory', inventoryRoutes);
// app.use('/api/reports', reportRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/pricing', pricingRoutes);
// app.use('/api/ai-agent', aiAgentRoutes);
// app.use('/api/email', emailRoutes); // REMOVED: MongoDB dependent
app.use('/api/email-sync', emailSyncRoutes);
app.use('/api/email-management', emailManagementRoutes);
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/timesheet', require('./routes/timesheet')); // New Timesheet Route
app.use('/api/business', businessRoutes);
app.use('/api', aiChatRoutes); // Mounts at /api/chat because the router defines /chat
app.use('/api', taskSchedulerRoutes); // Mounts at /api because routes define full paths like /tasks/upcoming
app.use('/', webhookRoutes); // Mounts at root because the route is /webhook
// app.use('/api/health', healthRoutes); // REMOVED: MongoDB dependent
// app.use('/health', healthRoutes); // REMOVED: MongoDB dependent

// --- TASK SCHEDULER ROUTES ---
// Moved to routes/tasks-scheduler.js
app.use('/api', dashboardRoutes);

const PORT = process.env.PORT || 5050;

// --- Connect to PostgreSQL ---
initializeDatabase()
  .then(() => {
    console.log('✅ PostgreSQL database initialized successfully');

    // Start server only after database is ready
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server started on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('❌ PostgreSQL initialization error:', err);
    process.exit(1);
  });

// --- HEALTH CHECK ---
app.get('/', (req, res) => {
  res.send('VBMS Backend is running!');
});

// --- TEST ROUTE ---
app.get('/api/test', (req, res) => {
  res.json({ message: "API connection is working! 🎉" });
});

// --- LEGACY ROUTES REMOVED ---
// Old MongoDB-based onboarding, register, and login routes have been removed.
// Use the PostgreSQL-based routes in /routes/auth.js instead.

// --- STRIPE ROUTES ---
// Moved to routes/stripe.js

// --- STRIPE WEBHOOK ROUTE ---
// Moved to routes/webhooks.js

// --- AI CHAT ROUTE ---
// Moved to routes/ai-chat.js

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Serve uploaded files (already defined above)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add logging middleware for debugging
app.use('/api/settings', (req, res, next) => {
  console.log(`Settings API: ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});