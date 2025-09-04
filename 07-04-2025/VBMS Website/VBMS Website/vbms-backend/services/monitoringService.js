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
    this.isInitialized = false;
    this.logPath = path.join(__dirname, '../logs');
  }

  // Initialize monitoring service
  initialize() {
    this.isInitialized = true;
    console.log('✅ Monitoring service initialized (PostgreSQL mode)');
  }

  // Check if monitoring is enabled
  isEnabled() {
    return this.isInitialized;
  }

  // Setup error tracking
  setupErrorTracking() {
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.logError(error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.logError(reason);
    });
  }

  // Get request monitoring middleware
  getRequestMonitoringMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      this.metrics.requests++;

      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        this.metrics.responseTime.push(responseTime);
        
        if (this.metrics.responseTime.length > 1000) {
          this.metrics.responseTime = this.metrics.responseTime.slice(-500);
        }
      });

      next();
    };
  }

  // Create performance middleware
  createPerformanceMiddleware() {
    return (req, res, next) => {
      req.startTime = Date.now();
      next();
    };
  }

  // Log error
  async logError(error) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        error: error.message || error,
        stack: error.stack,
        type: 'error'
      };

      await this.writeLog('error.log', JSON.stringify(logEntry) + '\n');
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  // Write log to file
  async writeLog(filename, content) {
    try {
      await fs.mkdir(this.logPath, { recursive: true });
      await fs.appendFile(path.join(this.logPath, filename), content);
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  // Get system metrics (simplified for PostgreSQL)
  getSystemMetrics() {
    return {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      avgResponseTime: this.metrics.responseTime.length > 0 
        ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
        : 0,
      activeUsers: this.metrics.activeUsers.size,
      dbQueries: this.metrics.dbQueries,
      apiCalls: this.metrics.apiCalls,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'PostgreSQL'
    };
  }
}

module.exports = new MonitoringService();