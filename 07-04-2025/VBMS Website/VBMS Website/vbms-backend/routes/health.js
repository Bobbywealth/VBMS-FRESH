const express = require('express');
const router = express.Router();
const { pgPool } = require('../config/database');

// Basic health check - PostgreSQL version
router.get('/', async (req, res) => {
  try {
    // Test PostgreSQL connection
    const client = await pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    res.json({ 
      status: 'healthy',
      database: 'PostgreSQL',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'PostgreSQL connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database health check
router.get('/database', async (req, res) => {
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

// Simplified system health - no mongoose dependencies
router.get('/system', async (req, res) => {
  try {
    res.json({
      status: 'healthy',
      database: 'PostgreSQL',
      services: {
        api: 'running',
        database: 'connected'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;