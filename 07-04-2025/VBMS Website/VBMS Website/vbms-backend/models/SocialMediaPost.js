const mongoose = require('mongoose');

const socialMediaPostSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxLength: 2200 // Instagram caption limit
  },
  
  platforms: [{
    type: String,
    enum: ['Instagram', 'Facebook', 'Twitter', 'LinkedIn'],
    required: true
  }],
  
  mediaUrls: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|mp4|mov)$/i.test(v);
      },
      message: 'Invalid media URL format'
    }
  }],
  
  scheduledTime: {
    type: Date,
    required: true
  },
  
  publishedAt: {
    type: Date
  },
  
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'publishing', 'published', 'failed'],
    default: 'draft'
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business'
  },
  
  results: [{
    platform: String,
    success: Boolean,
    postId: String,
    error: String,
    publishedAt: Date,
    metrics: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      reach: { type: Number, default: 0 }
    }
  }],
  
  hashtags: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^#[a-zA-Z0-9_]+$/.test(v);
      },
      message: 'Invalid hashtag format'
    }
  }],
  
  mentions: [{
    type: String,
    validate: {
      validator: function(v) {
        return /^@[a-zA-Z0-9_.]+$/.test(v);
      },
      message: 'Invalid mention format'
    }
  }],
  
  campaignId: {
    type: String
  },
  
  postType: {
    type: String,
    enum: ['image', 'video', 'carousel', 'story', 'reel', 'text'],
    default: 'text'
  },
  
  targetAudience: {
    ageRange: {
      min: { type: Number, min: 13, max: 65 },
      max: { type: Number, min: 18, max: 65 }
    },
    interests: [String],
    location: String,
    gender: {
      type: String,
      enum: ['all', 'male', 'female', 'other']
    }
  },
  
  analytics: {
    impressions: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  
  isPromoted: {
    type: Boolean,
    default: false
  },
  
  promotionBudget: {
    type: Number,
    min: 0
  },
  
  error: {
    message: String,
    code: String,
    timestamp: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
socialMediaPostSchema.index({ userId: 1, status: 1 });
socialMediaPostSchema.index({ scheduledTime: 1, status: 1 });
socialMediaPostSchema.index({ businessId: 1, createdAt: -1 });
socialMediaPostSchema.index({ platforms: 1, publishedAt: -1 });

// Virtual for engagement rate
socialMediaPostSchema.virtual('engagementRate').get(function() {
  const totalEngagement = this.analytics.engagement;
  const totalReach = this.analytics.reach;
  return totalReach > 0 ? (totalEngagement / totalReach * 100).toFixed(2) : 0;
});

// Method to update analytics
socialMediaPostSchema.methods.updateAnalytics = async function(platformData) {
  try {
    for (const data of platformData) {
      const resultIndex = this.results.findIndex(r => r.platform === data.platform);
      if (resultIndex !== -1) {
        this.results[resultIndex].metrics = {
          ...this.results[resultIndex].metrics,
          ...data.metrics
        };
      }
      
      // Update overall analytics
      this.analytics.impressions += data.metrics.impressions || 0;
      this.analytics.reach += data.metrics.reach || 0;
      this.analytics.engagement += (data.metrics.likes || 0) + (data.metrics.comments || 0) + (data.metrics.shares || 0);
      this.analytics.clicks += data.metrics.clicks || 0;
      this.analytics.saves += data.metrics.saves || 0;
    }
    
    this.analytics.lastUpdated = new Date();
    await this.save();
  } catch (error) {
    console.error('Error updating analytics:', error);
    throw error;
  }
};

// Static method to get posts by date range
socialMediaPostSchema.statics.getPostsByDateRange = function(startDate, endDate, userId) {
  return this.find({
    userId,
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ createdAt: -1 });
};

// Static method to get performance metrics
socialMediaPostSchema.statics.getPerformanceMetrics = async function(userId, timeframe = '30d') {
  const days = parseInt(timeframe.replace('d', ''));
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const pipeline = [
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        status: 'published',
        publishedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalPosts: { $sum: 1 },
        totalImpressions: { $sum: '$analytics.impressions' },
        totalReach: { $sum: '$analytics.reach' },
        totalEngagement: { $sum: '$analytics.engagement' },
        totalClicks: { $sum: '$analytics.clicks' },
        avgEngagementRate: { $avg: { $divide: ['$analytics.engagement', '$analytics.reach'] } }
      }
    }
  ];
  
  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalPosts: 0,
    totalImpressions: 0,
    totalReach: 0,
    totalEngagement: 0,
    totalClicks: 0,
    avgEngagementRate: 0
  };
};

// Pre-save middleware
socialMediaPostSchema.pre('save', function(next) {
  // Extract hashtags and mentions from content
  if (this.content) {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const mentionRegex = /@[a-zA-Z0-9_.]+/g;
    
    this.hashtags = this.content.match(hashtagRegex) || [];
    this.mentions = this.content.match(mentionRegex) || [];
  }
  
  next();
});

module.exports = mongoose.model('SocialMediaPost', socialMediaPostSchema);
