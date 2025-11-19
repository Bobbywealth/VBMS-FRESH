/**
 * Admin-Controlled Affiliate Program Routes
 * Master admin manages all affiliate operations
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');
const { pgPool } = require('../config/database');

/**
 * Get all affiliates with filtering and pagination (Admin only)
 */
router.get('/', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      tier,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    const client = await pgPool.connect();

    // Build query
    let query = 'SELECT * FROM affiliates WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) FROM affiliates WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      countQuery += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (tier) {
      query += ` AND tier = $${paramIndex}`;
      countQuery += ` AND tier = $${paramIndex}`;
      params.push(tier);
      paramIndex++;
    }

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR referral_code ILIKE $${paramIndex})`;
      countQuery += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR referral_code ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Add sorting and pagination
    // Validate sortBy to prevent SQL injection
    const validSortColumns = ['created_at', 'total_earnings', 'name', 'email', 'status'];
    const sortCol = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDir = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortCol} ${sortDir} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const queryParams = [...params, limit, offset];

    const result = await client.query(query, queryParams);
    const countResult = await client.query(countQuery, params);

    // Get stats for header
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(total_earnings) as earnings
      FROM affiliates
    `);

    client.release();

    const total = parseInt(countResult.rows[0].count);
    const statsData = statsResult.rows[0];

    const stats = {
      totalAffiliates: parseInt(statsData.total),
      activeAffiliates: parseInt(statsData.active),
      pendingAffiliates: parseInt(statsData.pending),
      totalEarnings: parseFloat(statsData.earnings || 0)
    };

    res.json({
      success: true,
      data: {
        affiliates: result.rows.map(affiliate => ({
          ...affiliate,
          paymentInfo: affiliate.payment_info ? { ...affiliate.payment_info, bankDetails: undefined } : {}
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching affiliates:', error);
    // Handle missing table error gracefully
    if (error.code === '42P01') {
      return res.json({
        success: true,
        data: {
          affiliates: [],
          pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 50 },
          stats: { totalAffiliates: 0, activeAffiliates: 0, pendingAffiliates: 0, totalEarnings: 0 }
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch affiliates',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Get affiliate by ID (Admin only)
 */
router.get('/:id', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const client = await pgPool.connect();
    const result = await client.query('SELECT * FROM affiliates WHERE id = $1', [req.params.id]);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching affiliate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch affiliate',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Create new affiliate (Admin only)
 */
router.post('/', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { name, email, tier = 'bronze', commissionRate = 0.1 } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Generate unique affiliate ID and referral code
    const affiliateId = 'AFF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const referralCode = crypto.randomBytes(8).toString('hex').toUpperCase();

    const client = await pgPool.connect();

    // Check if email exists
    const checkResult = await client.query('SELECT id FROM affiliates WHERE email = $1', [email]);
    if (checkResult.rows.length > 0) {
      client.release();
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const result = await client.query(`
      INSERT INTO affiliates (
        name, email, affiliate_id, referral_code, tier, commission_rate, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [name, email, affiliateId, referralCode, tier, commissionRate]);

    client.release();

    res.status(201).json({
      success: true,
      message: 'Affiliate created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating affiliate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create affiliate',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Update affiliate (Admin only)
 */
router.put('/:id', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { name, email, status, tier, commissionRate } = req.body;
    const client = await pgPool.connect();

    const result = await client.query(`
      UPDATE affiliates 
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          status = COALESCE($3, status),
          tier = COALESCE($4, tier),
          commission_rate = COALESCE($5, commission_rate),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [name, email, status, tier, commissionRate, req.params.id]);

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate not found'
      });
    }

    res.json({
      success: true,
      message: 'Affiliate updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating affiliate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update affiliate',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Delete affiliate (Admin only)
 */
router.delete('/:id', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const client = await pgPool.connect();
    const result = await client.query('DELETE FROM affiliates WHERE id = $1 RETURNING id', [req.params.id]);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate not found'
      });
    }

    res.json({
      success: true,
      message: 'Affiliate deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting affiliate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete affiliate',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Get affiliate statistics (Admin only)
 */
router.get('/stats/overview', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const client = await pgPool.connect();

    const statsResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended,
        SUM(total_earnings) as earnings,
        SUM(total_referrals) as referrals,
        AVG(commission_rate) as avg_commission
      FROM affiliates
    `);

    client.release();

    const statsData = statsResult.rows[0];

    const stats = {
      totalAffiliates: parseInt(statsData.total),
      activeAffiliates: parseInt(statsData.active),
      pendingAffiliates: parseInt(statsData.pending),
      suspendedAffiliates: parseInt(statsData.suspended),
      totalEarnings: parseFloat(statsData.earnings || 0),
      totalReferrals: parseInt(statsData.referrals || 0),
      averageCommissionRate: parseFloat(statsData.avg_commission || 0)
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching affiliate stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch affiliate statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;