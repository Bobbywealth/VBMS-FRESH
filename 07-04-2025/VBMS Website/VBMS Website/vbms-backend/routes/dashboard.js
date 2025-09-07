const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const Affiliate = require('../models/Affiliate');
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');

/**
 * Get dashboard overview stats (Admin only)
 */
router.get('/stats', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;

    // Get analytics stats
    const analyticsStats = await Analytics.getDashboardStats(timeframe);
    
    // Get user stats
    const userStats = await Analytics.getUserStats();
    
    // Get affiliate stats
    const affiliateStats = await Affiliate.aggregate();
    
    // Get system health
    const systemHealth = await Analytics.getSystemHealth();

    const stats = {
      analytics: {
        totalEvents: parseInt(analyticsStats.total_events) || 0,
        uniqueUsers: parseInt(analyticsStats.unique_users) || 0,
        uniqueSessions: parseInt(analyticsStats.unique_sessions) || 0,
        logins: parseInt(analyticsStats.logins) || 0,
        registrations: parseInt(analyticsStats.registrations) || 0,
        pageViews: parseInt(analyticsStats.page_views) || 0,
        apiCalls: parseInt(analyticsStats.api_calls) || 0
      },
      users: {
        totalUsers: parseInt(userStats.total_users) || 0,
        customers: parseInt(userStats.customers) || 0,
        admins: parseInt(userStats.admins) || 0,
        mainAdmins: parseInt(userStats.main_admins) || 0,
        activeUsers: parseInt(userStats.active_users) || 0,
        recentLogins: parseInt(userStats.recent_logins) || 0
      },
      affiliates: {
        totalAffiliates: parseInt(affiliateStats[0]?.total_count) || 0,
        averageCommissionRate: parseFloat(affiliateStats[0]?.avg_commission_rate) || 0,
        totalEarnings: parseFloat(affiliateStats[0]?.total_earnings) || 0,
        totalReferrals: parseInt(affiliateStats[0]?.total_referrals) || 0
      },
      system: systemHealth
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
});

/**
 * Get user activity over time (Admin only)
 */
router.get('/activity', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { timeframe = '7d', interval = 'day' } = req.query;

    const activity = await Analytics.getUserActivity(timeframe, interval);

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user activity',
      error: error.message
    });
  }
});

/**
 * Get top events (Admin only)
 */
router.get('/events', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { timeframe = '7d', limit = 10 } = req.query;

    const events = await Analytics.getTopEvents(timeframe, parseInt(limit));

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error fetching top events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching top events',
      error: error.message
    });
  }
});

/**
 * Track analytics event
 */
router.post('/track', authenticateToken, async (req, res) => {
  try {
    const { eventType, eventData = {} } = req.body;
    
    if (!eventType) {
      return res.status(400).json({
        success: false,
        message: 'Event type is required'
      });
    }

    const options = {
      userId: req.user?.id,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const event = await Analytics.track(eventType, eventData, options);

    res.json({
      success: true,
      message: 'Event tracked successfully',
      data: event
    });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking event',
      error: error.message
    });
  }
});

/**
 * Get system health (Admin only)
 */
router.get('/health', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const health = await Analytics.getSystemHealth();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system health',
      error: error.message
    });
  }
});

/**
 * Get quick dashboard overview for main page
 */
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role.toLowerCase();

    if (userRole === 'customer') {
      // Customer dashboard - limited stats
      res.json({
        success: true,
        data: {
          welcome: `Welcome back, ${req.user.first_name}!`,
          role: 'customer',
          lastLogin: req.user.last_login,
          // Add customer-specific stats here
        }
      });
    } else if (['admin', 'main_admin'].includes(userRole)) {
      // Admin dashboard - full stats
      const userStats = await Analytics.getUserStats();
      const systemHealth = await Analytics.getSystemHealth();

      res.json({
        success: true,
        data: {
          welcome: `Welcome back, ${req.user.first_name}!`,
          role: userRole,
          lastLogin: req.user.last_login,
          quickStats: {
            totalUsers: parseInt(userStats.total_users) || 0,
            activeUsers: parseInt(userStats.active_users) || 0,
            recentLogins: parseInt(userStats.recent_logins) || 0,
            systemHealthy: systemHealth.database_connected
          }
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          welcome: `Welcome, ${req.user.first_name}!`,
          role: userRole
        }
      });
    }
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard overview',
      error: error.message
    });
  }
});

module.exports = router;