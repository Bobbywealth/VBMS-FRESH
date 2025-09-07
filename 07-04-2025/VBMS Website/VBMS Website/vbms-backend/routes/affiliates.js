const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Affiliate = require('../models/Affiliate');
const User = require('../models/User');
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');

/**
 * Get all affiliates (Admin only) - Simplified PostgreSQL version
 */
router.get('/', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const affiliates = await Affiliate.find();
    const total = await Affiliate.countDocuments();

    res.json({
      success: true,
      data: {
        affiliates,
        pagination: {
          total,
          page: 1,
          limit: affiliates.length,
          totalPages: 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching affiliates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching affiliates',
      error: error.message
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
      message: 'Error fetching affiliate',
      error: error.message
    });
  }
});

/**
 * Create new affiliate (Admin only)
 */
router.post('/', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Check if email already exists
    const existingAffiliate = await Affiliate.find();
    const emailExists = existingAffiliate.some(a => a.email.toLowerCase() === email.toLowerCase());
    
    if (emailExists) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Generate unique IDs
    const affiliateId = `AFF-${Date.now()}`;
    const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const newAffiliate = await Affiliate.create({
      name,
      email: email.toLowerCase(),
      affiliateId,
      referralCode,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Affiliate created successfully',
      data: newAffiliate
    });
  } catch (error) {
    console.error('Error creating affiliate:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating affiliate',
      error: error.message
    });
  }
});

/**
 * Update affiliate (Admin only)
 */
router.put('/:id', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { name, email, status, tier, commission_rate } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (status) updateData.status = status;
    if (tier) updateData.tier = tier;
    if (commission_rate) updateData.commission_rate = commission_rate;

    const affiliate = await Affiliate.update(req.params.id, updateData);
    
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate not found'
      });
    }

    res.json({
      success: true,
      message: 'Affiliate updated successfully',
      data: affiliate
    });
  } catch (error) {
    console.error('Error updating affiliate:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating affiliate',
      error: error.message
    });
  }
});

/**
 * Delete affiliate (Admin only)
 */
router.delete('/:id', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const deleted = await Affiliate.delete(req.params.id);
    
    if (!deleted) {
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
      message: 'Error deleting affiliate',
      error: error.message
    });
  }
});

/**
 * Get affiliate statistics (Admin only)
 */
router.get('/stats/overview', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const stats = await Affiliate.aggregate();
    
    res.json({
      success: true,
      data: {
        totalAffiliates: stats[0]?.total_count || 0,
        averageCommissionRate: stats[0]?.avg_commission_rate || 0,
        totalEarnings: stats[0]?.total_earnings || 0,
        totalReferrals: stats[0]?.total_referrals || 0
      }
    });
  } catch (error) {
    console.error('Error fetching affiliate stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching affiliate statistics',
      error: error.message
    });
  }
});

module.exports = router;