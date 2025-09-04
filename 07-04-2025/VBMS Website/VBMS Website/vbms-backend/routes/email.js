const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');

// TEMPORARY STUB - All email routes disabled until PostgreSQL models are created

// Get inbox emails
router.get('/inbox', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Email system temporarily disabled during database migration',
    data: {
      emails: [],
      totalCount: 0,
      unreadCount: 0
    }
  });
});

// Send email
router.post('/send', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Email system temporarily disabled during database migration'
  });
});

// Get email by ID
router.get('/:id', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Email system temporarily disabled during database migration',
    data: null
  });
});

module.exports = router;