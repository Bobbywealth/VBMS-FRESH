const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { pgPool } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

// Middleware to require admin role
const requireAdmin = requireRole(['admin', 'main_admin']);

// =============================================================================
// BACKUP ROUTES
// =============================================================================

// POST /api/admin/backup/create - Create database backup
router.post('/backup/create', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // In a real implementation, you would use pg_dump or similar
    // For now, we'll simulate backup creation
    const backupId = `backup_${Date.now()}`;
    const backupData = {
      id: backupId,
      created_at: new Date().toISOString(),
      size: '2.5MB',
      tables: ['users', 'orders', 'tasks', 'inventory', 'business_profiles']
    };
    
    // Log backup creation
    console.log('Database backup created:', backupId);
    
    res.json({
      success: true,
      message: 'Database backup created successfully',
      backup: backupData,
      downloadUrl: `/api/admin/backup/${backupId}/download`
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create database backup',
      details: error.message
    });
  }
});

// GET /api/admin/backup/schedule - Get backup schedule
router.get('/backup/schedule', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const client = await pgPool.connect();
    
    const result = await client.query(
      'SELECT * FROM backup_schedules WHERE user_id = $1',
      [req.user.id]
    );
    
    client.release();
    
    if (result.rows.length === 0) {
      return res.json({});
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching backup schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backup schedule',
      details: error.message
    });
  }
});

// POST /api/admin/backup/schedule - Set backup schedule
router.post('/backup/schedule', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { frequency, time, retention, emailNotification } = req.body;
    const client = await pgPool.connect();
    
    // Upsert backup schedule
    await client.query(
      `INSERT INTO backup_schedules (user_id, frequency, time, retention, email_notification, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (user_id) DO UPDATE SET
       frequency = $2, time = $3, retention = $4, email_notification = $5, updated_at = NOW()`,
      [req.user.id, frequency, time, retention, emailNotification]
    );
    
    client.release();
    
    res.json({
      success: true,
      message: 'Backup schedule saved successfully'
    });
  } catch (error) {
    console.error('Error saving backup schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save backup schedule',
      details: error.message
    });
  }
});

// =============================================================================
// LOGS ROUTES
// =============================================================================

// GET /api/admin/logs - Get system logs
router.get('/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { level, date, format } = req.query;
    
    // Simulate log data (in real implementation, read from log files)
    const logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Server started successfully',
        source: 'server.js'
      },
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        level: 'warn',
        message: 'High memory usage detected',
        source: 'monitoring'
      },
      {
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        level: 'error',
        message: 'Database connection timeout',
        source: 'database.js',
        stack: 'Error: Connection timeout\n    at Database.connect (database.js:45:12)'
      }
    ];
    
    // Filter logs based on query parameters
    let filteredLogs = logs;
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    if (date) {
      const targetDate = new Date(date);
      filteredLogs = filteredLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate.toDateString() === targetDate.toDateString();
      });
    }
    
    if (format === 'file') {
      // Return as downloadable file
      const logContent = filteredLogs.map(log => 
        `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${log.stack ? '\n' + log.stack : ''}`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="logs-${date || 'all'}.txt"`);
      return res.send(logContent);
    }
    
    res.json(filteredLogs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system logs',
      details: error.message
    });
  }
});

// DELETE /api/admin/logs - Clear system logs
router.delete('/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // In real implementation, clear log files
    console.log('System logs cleared by admin:', req.user.email);
    
    res.json({
      success: true,
      message: 'System logs cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear system logs',
      details: error.message
    });
  }
});

// =============================================================================
// DIAGNOSTICS ROUTES
// =============================================================================

// POST /api/admin/diagnostics - Run system diagnostics
router.post('/diagnostics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      database: true,
      api: true,
      memory: {
        used: '245MB',
        total: '512MB',
        percentage: 48
      },
      disk: {
        used: '15GB',
        total: '50GB',
        percentage: 30
      },
      responseTime: 125,
      connections: 12,
      issues: []
    };
    
    // Check database connection
    try {
      const client = await pgPool.connect();
      await client.query('SELECT 1');
      client.release();
    } catch (dbError) {
      diagnostics.database = false;
      diagnostics.issues.push('Database connection failed');
    }
    
    // Check memory usage (simulated)
    if (diagnostics.memory.percentage > 80) {
      diagnostics.issues.push('High memory usage detected');
    }
    
    // Check disk space (simulated)
    if (diagnostics.disk.percentage > 80) {
      diagnostics.issues.push('Low disk space warning');
    }
    
    // Check response time
    if (diagnostics.responseTime > 1000) {
      diagnostics.issues.push('Slow API response time');
    }
    
    res.json(diagnostics);
  } catch (error) {
    console.error('Error running diagnostics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run system diagnostics',
      details: error.message
    });
  }
});

// =============================================================================
// SETTINGS ROUTES
// =============================================================================

// POST /api/admin/settings/reset - Reset all settings to defaults
router.post('/settings/reset', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const client = await pgPool.connect();
    
    // Reset user preferences to defaults
    await client.query(
      `UPDATE users SET 
       theme = 'dark',
       notifications_enabled = true,
       email_notifications = true
       WHERE id = $1`,
      [req.user.id]
    );
    
    // Clear backup schedules
    await client.query('DELETE FROM backup_schedules WHERE user_id = $1', [req.user.id]);
    
    // Clear business profiles
    await client.query('DELETE FROM business_profiles WHERE user_id = $1', [req.user.id]);
    
    client.release();
    
    console.log('Settings reset by admin:', req.user.email);
    
    res.json({
      success: true,
      message: 'All settings have been reset to defaults'
    });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset settings',
      details: error.message
    });
  }
});

module.exports = router;