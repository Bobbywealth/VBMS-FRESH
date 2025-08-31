const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Business = require('../models/Business');
const Subscription = require('../models/Subscription');
const Order = require('../models/Order');
const Analytics = require('../models/Analytics');
const Call = require('../models/Call');
const { authenticateToken, requireRole, requireAdminPermission } = require('../middleware/auth');

// Admin authentication middleware
const requireAdmin = requireRole(['admin', 'main_admin']);

// Dashboard Overview
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = {
      totalCustomers: await User.countDocuments({ role: 'customer' }),
      activeSubscriptions: await Subscription.countDocuments({ status: 'active' }),
      totalRevenue: await Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: '$price.monthly' } } }
      ]),
      newSignupsToday: await User.countDocuments({
        role: 'customer',
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
      }),
      // Recent activity
      recentCustomers: await User.find({ role: 'customer' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name email createdAt status'),
      // Subscription breakdown
      subscriptionBreakdown: await Subscription.aggregate([
        { $group: { _id: '$packageType', count: { $sum: 1 } } }
      ]),
      // Monthly revenue trend (last 6 months)
      monthlyRevenue: await getMonthlyRevenue()
    };

    res.json(stats);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Customer Management
router.get('/customers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, packageType } = req.query;
    
    let query = { role: 'customer' };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }

    const customers = await User.find(query)
      .populate('business', 'businessName businessType industry')
      .populate('subscription', 'packageType packageName status price')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password');

    const total = await User.countDocuments(query);

    res.json({
      customers,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalCustomers: total
    });
  } catch (error) {
    console.error('Customers fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get specific customer details
router.get('/customers/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const customer = await User.findById(req.params.id)
      .populate('business')
      .populate('subscription')
      .select('-password');

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get customer's recent activity
    const recentOrders = await Order.find({ customerId: customer._id })
      .sort({ createdAt: -1 })
      .limit(10);

    const recentCalls = await Call.find({ customerId: customer._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      customer,
      recentOrders,
      recentCalls,
      totalOrders: await Order.countDocuments({ customerId: customer._id }),
      totalCalls: await Call.countDocuments({ customerId: customer._id })
    });
  } catch (error) {
    console.error('Customer details error:', error);
    res.status(500).json({ error: 'Failed to fetch customer details' });
  }
});

// Update customer status
router.put('/customers/:id/status', authenticateToken, requireAdminPermission('canManageCustomers'), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const customer = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password');

    res.json({ customer, message: `Customer status updated to ${status}` });
  } catch (error) {
    console.error('Customer status update error:', error);
    res.status(500).json({ error: 'Failed to update customer status' });
  }
});

// Orders Management
router.get('/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find(query)
      .populate('customerId', 'name email')
      .populate('businessId', 'businessName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalOrders: total
    });
  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Analytics Data
router.get('/analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const analytics = await Analytics.find({
      date: { 
        $gte: new Date(Date.now() - getPeriodInMs(period)) 
      }
    }).sort({ date: -1 });

    // Calculate key metrics
    const metrics = {
      totalRevenue: analytics.reduce((sum, a) => sum + (a.revenue || 0), 0),
      totalOrders: analytics.reduce((sum, a) => sum + (a.orderCount || 0), 0),
      averageOrderValue: 0,
      customerGrowth: analytics.length > 0 ? analytics[0].customerCount - analytics[analytics.length - 1].customerCount : 0
    };

    if (metrics.totalOrders > 0) {
      metrics.averageOrderValue = metrics.totalRevenue / metrics.totalOrders;
    }

    res.json({
      analytics,
      metrics,
      period
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// AI Phone System Management
router.get('/ai-phone/calls', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, customerId } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (customerId) query.customerId = customerId;

    const calls = await Call.find(query)
      .populate('customerId', 'name email')
      .populate('businessId', 'businessName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Call.countDocuments(query);

    res.json({
      calls,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalCalls: total
    });
  } catch (error) {
    console.error('Calls fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

// Lead Management (from AI phone system)
router.get('/leads', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const leads = await Call.find({ 
      leadGenerated: true,
      status: { $in: ['completed', 'follow_up_needed'] }
    })
    .populate('customerId', 'name email')
    .populate('businessId', 'businessName')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({ leads });
  } catch (error) {
    console.error('Leads fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Legacy create user endpoint
router.post('/create-user', authenticateToken, requireAdminPermission('canCreateAdmins'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered.' });

    const newUser = new User({ name, email, password, role });
    await newUser.save();

    res.status(201).json({ message: 'User created', user: { name, email, role } });
  } catch (err) {
    res.status(500).json({ message: 'User creation failed', error: err.message });
  }
});

// System Settings (Main Admin only)
router.get('/settings', authenticateToken, requireRole('main_admin'), async (req, res) => {
  try {
    // Get system-wide settings
    res.json({
      userStats: {
        totalUsers: await User.countDocuments(),
        adminUsers: await User.countDocuments({ role: { $in: ['admin', 'main_admin'] } }),
        customerUsers: await User.countDocuments({ role: 'customer' })
      },
      systemHealth: {
        databaseConnected: true,
        stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
        emailConfigured: !!process.env.SMTP_USER
      }
    });
  } catch (error) {
    console.error('Settings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Helper functions
async function getMonthlyRevenue() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  return await Subscription.aggregate([
    {
      $match: {
        createdAt: { $gte: sixMonthsAgo },
        status: 'active'
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        revenue: { $sum: '$price.monthly' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
}

function getPeriodInMs(period) {
  const periods = {
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000
  };
  return periods[period] || periods['30d'];
}

module.exports = router;
