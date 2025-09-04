const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');

// TEMPORARY STUB - All notification routes disabled until PostgreSQL models are created

// Get notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Notifications system temporarily disabled during database migration',
    data: {
      notifications: [],
      unreadCount: 0,
      totalCount: 0
    }
  });
});

// Mark notification as read
router.patch('/:id/read', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Notifications system temporarily disabled'
  });
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: 'Notifications system temporarily disabled'
  });
});

module.exports = router;