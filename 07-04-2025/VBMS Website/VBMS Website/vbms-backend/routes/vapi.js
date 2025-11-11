const express = require('express');
const router = express.Router();
const vapiService = require('../services/vapiService');
const { authenticateToken } = require('../middleware/auth');
const { Pool } = require('pg');

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test VAPI connection
router.get('/test', authenticateToken, async (req, res) => {
  try {
    const result = await vapiService.testConnection();
    res.json({
      success: true,
      message: 'VAPI connection successful',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'VAPI connection failed',
      details: error.message
    });
  }
});

// Start a new VAPI call
router.post('/calls/start', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber, customerId, callType } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Start VAPI call
    const vapiCall = await vapiService.startCall({
      phoneNumber,
      customerId,
      callType: callType || 'outbound'
    });

    // Save to PostgreSQL database
    const client = await pool.connect();
    const result = await client.query(`
      INSERT INTO vapi_calls (vapi_call_id, customer_id, phone_number, call_type, status, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `, [vapiCall.id, customerId, phoneNumber, callType || 'outbound', vapiCall.status || 'started']);
    
    client.release();

    res.json({
      success: true,
      message: 'Call started successfully',
      call: result.rows[0],
      vapiData: vapiCall
    });
  } catch (error) {
    console.error('Error starting VAPI call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start call',
      details: error.message
    });
  }
});

// Get call details
router.get('/calls/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || id.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Valid call ID is required'
      });
    }

    // Get from PostgreSQL database
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM vapi_calls WHERE vapi_call_id = $1', [id]);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    const call = result.rows[0];
    
    // Get live status from VAPI if needed
    if (call.status !== 'completed' && call.status !== 'failed') {
      try {
        const vapiCall = await vapiService.getCall(id);
        
        // Update status in database
        const client = await pool.connect();
        await client.query(
          'UPDATE vapi_calls SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE vapi_call_id = $2',
          [vapiCall.status, id]
        );
        client.release();
        
        call.status = vapiCall.status;
      } catch (vapiError) {
        console.warn('Failed to get live VAPI status:', vapiError.message);
      }
    }

    res.json({
      success: true,
      call: call
    });
  } catch (error) {
    console.error('Error fetching call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call details',
      details: error.message
    });
  }
});

// End a call
router.post('/calls/:id/end', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // End call via VAPI
    await vapiService.endCall(id);
    
    // Update in PostgreSQL database
    const client = await pool.connect();
    const result = await client.query(`
      UPDATE vapi_calls 
      SET status = 'ended', updated_at = CURRENT_TIMESTAMP 
      WHERE vapi_call_id = $1 
      RETURNING *
    `, [id]);
    
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Call not found'
      });
    }

    res.json({
      success: true,
      message: 'Call ended successfully',
      call: result.rows[0]
    });
  } catch (error) {
    console.error('Error ending call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end call',
      details: error.message
    });
  }
});

// Get all calls for user
router.get('/calls', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM vapi_calls ORDER BY created_at DESC';
    let params = [];
    
    if (status) {
      query = 'SELECT * FROM vapi_calls WHERE status = $1 ORDER BY created_at DESC';
      params = [status];
    }
    
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await client.query(query, params);
    client.release();
    
    res.json({
      success: true,
      calls: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('Error fetching calls:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calls',
      details: error.message
    });
  }
});

module.exports = router;