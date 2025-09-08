const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');

/**
 * Get user's notifications
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      read,
      type,
      unread_only,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {
      user_id: req.user.id
    };

    if (read !== undefined) filter.read = read === 'true';
    if (type) filter.type = type;
    if (unread_only === 'true') filter.unread_only = true;

    const options = {
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const notifications = await Notification.find(filter, options);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: notifications.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
});

/**
 * Get notification by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Users can only see their own notifications
    if (notification.user_id !== req.user.id && req.user.role !== 'main_admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification',
      error: error.message
    });
  }
});

/**
 * Create notification (Admin only)
 */
router.post('/', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const {
      title,
      message,
      type = 'info',
      user_id,
      user_ids,
      action_url,
      metadata = {}
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Handle single user notification
    if (user_id) {
      const notification = await Notification.create({
        title,
        message,
        type,
        user_id: parseInt(user_id),
        action_url,
        metadata
      });

      return res.status(201).json({
        success: true,
        message: 'Notification created successfully',
        data: notification
      });
    }

    // Handle bulk notifications
    if (user_ids && Array.isArray(user_ids)) {
      const notifications = await Notification.createBulk({
        title,
        message,
        type,
        action_url,
        metadata
      }, user_ids.map(id => parseInt(id)));

      return res.status(201).json({
        success: true,
        message: `${notifications.length} notifications created successfully`,
        data: notifications
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Either user_id or user_ids array is required'
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating notification',
      error: error.message
    });
  }
});

/**
 * Mark notification as read
 */
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.markAsRead(req.params.id, req.user.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message
    });
  }
});

/**
 * Mark all notifications as read for current user
 */
router.patch('/read/all', authenticateToken, async (req, res) => {
  try {
    const updatedCount = await Notification.markAllAsRead(req.user.id);

    res.json({
      success: true,
      message: `${updatedCount} notifications marked as read`,
      data: { updated_count: updatedCount }
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read',
      error: error.message
    });
  }
});

/**
 * Delete notification
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await Notification.delete(req.params.id, req.user.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message
    });
  }
});

/**
 * Get notification statistics
 */
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    // Users get their own stats, admins can get all stats
    const userId = (req.user.role === 'main_admin' || req.user.role === 'admin') && req.query.all === 'true' ? null : req.user.id;
    const stats = await Notification.getStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification statistics',
      error: error.message
    });
  }
});

/**
 * Send system notification to all users (Master Admin only)
 */
router.post('/system/broadcast', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { title, message, type = 'info', action_url } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    const notifications = await Notification.sendSystemNotification(title, message, type, action_url);

    res.status(201).json({
      success: true,
      message: `System notification sent to ${notifications.length} users`,
      data: { sent_count: notifications.length }
    });
  } catch (error) {
    console.error('Error sending system notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending system notification',
      error: error.message
    });
  }
});

/**
 * Get unread notification count for current user
 */
router.get('/unread/count', authenticateToken, async (req, res) => {
  try {
    const stats = await Notification.getStats(req.user.id);

    res.json({
      success: true,
      data: {
        unread_count: stats.unread_notifications
      }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread notification count',
      error: error.message
    });
  }
});

module.exports = router;