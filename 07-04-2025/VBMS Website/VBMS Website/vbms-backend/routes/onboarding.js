const express = require('express');
const router = express.Router();
const User = require('../models/User'); // PostgreSQL model
const { authenticateToken } = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const emailService = require('../services/emailService');
const jwt = require('jsonwebtoken');

// TEMPORARY STUB - Onboarding routes disabled until PostgreSQL models are created

// Get user onboarding status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Onboarding system temporarily simplified during database migration',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        onboardingComplete: true, // Simplified during migration
        database: 'PostgreSQL'
      }
    });
  } catch (error) {
    console.error('Onboarding status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving onboarding status',
      error: error.message
    });
  }
});

// Complete onboarding step
router.post('/complete-step', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Onboarding system temporarily disabled during database migration',
    data: {
      step: 'completed',
      database: 'PostgreSQL'
    }
  });
});

// Update business information
router.post('/business', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Business setup temporarily disabled during database migration',
    data: {
      database: 'PostgreSQL'
    }
  });
});

// Get business information
router.get('/business', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Business data temporarily unavailable during database migration',
    data: {
      business: null,
      database: 'PostgreSQL'
    }
  });
});

// Complete onboarding
router.post('/complete', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Onboarding marked as complete (simplified during migration)',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        onboardingComplete: true,
        database: 'PostgreSQL'
      }
    });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing onboarding',
      error: error.message
    });
  }
});

module.exports = router;