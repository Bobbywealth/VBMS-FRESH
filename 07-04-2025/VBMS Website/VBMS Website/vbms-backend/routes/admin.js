const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken, requireRole, requireAdminPermission } = require('../middleware/auth');
const { query } = require('../config/database');

// Admin authentication middleware
const requireAdmin = requireRole(['admin', 'main_admin']);

// Dashboard Overview
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get basic user statistics using PostgreSQL
    const totalCustomers = await User.getCount({ role: 'customer' });
    const totalAdmins = await User.getCount({ role: 'admin' });
    const activeUsers = await User.getCount({ isActive: true });
    
    // Get recent customers
    const recentCustomers = await User.findAll({ 
      role: 'customer',
      limit: 5,
      sortBy: 'created_at',
      sortOrder: 'desc'
    });

    const stats = {
      totalCustomers,
      totalAdmins,
      activeUsers,
      inactiveUsers: (await User.getCount()) - activeUsers,
      totalUsers: await User.getCount(),
      recentCustomers: recentCustomers.map(user => user.toJSON())
    };

    res.json({
      success: true,
      data: stats,
      message: 'Admin dashboard data retrieved successfully'
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get all customers
router.get('/customers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = '' } = req.query;
    
    const filters = { role: 'customer' };
    if (status) filters.isActive = status === 'active';
    if (search) filters.search = search;

    const customers = await User.findAll(filters);
    const total = await User.getCount(filters);

    res.json({
      success: true,
      data: {
        customers: customers.map(user => user.toJSON()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve customers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Create new admin user
router.post('/create-admin', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { name, email, password, role = 'admin' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new admin user
    const newAdmin = await User.create({
      firstName: name.split(' ')[0] || name,
      lastName: name.split(' ').slice(1).join(' ') || '',
      email,
      password,
      role,
      isActive: true,
      emailVerified: true
    });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: newAdmin.toJSON()
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update user status
router.put('/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update({ isActive });

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user.toJSON()
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete user
router.delete('/users/:id', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deletion of main_admin users
    if (user.role === 'main_admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete main admin users'
      });
    }

    await user.delete(); // Soft delete

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get system statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = {
      users: {
        total: await User.getCount(),
        active: await User.getCount({ isActive: true }),
        customers: await User.getCount({ role: 'customer' }),
        admins: await User.getCount({ role: 'admin' }),
        mainAdmins: await User.getCount({ role: 'main_admin' })
      },
      system: {
        database: 'PostgreSQL',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      }
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Search users
router.get('/search/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { q: searchQuery, role, limit = 20 } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const filters = { search: searchQuery, limit: parseInt(limit) };
    if (role) filters.role = role;

    const users = await User.findAll(filters);

    res.json({
      success: true,
      data: users.map(user => user.toJSON()),
      count: users.length
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;