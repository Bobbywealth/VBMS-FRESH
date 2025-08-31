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

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (tier) filter.tier = tier;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { referralCode: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const affiliates = await Affiliate.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-paymentInfo.bankDetails'); // Don't send sensitive bank details

    const total = await Affiliate.countDocuments(filter);

    // Calculate summary stats
    const stats = await Affiliate.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalAffiliates: { $sum: 1 },
          activeAffiliates: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          totalCommissionEarned: { $sum: '$stats.totalCommissionEarned' },
          totalCommissionPaid: { $sum: '$stats.totalCommissionPaid' },
          pendingCommissions: { $sum: '$stats.pendingCommission' },
          totalReferrals: { $sum: '$stats.totalReferrals' },
          successfulReferrals: { $sum: '$stats.successfulReferrals' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        affiliates,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        stats: stats[0] || {
          totalAffiliates: 0,
          activeAffiliates: 0,
          totalCommissionEarned: 0,
          totalCommissionPaid: 0,
          pendingCommissions: 0,
          totalReferrals: 0,
          successfulReferrals: 0
        }
      }
    });

  } catch (error) {
    console.error('Get affiliates error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching affiliates',
      error: error.message
    });
  }
});

/**
 * Get single affiliate details (Admin only)
 */
router.get('/:id', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const affiliate = await Affiliate.findById(req.params.id)
      .populate('referrals.customerId', 'name email')
      .populate('commissions.customerId', 'name email')
      .populate('commissions.approvedBy', 'name email');

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
    console.error('Get affiliate error:', error);
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
    const {
      name,
      email,
      tier = 'bronze',
      commissionRate = 0.15,
      customCommissionRates,
      contactInfo,
      paymentInfo,
      adminNotes,
      tags
    } = req.body;

    // Check if affiliate already exists
    const existingAffiliate = await Affiliate.findOne({ email: email.toLowerCase() });
    if (existingAffiliate) {
      return res.status(409).json({
        success: false,
        message: 'Affiliate with this email already exists'
      });
    }

    // Create affiliate
    const affiliate = new Affiliate({
      name,
      email: email.toLowerCase(),
      tier,
      commissionRate,
      customCommissionRates,
      contactInfo,
      paymentInfo,
      adminNotes,
      tags,
      status: 'active' // Admin-created affiliates are active by default
    });

    await affiliate.save();

    res.status(201).json({
      success: true,
      message: 'Affiliate created successfully',
      data: affiliate
    });

  } catch (error) {
    console.error('Create affiliate error:', error);
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
    const updates = req.body;
    delete updates._id; // Don't allow ID updates

    const affiliate = await Affiliate.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

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
    console.error('Update affiliate error:', error);
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
    const affiliate = await Affiliate.findByIdAndDelete(req.params.id);

    if (!affiliate) {
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
    console.error('Delete affiliate error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting affiliate',
      error: error.message
    });
  }
});

/**
 * Approve commission (Admin only)
 */
router.post('/:id/commissions/:commissionId/approve', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const affiliate = await Affiliate.findById(req.params.id);
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate not found'
      });
    }

    await affiliate.approveCommission(req.params.commissionId, req.user.id);

    res.json({
      success: true,
      message: 'Commission approved successfully'
    });

  } catch (error) {
    console.error('Approve commission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving commission',
      error: error.message
    });
  }
});

/**
 * Pay commission (Admin only)
 */
router.post('/:id/commissions/:commissionId/pay', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { paymentMethod, paymentReference } = req.body;

    const affiliate = await Affiliate.findById(req.params.id);
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate not found'
      });
    }

    await affiliate.payCommission(req.params.commissionId, {
      method: paymentMethod,
      reference: paymentReference
    });

    res.json({
      success: true,
      message: 'Commission paid successfully'
    });

  } catch (error) {
    console.error('Pay commission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment',
      error: error.message
    });
  }
});

/**
 * Get affiliate performance analytics (Admin only)
 */
router.get('/analytics/performance', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { startDate, endDate, affiliateIds } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    if (affiliateIds) {
      matchStage._id = { $in: affiliateIds.split(',') };
    }

    const analytics = await Affiliate.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$stats.lifetimeValue' },
          totalCommissions: { $sum: '$stats.totalCommissionEarned' },
          totalReferrals: { $sum: '$stats.totalReferrals' },
          successfulReferrals: { $sum: '$stats.successfulReferrals' },
          averageConversionRate: { $avg: '$stats.conversionRate' },
          topPerformers: { $push: { affiliate: '$name', revenue: '$stats.lifetimeValue' } }
        }
      }
    ]);

    res.json({
      success: true,
      data: analytics[0] || {
        totalRevenue: 0,
        totalCommissions: 0,
        totalReferrals: 0,
        successfulReferrals: 0,
        averageConversionRate: 0,
        topPerformers: []
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
});

/**
 * Generate affiliate link (Admin only)
 */
router.post('/:id/generate-link', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { linkName, targetUrl, description } = req.body;
    
    const affiliate = await Affiliate.findById(req.params.id);
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate not found'
      });
    }

    // Generate tracking URL
    const trackingId = crypto.randomBytes(8).toString('hex');
    const affiliateUrl = `${targetUrl}?ref=${affiliate.referralCode}&track=${trackingId}`;

    // Add to custom links
    affiliate.marketingAssets.customLinks.push({
      name: linkName,
      url: affiliateUrl,
      description,
      clicks: 0
    });

    await affiliate.save();

    res.json({
      success: true,
      message: 'Affiliate link generated successfully',
      data: {
        affiliateUrl,
        trackingId,
        referralCode: affiliate.referralCode
      }
    });

  } catch (error) {
    console.error('Generate link error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating affiliate link',
      error: error.message
    });
  }
});

/**
 * Bulk actions (Admin only)
 */
router.post('/bulk-action', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { action, affiliateIds, data } = req.body;

    let result;
    switch (action) {
      case 'activate':
        result = await Affiliate.updateMany(
          { _id: { $in: affiliateIds } },
          { $set: { status: 'active' } }
        );
        break;
      
      case 'deactivate':
        result = await Affiliate.updateMany(
          { _id: { $in: affiliateIds } },
          { $set: { status: 'inactive' } }
        );
        break;
      
      case 'update_tier':
        result = await Affiliate.updateMany(
          { _id: { $in: affiliateIds } },
          { $set: { tier: data.tier } }
        );
        break;
      
      case 'update_commission':
        result = await Affiliate.updateMany(
          { _id: { $in: affiliateIds } },
          { $set: { commissionRate: data.commissionRate } }
        );
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid bulk action'
        });
    }

    res.json({
      success: true,
      message: `Bulk action completed successfully`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });

  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing bulk action',
      error: error.message
    });
  }
});

module.exports = router;