const express = require('express');
const router = express.Router();
const SocialMediaService = require('../services/smmService');
const SocialMediaPost = require('../models/SocialMediaPost');
const SocialMediaAccount = require('../models/SocialMediaAccount');
const { authenticateToken } = require('../middleware/auth');
const { body, query, validationResult } = require('express-validator');

const smmService = new SocialMediaService();

// Middleware to check validation errors
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// Get social media overview/dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const timeframe = req.query.timeframe || '30d';
    
    const analytics = await smmService.getComprehensiveAnalytics(timeframe);
    
    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data',
      error: error.message
    });
  }
});

// Get Instagram stats
router.get('/instagram/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await smmService.getInstagramStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Instagram Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Instagram stats',
      error: error.message
    });
  }
});

// Get Instagram posts
router.get('/instagram/posts', authenticateToken, [
  query('limit').optional().isInt({ min: 1, max: 50 })
], checkValidation, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const posts = await smmService.getInstagramPosts(limit);
    
    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Instagram Posts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Instagram posts',
      error: error.message
    });
  }
});

// Get Facebook stats
router.get('/facebook/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await smmService.getFacebookStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Facebook Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Facebook stats',
      error: error.message
    });
  }
});

// Get Facebook posts
router.get('/facebook/posts', authenticateToken, [
  query('limit').optional().isInt({ min: 1, max: 50 })
], checkValidation, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const posts = await smmService.getFacebookPosts(limit);
    
    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Facebook Posts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Facebook posts',
      error: error.message
    });
  }
});

// Get Twitter stats
router.get('/twitter/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await smmService.getTwitterStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Twitter Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Twitter stats',
      error: error.message
    });
  }
});

// Get Twitter posts
router.get('/twitter/posts', authenticateToken, [
  query('limit').optional().isInt({ min: 1, max: 50 })
], checkValidation, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const posts = await smmService.getTwitterPosts(limit);
    
    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Twitter Posts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Twitter posts',
      error: error.message
    });
  }
});

// Get Google Reviews
router.get('/google/reviews', authenticateToken, async (req, res) => {
  try {
    const reviews = await smmService.getGoogleReviews();
    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error('Google Reviews Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Google reviews',
      error: error.message
    });
  }
});

// Get Google Business stats
router.get('/google/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await smmService.getGoogleBusinessStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Google Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Google business stats',
      error: error.message
    });
  }
});

// Schedule a new post
router.post('/posts/schedule', authenticateToken, [
  body('content').notEmpty().isLength({ min: 1, max: 2200 }),
  body('platforms').isArray().notEmpty(),
  body('scheduledTime').isISO8601(),
  body('mediaUrls').optional().isArray()
], checkValidation, async (req, res) => {
  try {
    const userId = req.user.id;
    const postData = {
      ...req.body,
      userId
    };
    
    const result = await smmService.schedulePost(postData);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Schedule Post Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule post',
      error: error.message
    });
  }
});

// Get scheduled posts
router.get('/posts/scheduled', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const scheduledPosts = await SocialMediaPost.find({
      userId,
      status: 'scheduled',
      scheduledTime: { $gte: new Date() }
    }).sort({ scheduledTime: 1 });
    
    res.json({
      success: true,
      data: scheduledPosts
    });
  } catch (error) {
    console.error('Scheduled Posts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled posts',
      error: error.message
    });
  }
});

// Get published posts
router.get('/posts/published', authenticateToken, [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 })
], checkValidation, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const publishedPosts = await SocialMediaPost.find({
      userId,
      status: 'published'
    })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .skip(offset);
    
    const totalCount = await SocialMediaPost.countDocuments({
      userId,
      status: 'published'
    });
    
    res.json({
      success: true,
      data: {
        posts: publishedPosts,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      }
    });
  } catch (error) {
    console.error('Published Posts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch published posts',
      error: error.message
    });
  }
});

// Update/Edit a scheduled post
router.put('/posts/:postId', authenticateToken, [
  body('content').optional().isLength({ min: 1, max: 2200 }),
  body('platforms').optional().isArray(),
  body('scheduledTime').optional().isISO8601(),
  body('mediaUrls').optional().isArray()
], checkValidation, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;
    
    const post = await SocialMediaPost.findOne({
      _id: postId,
      userId,
      status: { $in: ['draft', 'scheduled'] }
    });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or cannot be edited'
      });
    }
    
    // Update the post
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        post[key] = req.body[key];
      }
    });
    
    await post.save();
    
    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Update Post Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update post',
      error: error.message
    });
  }
});

// Delete a post
router.delete('/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const postId = req.params.postId;
    
    const post = await SocialMediaPost.findOne({
      _id: postId,
      userId,
      status: { $in: ['draft', 'scheduled'] }
    });
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or cannot be deleted'
      });
    }
    
    await SocialMediaPost.findByIdAndDelete(postId);
    
    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete Post Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: error.message
    });
  }
});

// Get analytics for a specific time period
router.get('/analytics', authenticateToken, [
  query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']),
  query('platform').optional().isIn(['Instagram', 'Facebook', 'Twitter', 'all'])
], checkValidation, async (req, res) => {
  try {
    const userId = req.user.id;
    const timeframe = req.query.timeframe || '30d';
    const platform = req.query.platform || 'all';
    
    const days = parseInt(timeframe.replace(/[^0-9]/g, ''));
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    let matchQuery = {
      userId,
      status: 'published',
      publishedAt: { $gte: startDate }
    };
    
    if (platform !== 'all') {
      matchQuery.platforms = platform;
    }
    
    const analytics = await SocialMediaPost.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalImpressions: { $sum: '$analytics.impressions' },
          totalReach: { $sum: '$analytics.reach' },
          totalEngagement: { $sum: '$analytics.engagement' },
          totalClicks: { $sum: '$analytics.clicks' },
          avgEngagementRate: { 
            $avg: { 
              $cond: [
                { $gt: ['$analytics.reach', 0] },
                { $multiply: [{ $divide: ['$analytics.engagement', '$analytics.reach'] }, 100] },
                0
              ]
            }
          }
        }
      }
    ]);
    
    const result = analytics[0] || {
      totalPosts: 0,
      totalImpressions: 0,
      totalReach: 0,
      totalEngagement: 0,
      totalClicks: 0,
      avgEngagementRate: 0
    };
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
});

// Get social media accounts
router.get('/accounts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const accounts = await SocialMediaAccount.getActiveAccounts(userId);
    
    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    console.error('Accounts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch social media accounts',
      error: error.message
    });
  }
});

// Connect a social media account (OAuth callback handler)
router.post('/accounts/connect', authenticateToken, [
  body('platform').isIn(['Instagram', 'Facebook', 'Twitter', 'LinkedIn']),
  body('accessToken').notEmpty(),
  body('accountId').notEmpty(),
  body('username').notEmpty()
], checkValidation, async (req, res) => {
  try {
    const userId = req.user.id;
    const { platform, accessToken, accountId, username, displayName, profilePicture, refreshToken, tokenExpiry, permissions } = req.body;
    
    // Check if account already exists
    const existingAccount = await SocialMediaAccount.findOne({
      userId,
      platform,
      accountId
    });
    
    if (existingAccount) {
      // Update existing account
      existingAccount.accessToken = accessToken;
      existingAccount.refreshToken = refreshToken;
      existingAccount.tokenExpiry = tokenExpiry ? new Date(tokenExpiry) : null;
      existingAccount.permissions = permissions || [];
      existingAccount.isActive = true;
      await existingAccount.save();
      
      return res.json({
        success: true,
        message: 'Account updated successfully',
        data: existingAccount
      });
    }
    
    // Create new account
    const newAccount = new SocialMediaAccount({
      userId,
      platform,
      accountId,
      username,
      displayName,
      profilePicture,
      accessToken,
      refreshToken,
      tokenExpiry: tokenExpiry ? new Date(tokenExpiry) : null,
      permissions: permissions || []
    });
    
    await newAccount.save();
    
    res.json({
      success: true,
      message: 'Account connected successfully',
      data: newAccount
    });
  } catch (error) {
    console.error('Connect Account Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect account',
      error: error.message
    });
  }
});

// Disconnect a social media account
router.delete('/accounts/:accountId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.accountId;
    
    const account = await SocialMediaAccount.findOne({
      _id: accountId,
      userId
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    account.isActive = false;
    await account.save();
    
    res.json({
      success: true,
      message: 'Account disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect Account Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect account',
      error: error.message
    });
  }
});

// Refresh account stats
router.post('/accounts/:accountId/refresh', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.accountId;
    
    const account = await SocialMediaAccount.findOne({
      _id: accountId,
      userId,
      isActive: true
    });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }
    
    // Refresh stats based on platform
    let newStats;
    switch (account.platform) {
      case 'Instagram':
        newStats = await smmService.getInstagramStats();
        break;
      case 'Facebook':
        newStats = await smmService.getFacebookStats();
        break;
      case 'Twitter':
        newStats = await smmService.getTwitterStats();
        break;
      default:
        throw new Error(`Stats refresh not supported for ${account.platform}`);
    }
    
    await account.updateStats({
      followers: newStats.followers,
      engagement: newStats.engagement
    });
    
    res.json({
      success: true,
      message: 'Account stats refreshed successfully',
      data: account
    });
  } catch (error) {
    console.error('Refresh Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh account stats',
      error: error.message
    });
  }
});

// Webhook endpoint for social media platforms
router.post('/webhook/:platform', async (req, res) => {
  try {
    const platform = req.params.platform;
    const payload = req.body;
    
    console.log(`Received ${platform} webhook:`, payload);
    
    // Handle webhook based on platform
    switch (platform.toLowerCase()) {
      case 'facebook':
      case 'instagram':
        await handleFacebookWebhook(payload);
        break;
      case 'twitter':
        await handleTwitterWebhook(payload);
        break;
      default:
        console.log(`Unsupported webhook platform: ${platform}`);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Webhook handlers
async function handleFacebookWebhook(payload) {
  // Handle Facebook/Instagram webhook events
  if (payload.object === 'page') {
    for (const entry of payload.entry) {
      // Handle different types of events (comments, messages, etc.)
      if (entry.changes) {
        for (const change of entry.changes) {
          console.log('Facebook change:', change);
          // Update analytics, handle comments, etc.
        }
      }
    }
  }
}

async function handleTwitterWebhook(payload) {
  // Handle Twitter webhook events
  console.log('Twitter webhook:', payload);
  // Update analytics, handle mentions, etc.
}

module.exports = router;
