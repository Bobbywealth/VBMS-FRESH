const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, requireAdminPermission } = require('../middleware/auth');
const { pgPool } = require('../config/database');
const bcrypt = require('bcryptjs');

// Admin authentication middleware
const requireAdmin = requireRole(['admin', 'main_admin']);

// Dashboard Overview
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const client = await pgPool.connect();

    // Get basic user statistics using PostgreSQL
    const totalCustomersResult = await client.query("SELECT COUNT(*) FROM users WHERE role = 'customer'");
    const totalAdminsResult = await client.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    const activeUsersResult = await client.query("SELECT COUNT(*) FROM users WHERE is_active = true");
    const totalUsersResult = await client.query("SELECT COUNT(*) FROM users");

    const totalCustomers = parseInt(totalCustomersResult.rows[0].count);
    const totalAdmins = parseInt(totalAdminsResult.rows[0].count);
    const activeUsers = parseInt(activeUsersResult.rows[0].count);
    const totalUsers = parseInt(totalUsersResult.rows[0].count);

    // Get recent customers
    const recentCustomersResult = await client.query(`
      SELECT id, first_name, last_name, email, created_at 
      FROM users 
      WHERE role = 'customer' 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    client.release();

    const stats = {
      totalCustomers,
      totalAdmins,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      totalUsers,
      recentCustomers: recentCustomersResult.rows
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
    const offset = (page - 1) * limit;

    const client = await pgPool.connect();

    let query = "SELECT id, first_name, last_name, email, role, is_active, created_at FROM users WHERE role = 'customer'";
    let countQuery = "SELECT COUNT(*) FROM users WHERE role = 'customer'";
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND is_active = $${paramIndex}`;
      countQuery += ` AND is_active = $${paramIndex}`;
      params.push(status === 'active');
      paramIndex++;
    }

    if (search) {
      query += ` AND (email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
      countQuery += ` AND (email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const queryParams = [...params, limit, offset];

    const customersResult = await client.query(query, queryParams);
    const totalResult = await client.query(countQuery, params);

    client.release();

    const total = parseInt(totalResult.rows[0].count);

    res.json({
      success: true,
      data: {
        customers: customersResult.rows,
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

    const client = await pgPool.connect();

    // Check if user already exists
    const existingUserResult = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUserResult.rows.length > 0) {
      client.release();
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin user
    const firstName = name.split(' ')[0] || name;
    const lastName = name.split(' ').slice(1).join(' ') || '';

    const newAdminResult = await client.query(`
      INSERT INTO users (first_name, last_name, email, password, role, is_active, email_verified, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, first_name, last_name, email, role, is_active, created_at
    `, [firstName, lastName, email, hashedPassword, role]);

    client.release();

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: newAdminResult.rows[0]
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

    const client = await pgPool.connect();

    const result = await client.query(`
      UPDATE users 
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, first_name, last_name, email, is_active
    `, [isActive, id]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: result.rows[0]
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
    const client = await pgPool.connect();

    // Check user role before deletion
    const userResult = await client.query('SELECT role FROM users WHERE id = $1', [id]);

    if (userResult.rows.length === 0) {
      client.release();
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Prevent deletion of main_admin users
    if (user.role === 'main_admin') {
      client.release();
      return res.status(403).json({
        success: false,
        message: 'Cannot delete main admin users'
      });
    }

    // Delete user (Hard delete for now, or we could add a deleted_at column for soft delete)
    // Assuming hard delete based on "await user.delete()" in original code which usually means remove document
    await client.query('DELETE FROM users WHERE id = $1', [id]);

    client.release();

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
    const client = await pgPool.connect();

    const totalUsersResult = await client.query("SELECT COUNT(*) FROM users");
    const activeUsersResult = await client.query("SELECT COUNT(*) FROM users WHERE is_active = true");
    const customersResult = await client.query("SELECT COUNT(*) FROM users WHERE role = 'customer'");
    const adminsResult = await client.query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
    const mainAdminsResult = await client.query("SELECT COUNT(*) FROM users WHERE role = 'main_admin'");

    client.release();

    const stats = {
      users: {
        total: parseInt(totalUsersResult.rows[0].count),
        active: parseInt(activeUsersResult.rows[0].count),
        customers: parseInt(customersResult.rows[0].count),
        admins: parseInt(adminsResult.rows[0].count),
        mainAdmins: parseInt(mainAdminsResult.rows[0].count)
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

    const client = await pgPool.connect();

    let query = "SELECT id, first_name, last_name, email, role, is_active, created_at FROM users WHERE (email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1)";
    const params = [`%${searchQuery}%`];
    let paramIndex = 2;

    if (role) {
      query += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    query += ` LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const usersResult = await client.query(query, params);
    client.release();

    res.json({
      success: true,
      data: usersResult.rows,
      count: usersResult.rows.length
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