const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Affiliate = require('../models/Affiliate');
const Settings = require('../models/Settings');
const Analytics = require('../models/Analytics');
const { authenticateToken, requireAdminPermission, requireMasterAdminPermission } = require('../middleware/auth');

/**
 * Get all users (Admin only)
 */
router.get('/users', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    // For now, return a simple response since we need to implement user listing in User model
    res.json({
      success: true,
      message: 'User management endpoint - PostgreSQL implementation needed',
      data: {
        users: [],
        total: 0,
        note: 'This endpoint needs to be implemented with User.findAll() method'
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

/**
 * Get user by ID (Admin only)
 */
router.get('/users/:id', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Remove password hash from response
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
});

/**
 * Update user (Admin only)
 */
router.put('/users/:id', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { first_name, last_name, email, role, status } = req.body;
    
    const updates = {};
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status;

    // This would need to be implemented in User model
    res.json({
      success: true,
      message: 'User update endpoint - PostgreSQL implementation needed',
      data: {
        id: req.params.id,
        updates,
        note: 'This endpoint needs User.update() method'
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
});

/**
 * Delete user (Master Admin only)
 */
router.delete('/users/:id', authenticateToken, requireMasterAdminPermission, async (req, res) => {
  try {
    // Prevent deleting self
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    res.json({
      success: true,
      message: 'User delete endpoint - PostgreSQL implementation needed',
      data: {
        id: req.params.id,
        note: 'This endpoint needs User.delete() method'
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
});

/**
 * Get system overview (Admin only)
 */
router.get('/overview', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    // Get basic stats
    const userStats = await Analytics.getUserStats();
    const affiliateStats = await Affiliate.aggregate();
    const systemHealth = await Analytics.getSystemHealth();

    res.json({
      success: true,
      data: {
        users: {
          total: parseInt(userStats.total_users) || 0,
          active: parseInt(userStats.active_users) || 0,
          customers: parseInt(userStats.customers) || 0,
          admins: parseInt(userStats.admins) || 0
        },
        affiliates: {
          total: parseInt(affiliateStats[0]?.total_count) || 0,
          totalEarnings: parseFloat(affiliateStats[0]?.total_earnings) || 0
        },
        system: {
          healthy: systemHealth.database_connected,
          eventsLastHour: parseInt(systemHealth.events_last_hour) || 0,
          activeUsersLastHour: parseInt(systemHealth.active_users_last_hour) || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin overview:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin overview',
      error: error.message
    });
  }
});

/**
 * Get admin activities log (Admin only)
 */
router.get('/activities', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    // This would show recent admin activities from analytics
    res.json({
      success: true,
      message: 'Admin activities endpoint - PostgreSQL implementation needed',
      data: {
        activities: [],
        note: 'This endpoint needs Analytics.getAdminActivities() method'
      }
    });
  } catch (error) {
    console.error('Error fetching admin activities:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin activities',
      error: error.message
    });
  }
});

/**
 * Bulk user actions (Master Admin only)
 */
router.post('/users/bulk', authenticateToken, requireMasterAdminPermission, async (req, res) => {
  try {
    const { action, userIds } = req.body;

    if (!action || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        message: 'Action and userIds array are required'
      });
    }

    res.json({
      success: true,
      message: 'Bulk user actions endpoint - PostgreSQL implementation needed',
      data: {
        action,
        userIds,
        note: 'This endpoint needs bulk user operations implementation'
      }
    });
  } catch (error) {
    console.error('Error performing bulk user actions:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing bulk user actions',
      error: error.message
    });
  }
});

/**
 * Export data (Master Admin only)
 */
router.get('/export/:type', authenticateToken, requireMasterAdminPermission, async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['users', 'affiliates', 'analytics', 'settings'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid export type. Valid types: ${validTypes.join(', ')}`
      });
    }

    res.json({
      success: true,
      message: `Export ${type} endpoint - PostgreSQL implementation needed`,
      data: {
        type,
        note: `This endpoint needs ${type} export implementation`
      }
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting data',
      error: error.message
    });
  }
});

module.exports = router;