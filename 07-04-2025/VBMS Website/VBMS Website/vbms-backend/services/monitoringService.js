const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      activeUsers: new Set(),
      dbQueries: 0,
      apiCalls: {
        stripe: 0,
        vapi: 0,
        openai: 0
      }
    };
    
    this.alerts = [];
    this.logBuffer = [];
    this.isInitialized = false;
  }

  async initialize() {
    try {
      // Create logs directory if it doesn't exist
      const logsDir = path.join(__dirname, '../logs');
      try {
        await fs.access(logsDir);
      } catch {
        await fs.mkdir(logsDir, { recursive: true });
      }

      // Set up periodic metric collection
      this.startMetricCollection();
      
      // Set up log rotation
      this.setupLogRotation();
      
      this.isInitialized = true;
      console.log('🔍 Monitoring service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize monitoring service:', error);
    }
  }

  // Middleware for request monitoring
  getRequestMonitoringMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Track request
      this.metrics.requests++;
      
      // Track active user
      if (req.user && req.user.id) {
        this.metrics.activeUsers.add(req.user.id);
      }

      // Override res.end to capture response
      const originalEnd = res.end;
      res.end = function(chunk, encoding) {
        const duration = Date.now() - startTime;
        
        // Record response time
        this.metrics.responseTime.push(duration);
        
        // Keep only last 1000 response times
        if (this.metrics.responseTime.length > 1000) {
          this.metrics.responseTime = this.metrics.responseTime.slice(-1000);
        }

        // Track errors
        if (res.statusCode >= 400) {
          this.metrics.errors++;
        }

        // Log request
        this.logRequest(req, res, duration);
        
        originalEnd.call(res, chunk, encoding);
      }.bind(this);

      next();
    };
  }

  // Log request details
  logRequest(req, res, duration) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user ? req.user.id : null,
      error: res.statusCode >= 400 ? res.statusMessage : null
    };

    this.logBuffer.push(logEntry);
    
    // Flush logs every 100 entries or 5 minutes
    if (this.logBuffer.length >= 100) {
      this.flushLogs();
    }
  }

  // Log application events
  async logEvent(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      data,
      pid: process.pid
    };

    this.logBuffer.push(logEntry);

    // Console output for development
    if (process.env.NODE_ENV !== 'production') {
      const levelColors = {
        ERROR: '\x1b[31m',
        WARN: '\x1b[33m',
        INFO: '\x1b[36m',
        DEBUG: '\x1b[90m'
      };
      const color = levelColors[level.toUpperCase()] || '';
      console.log(`${color}[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}\x1b[0m`);
    }

    // Check for critical errors
    if (level === 'error') {
      this.checkForAlerts(logEntry);
    }
  }

  // Track API usage
  trackAPICall(service, endpoint, duration, success = true) {
    if (this.metrics.apiCalls[service] !== undefined) {
      this.metrics.apiCalls[service]++;
    }

    this.logEvent('info', `API call to ${service}`, {
      endpoint,
      duration,
      success,
      service
    });
  }

  // Track database operations
  trackDBQuery(operation, collection, duration) {
    this.metrics.dbQueries++;
    
    this.logEvent('debug', `Database query`, {
      operation,
      collection,
      duration
    });
  }

  // Get current system metrics
  getMetrics() {
    const now = Date.now();
    const avgResponseTime = this.metrics.responseTime.length > 0 
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
      : 0;

    return {
      requests: {
        total: this.metrics.requests,
        errors: this.metrics.errors,
        errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) : 0
      },
      performance: {
        avgResponseTime: Math.round(avgResponseTime),
        p95ResponseTime: this.calculatePercentile(this.metrics.responseTime, 95),
        p99ResponseTime: this.calculatePercentile(this.metrics.responseTime, 99)
      },
      users: {
        activeUsers: this.metrics.activeUsers.size
      },
      database: {
        queries: this.metrics.dbQueries,
        connectionState: mongoose.connection.readyState
      },
      apiCalls: this.metrics.apiCalls,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      },
      timestamp: now
    };
  }

  // Calculate percentile for response times
  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * (percentile / 100)) - 1;
    return Math.round(sorted[index] || 0);
  }

  // Health check
  async getHealthStatus() {
    const metrics = this.getMetrics();
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: this.checkDatabaseHealth(),
        memory: this.checkMemoryHealth(),
        responseTime: this.checkResponseTimeHealth()
      },
      metrics
    };

    // Determine overall health
    const unhealthyServices = Object.values(status.services).filter(s => s.status !== 'healthy');
    if (unhealthyServices.length > 0) {
      status.status = 'degraded';
    }

    return status;
  }

  // Check database health
  checkDatabaseHealth() {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    return {
      status: dbState === 1 ? 'healthy' : 'unhealthy',
      state: states[dbState],
      responseTime: mongoose.connection.db ? 'normal' : 'unknown'
    };
  }

  // Check memory health
  checkMemoryHealth() {
    const usage = process.memoryUsage();
    const maxMemory = 512 * 1024 * 1024; // 512MB threshold
    
    return {
      status: usage.heapUsed < maxMemory ? 'healthy' : 'warning',
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024)
    };
  }

  // Check response time health
  checkResponseTimeHealth() {
    const avgResponseTime = this.metrics.responseTime.length > 0 
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
      : 0;

    return {
      status: avgResponseTime < 1000 ? 'healthy' : avgResponseTime < 3000 ? 'warning' : 'critical',
      averageMs: Math.round(avgResponseTime),
      p95Ms: this.calculatePercentile(this.metrics.responseTime, 95)
    };
  }

  // Check for alerts based on thresholds
  checkForAlerts(logEntry) {
    const now = Date.now();
    
    // Error rate alert
    const errorRate = this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) : 0;
    if (errorRate > 0.05) { // 5% error rate
      this.createAlert('high_error_rate', `Error rate is ${(errorRate * 100).toFixed(2)}%`, {
        errorRate,
        requests: this.metrics.requests,
        errors: this.metrics.errors
      });
    }

    // Memory alert
    const usage = process.memoryUsage();
    if (usage.heapUsed > 400 * 1024 * 1024) { // 400MB
      this.createAlert('high_memory_usage', `Memory usage is ${Math.round(usage.heapUsed / 1024 / 1024)}MB`, {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal
      });
    }

    // Response time alert
    const avgResponseTime = this.metrics.responseTime.length > 0 
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
      : 0;
    
    if (avgResponseTime > 2000) { // 2 seconds
      this.createAlert('slow_response_time', `Average response time is ${Math.round(avgResponseTime)}ms`, {
        avgResponseTime,
        p95ResponseTime: this.calculatePercentile(this.metrics.responseTime, 95)
      });
    }
  }

  // Create alert
  createAlert(type, message, data = {}) {
    const alert = {
      id: Date.now() + Math.random(),
      type,
      message,
      data,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    // Prevent duplicate alerts within 5 minutes
    const existingAlert = this.alerts.find(a => 
      a.type === type && 
      !a.resolved && 
      (Date.now() - new Date(a.timestamp).getTime()) < 300000
    );

    if (!existingAlert) {
      this.alerts.push(alert);
      this.logEvent('warn', `ALERT: ${message}`, data);
      
      // Keep only last 100 alerts
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-100);
      }
    }
  }

  // Get active alerts
  getAlerts() {
    return this.alerts.filter(alert => !alert.resolved);
  }

  // Resolve alert
  resolveAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
    }
  }

  // Flush logs to file
  async flushLogs() {
    if (this.logBuffer.length === 0) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const logFile = path.join(__dirname, '../logs', `vbms-${today}.log`);
      
      const logData = this.logBuffer.map(entry => JSON.stringify(entry)).join('\n') + '\n';
      await fs.appendFile(logFile, logData);
      
      this.logBuffer = [];
    } catch (error) {
      console.error('Failed to flush logs:', error);
    }
  }

  // Start periodic metric collection
  startMetricCollection() {
    // Collect metrics every minute
    setInterval(() => {
      this.collectSystemMetrics();
    }, 60000);

    // Flush logs every 5 minutes
    setInterval(() => {
      this.flushLogs();
    }, 300000);

    // Clean up old response times every hour
    setInterval(() => {
      this.metrics.responseTime = this.metrics.responseTime.slice(-500);
      this.metrics.activeUsers.clear(); // Reset active users
    }, 3600000);
  }

  // Collect system metrics
  collectSystemMetrics() {
    const metrics = this.getMetrics();
    this.logEvent('info', 'System metrics collected', {
      requests: metrics.requests.total,
      errors: metrics.requests.errors,
      avgResponseTime: metrics.performance.avgResponseTime,
      activeUsers: metrics.users.activeUsers,
      memoryUsage: Math.round(metrics.system.memory.heapUsed / 1024 / 1024)
    });
  }

  // Set up log rotation
  setupLogRotation() {
    // Clean up logs older than 30 days at startup
    setInterval(async () => {
      try {
        const logsDir = path.join(__dirname, '../logs');
        const files = await fs.readdir(logsDir);
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

        for (const file of files) {
          if (file.startsWith('vbms-') && file.endsWith('.log')) {
            const filePath = path.join(logsDir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime.getTime() < thirtyDaysAgo) {
              await fs.unlink(filePath);
              console.log(`Deleted old log file: ${file}`);
            }
          }
        }
      } catch (error) {
        console.error('Log rotation error:', error);
      }
    }, 24 * 60 * 60 * 1000); // Daily
  }

  // Error tracking for uncaught exceptions
  setupErrorTracking() {
    process.on('uncaughtException', (error) => {
      this.logEvent('error', 'Uncaught Exception', {
        message: error.message,
        stack: error.stack,
        fatal: true
      });
      
      // Allow time for log to be written before exit
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logEvent('error', 'Unhandled Promise Rejection', {
        reason: reason.toString(),
        promise: promise.toString()
      });
    });
  }

  // Performance monitoring
  createPerformanceMiddleware() {
    return (req, res, next) => {
      const startTime = process.hrtime.bigint();
      
      res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        
        // Log slow requests
        if (duration > 1000) {
          this.logEvent('warn', 'Slow request detected', {
            method: req.method,
            url: req.url,
            duration: Math.round(duration),
            statusCode: res.statusCode
          });
        }
      });
      
      next();
    };
  }
}

module.exports = new MonitoringService();