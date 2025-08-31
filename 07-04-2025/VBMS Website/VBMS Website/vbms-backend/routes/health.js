const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const emailService = require('../services/emailService');

// Basic health check
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Detailed health check with dependencies
router.get('/detailed', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: { status: 'unknown', latency: null },
      stripe: { status: 'unknown', latency: null },
      email: { status: 'unknown', latency: null },
      storage: { status: 'unknown', latency: null }
    },
    system: {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      cpu: {
        usage: process.cpuUsage()
      }
    }
  };

  // Check MongoDB connection
  try {
    const dbStart = Date.now();
    await mongoose.connection.db.admin().ping();
    healthCheck.services.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
      connection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    };
  } catch (error) {
    healthCheck.services.database = {
      status: 'unhealthy',
      error: error.message,
      latency: null
    };
    healthCheck.status = 'degraded';
  }

  // Check Stripe connection
  try {
    const stripeStart = Date.now();
    await stripe.accounts.retrieve();
    healthCheck.services.stripe = {
      status: 'healthy',
      latency: Date.now() - stripeStart
    };
  } catch (error) {
    healthCheck.services.stripe = {
      status: 'unhealthy',
      error: error.message,
      latency: null
    };
    healthCheck.status = 'degraded';
  }

  // Check email service
  try {
    healthCheck.services.email = {
      status: emailService.transporter ? 'healthy' : 'not_configured',
      configured: !!process.env.SMTP_USER
    };
  } catch (error) {
    healthCheck.services.email = {
      status: 'unhealthy',
      error: error.message
    };
  }

  // Check storage (file system)
  try {
    const fs = require('fs');
    const path = require('path');
    const uploadsPath = path.join(__dirname, '../uploads');
    
    fs.accessSync(uploadsPath, fs.constants.W_OK);
    healthCheck.services.storage = {
      status: 'healthy',
      uploadsPath: uploadsPath,
      writable: true
    };
  } catch (error) {
    healthCheck.services.storage = {
      status: 'unhealthy',
      error: error.message,
      writable: false
    };
  }

  // Determine overall status
  const unhealthyServices = Object.values(healthCheck.services)
    .filter(service => service.status === 'unhealthy').length;
  
  if (unhealthyServices > 0) {
    healthCheck.status = unhealthyServices > 1 ? 'unhealthy' : 'degraded';
  }

  // Set appropriate HTTP status code
  const statusCode = healthCheck.status === 'healthy' ? 200 : 
                    healthCheck.status === 'degraded' ? 207 : 503;

  res.status(statusCode).json(healthCheck);
});

// Readiness check (for Kubernetes)
router.get('/ready', async (req, res) => {
  try {
    // Check if database is ready
    await mongoose.connection.db.admin().ping();
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness check (for Kubernetes)
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Metrics endpoint (Prometheus format)
router.get('/metrics', (req, res) => {
  const metrics = {
    // Process metrics
    process_uptime_seconds: process.uptime(),
    process_memory_usage_bytes: process.memoryUsage().heapUsed,
    process_memory_total_bytes: process.memoryUsage().heapTotal,
    
    // Database metrics
    database_connection_status: mongoose.connection.readyState,
    
    // Application metrics
    app_version: process.env.npm_package_version || '1.0.0',
    app_environment: process.env.NODE_ENV || 'development',
    
    // HTTP metrics (would need to be collected elsewhere)
    http_requests_total: 0, // Placeholder
    http_request_duration_seconds: 0 // Placeholder
  };

  // Convert to Prometheus format
  let prometheusMetrics = '';
  for (const [key, value] of Object.entries(metrics)) {
    prometheusMetrics += `# TYPE ${key} gauge\n`;
    prometheusMetrics += `${key} ${value}\n`;
  }

  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics);
});

// Database stats
router.get('/db-stats', async (req, res) => {
  try {
    const stats = await mongoose.connection.db.stats();
    
    res.json({
      database: {
        name: mongoose.connection.name,
        collections: stats.collections,
        documents: stats.objects,
        dataSize: Math.round(stats.dataSize / 1024 / 1024), // MB
        storageSize: Math.round(stats.storageSize / 1024 / 1024), // MB
        indexes: stats.indexes,
        indexSize: Math.round(stats.indexSize / 1024 / 1024) // MB
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve database stats',
      message: error.message
    });
  }
});

module.exports = router;