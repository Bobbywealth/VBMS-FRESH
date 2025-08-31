const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');
const mongoose = require('mongoose');

// Get notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      type, 
      priority,
      includeExpired = false 
    } = req.query;
    
    const userId = req.user.id;
    
    const notifications = await Notification.findForUser(userId, {
      status,
      type,
      priority,
      limit: parseInt(limit),
      page: parseInt(page),
      includeExpired: includeExpired === 'true'
    });
    
    const totalQuery = {
      'recipient.userId': mongoose.Types.ObjectId(userId)
    };
    
    if (status) totalQuery.status = status;
    if (type) totalQuery.type = type;
    if (priority) totalQuery.priority = priority;
    
    if (includeExpired !== 'true') {
      totalQuery.$or = [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ];
    }
    
    const total = await Notification.countDocuments(totalQuery);
    const unreadCount = await Notification.getUnreadCount(userId);
    
    res.json({
      success: true,
      notifications: notifications.map(n => n.toClientFormat()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch notifications', 
      error: error.message 
    });
  }
});

// Get unread notifications
router.get('/unread', authenticateToken, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const userId = req.user.id;
    
    const notifications = await Notification.findUnreadForUser(userId, parseInt(limit));
    const unreadCount = await Notification.getUnreadCount(userId);
    
    res.json({
      success: true,
      notifications: notifications.map(n => n.toClientFormat()),
      count: unreadCount
    });
    
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch unread notifications', 
      error: error.message 
    });
  }
});

// Get notification count
router.get('/count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = await Notification.getUnreadCount(userId);
    
    res.json({
      success: true,
      unreadCount
    });
    
  } catch (error) {
    console.error('Error fetching notification count:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch notification count', 
      error: error.message 
    });
  }
});

// Get single notification
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notification = await Notification.findOne({
      _id: req.params.id,
      'recipient.userId': userId
    }).populate('sender.userId', 'name email role');
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    res.json({
      success: true,
      notification: notification.toClientFormat()
    });
    
  } catch (error) {
    console.error('Error fetching notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch notification', 
      error: error.message 
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notification = await Notification.findOne({
      _id: req.params.id,
      'recipient.userId': userId
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    await notification.markAsRead();
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark notification as read', 
      error: error.message 
    });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    await Notification.updateMany(
      {
        'recipient.userId': userId,
        status: 'unread'
      },
      {
        status: 'read',
        readAt: new Date()
      }
    );
    
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
    
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark all notifications as read', 
      error: error.message 
    });
  }
});

// Archive notification
router.put('/:id/archive', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notification = await Notification.findOne({
      _id: req.params.id,
      'recipient.userId': userId
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    await notification.archive();
    
    res.json({
      success: true,
      message: 'Notification archived'
    });
    
  } catch (error) {
    console.error('Error archiving notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to archive notification', 
      error: error.message 
    });
  }
});

// Dismiss notification
router.put('/:id/dismiss', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notification = await Notification.findOne({
      _id: req.params.id,
      'recipient.userId': userId
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    await notification.dismiss();
    
    res.json({
      success: true,
      message: 'Notification dismissed'
    });
    
  } catch (error) {
    console.error('Error dismissing notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to dismiss notification', 
      error: error.message 
    });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      'recipient.userId': userId
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    res.json({
      success: true,
      message: 'Notification deleted'
    });
    
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete notification', 
      error: error.message 
    });
  }
});

// Create notification (admin or system)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      recipientUserId,
      recipientRole,
      priority = 'normal',
      category = 'business',
      action,
      content,
      sound,
      display,
      scheduledFor,
      expiresAt,
      tags,
      metadata
    } = req.body;
    
    if (!title || !message || !type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, message, and type are required' 
      });
    }
    
    // Determine recipient
    let recipient;
    if (recipientUserId) {
      const recipientUser = await User.findById(recipientUserId);
      if (!recipientUser) {
        return res.status(404).json({ success: false, message: 'Recipient user not found' });
      }
      recipient = {
        userId: recipientUser._id,
        role: recipientUser.role
      };
    } else if (recipientRole) {
      recipient = {
        role: recipientRole
      };
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Recipient user ID or role is required' 
      });
    }
    
    const notificationData = {
      title,
      message,
      type,
      recipient,
      priority,
      category,
      sender: {
        userId: req.user.id,
        name: req.user.name,
        role: req.user.role,
        isSystem: false
      }
    };
    
    if (action) notificationData.action = action;
    if (content) notificationData.content = content;
    if (sound) notificationData.sound = { ...notificationData.sound, ...sound };
    if (display) notificationData.display = { ...notificationData.display, ...display };
    if (scheduledFor) notificationData.scheduledFor = new Date(scheduledFor);
    if (expiresAt) notificationData.expiresAt = new Date(expiresAt);
    if (tags) notificationData.tags = tags;
    if (metadata) notificationData.metadata = metadata;
    
    const notification = new Notification(notificationData);
    await notification.save();
    
    await notification.populate('sender.userId recipient.userId');
    
    res.json({
      success: true,
      message: 'Notification created successfully',
      notification: notification.toClientFormat()
    });
    
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create notification', 
      error: error.message 
    });
  }
});

// Create bulk notification (admin only)
router.post('/bulk', authenticateToken, requireAdminPermission('notification_management'), async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      userIds,
      userRole,
      priority = 'normal',
      category = 'business',
      action,
      content,
      sound,
      display,
      scheduledFor,
      expiresAt,
      tags,
      metadata
    } = req.body;
    
    if (!title || !message || !type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, message, and type are required' 
      });
    }
    
    let targetUserIds = [];
    
    if (userIds && Array.isArray(userIds)) {
      targetUserIds = userIds;
    } else if (userRole) {
      // Find all users with the specified role
      const users = await User.find({ role: userRole }).select('_id');
      targetUserIds = users.map(user => user._id);
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'User IDs array or user role is required' 
      });
    }
    
    if (targetUserIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No target users found' 
      });
    }
    
    const notificationData = {
      title,
      message,
      type,
      priority,
      category,
      sender: {
        userId: req.user.id,
        name: req.user.name,
        role: req.user.role,
        isSystem: false
      }
    };
    
    if (action) notificationData.action = action;
    if (content) notificationData.content = content;
    if (sound) notificationData.sound = sound;
    if (display) notificationData.display = display;
    if (scheduledFor) notificationData.scheduledFor = new Date(scheduledFor);
    if (expiresAt) notificationData.expiresAt = new Date(expiresAt);
    if (tags) notificationData.tags = tags;
    if (metadata) notificationData.metadata = metadata;
    
    const notifications = await Notification.createBulkNotification(targetUserIds, notificationData);
    
    res.json({
      success: true,
      message: `Bulk notification sent to ${notifications.length} users`,
      count: notifications.length
    });
    
  } catch (error) {
    console.error('Error creating bulk notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create bulk notification', 
      error: error.message 
    });
  }
});

// Get notification statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user.id;
    
    const stats = await Notification.getStats(userId, parseInt(days));
    const unreadCount = await Notification.getUnreadCount(userId);
    
    res.json({
      success: true,
      stats: stats[0] || {
        total: 0,
        unread: 0,
        byType: []
      },
      unreadCount
    });
    
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch notification statistics', 
      error: error.message 
    });
  }
});

// Admin routes

// Get all system notifications (admin only)
router.get('/admin/all', authenticateToken, requireAdminPermission('notification_management'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      type, 
      priority, 
      status,
      days = 30,
      userId 
    } = req.query;
    
    const query = {};
    
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (status) query.status = status;
    if (userId) query['recipient.userId'] = mongoose.Types.ObjectId(userId);
    
    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      query.createdAt = { $gte: startDate };
    }
    
    const notifications = await Notification.find(query)
      .populate('sender.userId', 'name email role')
      .populate('recipient.userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Notification.countDocuments(query);
    
    res.json({
      success: true,
      notifications: notifications.map(n => n.toClientFormat()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch notifications', 
      error: error.message 
    });
  }
});

// Get system notification analytics (admin only)
router.get('/admin/analytics', authenticateToken, requireAdminPermission('notification_management'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const analytics = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          unreadNotifications: {
            $sum: { $cond: [{ $eq: ['$status', 'unread'] }, 1, 0] }
          },
          readNotifications: {
            $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] }
          },
          urgentNotifications: {
            $sum: { $cond: [{ $in: ['$priority', ['urgent', 'critical']] }, 1, 0] }
          },
          byType: { $push: '$type' },
          byPriority: { $push: '$priority' }
        }
      }
    ]);
    
    const typeBreakdown = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ['$status', 'unread'] }, 1, 0] }
          }
        }
      }
    ]);
    
    const priorityBreakdown = await Notification.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      analytics: analytics[0] || {
        totalNotifications: 0,
        unreadNotifications: 0,
        readNotifications: 0,
        urgentNotifications: 0
      },
      typeBreakdown,
      priorityBreakdown
    });
    
  } catch (error) {
    console.error('Error fetching notification analytics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch notification analytics', 
      error: error.message 
    });
  }
});

// System maintenance routes

// Clean up expired notifications
router.post('/admin/cleanup', authenticateToken, requireAdminPermission('notification_management'), async (req, res) => {
  try {
    const result = await Notification.cleanupExpired();
    
    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} expired notifications`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cleanup notifications', 
      error: error.message 
    });
  }
});

module.exports = router;