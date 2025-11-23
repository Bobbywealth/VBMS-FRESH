const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pgPool } = require('../config/database');

// GET /api/business/profile - Get business profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const client = await pgPool.connect();
    
    const result = await client.query(
      'SELECT * FROM business_profiles WHERE user_id = $1',
      [req.user.id]
    );
    
    client.release();
    
    if (result.rows.length === 0) {
      // Return default profile if none exists
      return res.json({
        name: '',
        industry: '',
        phone: '',
        email: '',
        address: ''
      });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching business profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch business profile',
      details: error.message
    });
  }
});

// PUT /api/business/profile - Update business profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, industry, phone, email, address } = req.body;
    const client = await pgPool.connect();
    
    // Check if profile exists
    const existingResult = await client.query(
      'SELECT id FROM business_profiles WHERE user_id = $1',
      [req.user.id]
    );
    
    if (existingResult.rows.length === 0) {
      // Create new profile
      await client.query(
        `INSERT INTO business_profiles (user_id, name, industry, phone, email, address, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [req.user.id, name, industry, phone, email, address]
      );
    } else {
      // Update existing profile
      await client.query(
        `UPDATE business_profiles 
         SET name = $2, industry = $3, phone = $4, email = $5, address = $6, updated_at = NOW()
         WHERE user_id = $1`,
        [req.user.id, name, industry, phone, email, address]
      );
    }
    
    client.release();
    
    res.json({
      success: true,
      message: 'Business profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating business profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update business profile',
      details: error.message
    });
  }
});

module.exports = router;
