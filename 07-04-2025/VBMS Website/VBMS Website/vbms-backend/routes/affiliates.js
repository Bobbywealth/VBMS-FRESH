/**
 * Admin-Controlled Affiliate Program Routes
 * Master admin manages all affiliate operations
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Affiliate = require('../models/Affiliate');
const User = require('../models/User');
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');

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
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter for PostgreSQL
    const filter = {};
    if (status) filter.status = status;
    if (tier) filter.tier = tier;
    if (search) filter.search = search;

    const affiliates = await Affiliate.find(filter);
    const total = await Affiliate.countDocuments(filter);

    // Simple stats calculation
    const stats = {
      totalAffiliates: total,
      activeAffiliates: affiliates.filter(a => a.status === 'active').length,
      pendingAffiliates: affiliates.filter(a => a.status === 'pending').length,
      totalEarnings: affiliates.reduce((sum, a) => sum + (parseFloat(a.totalEarnings) || 0), 0)
    };

    res.json({
      success: true,
      data: {
        affiliates: affiliates.map(affiliate => ({
          ...affiliate,
          paymentInfo: affiliate.paymentInfo ? { ...affiliate.paymentInfo, bankDetails: undefined } : {}
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
    const affiliate = await Affiliate.findById(req.params.id);
    
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate not found'
      });
    }

    res.json({
      success: true,
      data: affiliate
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

    const affiliate = await Affiliate.create({
      name,
      email,
      affiliateId,
      referralCode,
      tier,
      commissionRate,
      status: 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Affiliate created successfully',
      data: affiliate
    });

  } catch (error) {
    console.error('Error creating affiliate:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

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
    const affiliate = await Affiliate.findById(req.params.id);
    
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate not found'
      });
    }

    const { name, email, status, tier, commissionRate } = req.body;

    if (name) affiliate.name = name;
    if (email) affiliate.email = email;
    if (status) affiliate.status = status;
    if (tier) affiliate.tier = tier;
    if (commissionRate !== undefined) affiliate.commissionRate = commissionRate;

    await affiliate.save();

    res.json({
      success: true,
      message: 'Affiliate updated successfully',
      data: affiliate
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
    const affiliate = await Affiliate.findById(req.params.id);
    
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate not found'
      });
    }

    await affiliate.remove();

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
    const affiliates = await Affiliate.find({});
    
    const stats = {
      totalAffiliates: affiliates.length,
      activeAffiliates: affiliates.filter(a => a.status === 'active').length,
      pendingAffiliates: affiliates.filter(a => a.status === 'pending').length,
      suspendedAffiliates: affiliates.filter(a => a.status === 'suspended').length,
      totalEarnings: affiliates.reduce((sum, a) => sum + (parseFloat(a.totalEarnings) || 0), 0),
      totalReferrals: affiliates.reduce((sum, a) => sum + (parseInt(a.totalReferrals) || 0), 0),
      averageCommissionRate: affiliates.length > 0 ? 
        affiliates.reduce((sum, a) => sum + (parseFloat(a.commissionRate) || 0), 0) / affiliates.length : 0
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