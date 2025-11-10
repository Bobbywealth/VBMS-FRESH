const express = require('express');
const router = express.Router();
const monitoringService = require('../services/monitoringService');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get system metrics (admin only)
router.get('/metrics', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics',
      details: error.message
    });
  }
});

// Get health status (public endpoint for load balancers)
router.get('/health', async (req, res) => {
  try {
    const health = await monitoringService.getHealthStatus();
    
    // Return 503 if system is unhealthy
    if (health.status === 'unhealthy') {
      return res.status(503).json(health);
    }
    
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get detailed health status (admin only)
router.get('/health/detailed', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const health = await monitoringService.getHealthStatus();
    res.json({
      success: true,
      health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get health status',
      details: error.message
    });
  }
});

// Get active alerts (admin only)
router.get('/alerts', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const alerts = monitoringService.getAlerts();
    res.json({
      success: true,
      alerts,
      count: alerts.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts',
      details: error.message
    });
  }
});

// Resolve alert (admin only)
router.post('/alerts/:alertId/resolve', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { alertId } = req.params;
    monitoringService.resolveAlert(parseInt(alertId));
    
    res.json({
      success: true,
      message: 'Alert resolved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
      details: error.message
    });
  }
});

// Log custom event (authenticated users)
router.post('/log', authenticateToken, async (req, res) => {
  try {
    const { level = 'info', message, data = {} } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    // Add user context
    const enrichedData = {
      ...data,
      userId: req.user.id,
      userEmail: req.user.email,
      source: 'client'
    };
    
    await monitoringService.logEvent(level, message, enrichedData);
    
    res.json({
      success: true,
      message: 'Event logged'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to log event',
      details: error.message
    });
  }
});

// Performance metrics endpoint (admin only)
router.get('/performance', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const metrics = monitoringService.getMetrics();
    const performance = {
      responseTime: {
        average: metrics.performance.avgResponseTime,
        p95: metrics.performance.p95ResponseTime,
        p99: metrics.performance.p99ResponseTime
      },
      requests: {
        total: metrics.requests.total,
        errorRate: metrics.requests.errorRate,
        requestsPerMinute: Math.round(metrics.requests.total / (metrics.system.uptime / 60))
      },
      database: {
        queries: metrics.database.queries,
        queriesPerMinute: Math.round(metrics.database.queries / (metrics.system.uptime / 60)),
        connectionState: metrics.database.connectionState
      },
      system: {
        uptime: metrics.system.uptime,
        memory: {
          heapUsed: Math.round(metrics.system.memory.heapUsed / 1024 / 1024),
          heapTotal: Math.round(metrics.system.memory.heapTotal / 1024 / 1024),
          external: Math.round(metrics.system.memory.external / 1024 / 1024)
        }
      }
    };
    
    res.json({
      success: true,
      performance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics',
      details: error.message
    });
  }
});

// System status dashboard (admin only)
router.get('/dashboard', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [metrics, health, alerts] = await Promise.all([
      monitoringService.getMetrics(),
      monitoringService.getHealthStatus(),
      monitoringService.getAlerts()
    ]);
    
    const dashboard = {
      status: health.status,
      uptime: metrics.system.uptime,
      requests: {
        total: metrics.requests.total,
        errors: metrics.requests.errors,
        errorRate: parseFloat(metrics.requests.errorRate)
      },
      performance: {
        avgResponseTime: metrics.performance.avgResponseTime,
        p95ResponseTime: metrics.performance.p95ResponseTime
      },
      users: {
        active: metrics.users.activeUsers
      },
      database: {
        queries: metrics.database.queries,
        status: health.services.database.status
      },
      memory: {
        used: Math.round(metrics.system.memory.heapUsed / 1024 / 1024),
        total: Math.round(metrics.system.memory.heapTotal / 1024 / 1024),
        status: health.services.memory.status
      },
      alerts: {
        active: alerts.length,
        recent: alerts.slice(-5)
      },
      apiCalls: metrics.apiCalls,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      dashboard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data',
      details: error.message
    });
  }
});

// Force garbage collection (admin only, development mode)
router.post('/gc', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Garbage collection not available in production'
      });
    }
    
    if (global.gc) {
      const beforeMemory = process.memoryUsage();
      global.gc();
      const afterMemory = process.memoryUsage();
      
      res.json({
        success: true,
        message: 'Garbage collection performed',
        memory: {
          before: {
            heapUsed: Math.round(beforeMemory.heapUsed / 1024 / 1024),
            heapTotal: Math.round(beforeMemory.heapTotal / 1024 / 1024)
          },
          after: {
            heapUsed: Math.round(afterMemory.heapUsed / 1024 / 1024),
            heapTotal: Math.round(afterMemory.heapTotal / 1024 / 1024)
          },
          freed: Math.round((beforeMemory.heapUsed - afterMemory.heapUsed) / 1024 / 1024)
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Garbage collection not exposed'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to perform garbage collection',
      details: error.message
    });
  }
});

module.exports = router;