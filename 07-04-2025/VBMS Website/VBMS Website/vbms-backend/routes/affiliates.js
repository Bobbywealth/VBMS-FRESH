const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Affiliate = require('../models/Affiliate');
const User = require('../models/User');
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');

// ========================================
// ADMIN ROUTES - Affiliate Management
// ========================================

/**
 * Get all affiliates with filtering and pagination (Admin only)
 */
router.get('/admin/all', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status,
      tier,
      search
    } = req.query;

    let affiliates = await Affiliate.find();
    
    // Apply filters
    if (status) {
      affiliates = affiliates.filter(a => a.status === status);
    }
    if (tier) {
      affiliates = affiliates.filter(a => a.tier === tier);
    }
    if (search) {
      affiliates = affiliates.filter(a => 
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedAffiliates = affiliates.slice(startIndex, startIndex + parseInt(limit));
    
    res.json({
      success: true,
      data: {
        affiliates: paginatedAffiliates,
        pagination: {
          total: affiliates.length,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(affiliates.length / limit)
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
 * Get affiliate analytics dashboard (Admin only)
 */
router.get('/admin/analytics', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    const analytics = await Affiliate.getAnalytics(timeframe);
    const topPerformers = await Affiliate.getTopPerformers(5);

    res.json({
      success: true,
      data: {
        overview: analytics,
        topPerformers,
        timeframe
      }
    });
  } catch (error) {
    console.error('Error fetching affiliate analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching affiliate analytics',
      error: error.message
    });
  }
});

/**
 * Get affiliate by ID (Admin only)
 */
router.get('/admin/:id', authenticateToken, requireAdminPermission, async (req, res) => {
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
router.post('/admin/create', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { name, email, tier = 'bronze', commission_rate = 0.10 } = req.body;

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
      status: 'active',
      tier,
      commission_rate: parseFloat(commission_rate)
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
router.put('/admin/:id', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { name, email, status, tier, commission_rate } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (status) updateData.status = status;
    if (tier) updateData.tier = tier;
    if (commission_rate) updateData.commission_rate = parseFloat(commission_rate);

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
router.delete('/admin/:id', authenticateToken, requireAdminPermission, async (req, res) => {
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

// ========================================
// CUSTOMER ROUTES - Affiliate Dashboard
// ========================================

/**
 * Get current user's affiliate dashboard
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Check if user is an affiliate
    const affiliate = await Affiliate.findByEmail(req.user.email);
    
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'You are not registered as an affiliate',
        canApply: true
      });
    }

    // Return affiliate dashboard data
    res.json({
      success: true,
      data: {
        profile: {
          name: affiliate.name,
          email: affiliate.email,
          affiliateId: affiliate.affiliate_id,
          referralCode: affiliate.referral_code,
          status: affiliate.status,
          tier: affiliate.tier,
          commissionRate: affiliate.commission_rate,
          joinDate: affiliate.created_at
        },
        stats: {
          totalEarnings: affiliate.total_earnings,
          totalReferrals: affiliate.total_referrals,
          currentMonthEarnings: 0, // TODO: Calculate current month
          currentMonthReferrals: 0, // TODO: Calculate current month
          conversionRate: affiliate.total_referrals > 0 ? (affiliate.total_referrals * 0.12) : 0, // Mock calculation
          pendingPayouts: affiliate.total_earnings * 0.3 // Mock pending payouts
        },
        links: {
          referralUrl: `https://vbmstest1.netlify.app/?ref=${affiliate.referral_code}`,
          trackingCode: affiliate.referral_code
        }
      }
    });
  } catch (error) {
    console.error('Error fetching affiliate dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching affiliate dashboard',
      error: error.message
    });
  }
});

/**
 * Apply to become an affiliate (Customer)
 */
router.post('/apply', authenticateToken, async (req, res) => {
  try {
    const { motivation, website, socialMedia } = req.body;

    // Check if user is already an affiliate
    const existingAffiliate = await Affiliate.findByEmail(req.user.email);
    
    if (existingAffiliate) {
      return res.status(409).json({
        success: false,
        message: 'You are already registered as an affiliate'
      });
    }

    // Generate unique IDs
    const affiliateId = `AFF-${Date.now()}`;
    const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const newAffiliate = await Affiliate.create({
      name: `${req.user.first_name} ${req.user.last_name}`,
      email: req.user.email,
      affiliateId,
      referralCode,
      status: 'pending', // Requires admin approval
      tier: 'bronze',
      commission_rate: 0.10,
      payment_info: {},
      settings: {
        motivation,
        website,
        socialMedia,
        applicationDate: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Affiliate application submitted successfully. We will review your application and get back to you soon.',
      data: {
        affiliateId: newAffiliate.affiliate_id,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error applying for affiliate program:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting affiliate application',
      error: error.message
    });
  }
});

/**
 * Get affiliate referral stats (Customer)
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const affiliate = await Affiliate.findByEmail(req.user.email);
    
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'You are not registered as an affiliate'
      });
    }

    // Mock some additional stats (in real app, these would come from orders/analytics)
    const mockStats = {
      visitors: Math.floor(affiliate.total_referrals * 15.2), // Mock visitor count
      customers: affiliate.total_referrals,
      conversionRate: affiliate.total_referrals > 0 ? 9.86 : 0, // Mock conversion rate
      revenue: affiliate.total_earnings / 0.1, // Reverse calculate from commission
      orders: affiliate.total_referrals,
      clickThroughRate: 3.2, // Mock CTR
      topProducts: [
        { name: 'VBMS Pro Plan', sales: Math.floor(affiliate.total_referrals * 0.6), commission: affiliate.total_earnings * 0.6 },
        { name: 'VBMS Business Plan', sales: Math.floor(affiliate.total_referrals * 0.3), commission: affiliate.total_earnings * 0.3 },
        { name: 'VBMS Enterprise', sales: Math.floor(affiliate.total_referrals * 0.1), commission: affiliate.total_earnings * 0.1 }
      ]
    };

    res.json({
      success: true,
      data: {
        basic: {
          totalEarnings: affiliate.total_earnings,
          totalReferrals: affiliate.total_referrals,
          commissionRate: affiliate.commission_rate,
          status: affiliate.status
        },
        detailed: mockStats
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

// ========================================
// SHARED ROUTES
// ========================================

/**
 * Get affiliate statistics overview
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

/**
 * Track referral (public endpoint)
 */
router.post('/track/:referralCode', async (req, res) => {
  try {
    const { referralCode } = req.params;
    const { action = 'visit', metadata = {} } = req.body;

    const affiliate = await Affiliate.findByReferralCode(referralCode);
    
    if (!affiliate) {
      return res.status(404).json({
        success: false,
        message: 'Invalid referral code'
      });
    }

    // In a real app, you'd track this in a separate referral_events table
    // For now, just return success
    res.json({
      success: true,
      message: 'Referral tracked successfully',
      data: {
        affiliateId: affiliate.affiliate_id,
        action,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error tracking referral:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking referral',
      error: error.message
    });
  }
});

module.exports = router;