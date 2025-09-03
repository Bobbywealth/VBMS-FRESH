const mongoose = require('mongoose');

const socialMediaAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business'
  },
  
  platform: {
    type: String,
    enum: ['Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'TikTok', 'YouTube'],
    required: true
  },
  
  accountId: {
    type: String,
    required: true
  },
  
  username: {
    type: String,
    required: true
  },
  
  displayName: {
    type: String
  },
  
  profilePicture: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(v);
      },
      message: 'Invalid profile picture URL format'
    }
  },
  
  accessToken: {
    type: String,
    required: true
  },
  
  refreshToken: {
    type: String
  },
  
  tokenExpiry: {
    type: Date
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  permissions: [{
    type: String,
    enum: [
      'read_insights',
      'manage_pages',
      'publish_pages',
      'read_page_mailboxes',
      'pages_messaging',
      'instagram_basic',
      'instagram_content_publish',
      'pages_show_list'
    ]
  }],
  
  stats: {
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    posts: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  
  settings: {
    autoPost: { type: Boolean, default: false },
    autoReply: { type: Boolean, default: false },
    notifications: {
      mentions: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      messages: { type: Boolean, default: true }
    }
  },
  
  webhookUrl: {
    type: String
  },
  
  lastSyncAt: {
    type: Date
  },
  
  syncStatus: {
    type: String,
    enum: ['pending', 'syncing', 'completed', 'failed'],
    default: 'pending'
  },
  
  errors: [{
    message: String,
    code: String,
    timestamp: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false }
  }]
}, {
  timestamps: true
});

// Compound index for user and platform uniqueness
socialMediaAccountSchema.index({ userId: 1, platform: 1, accountId: 1 }, { unique: true });

// Index for active accounts
socialMediaAccountSchema.index({ isActive: 1, platform: 1 });

// Virtual for account status
socialMediaAccountSchema.virtual('status').get(function() {
  if (!this.isActive) return 'inactive';
  if (this.tokenExpiry && this.tokenExpiry < new Date()) return 'token_expired';
  if (this.errors.some(e => !e.resolved)) return 'error';
  return 'active';
});

// Method to check if token needs refresh
socialMediaAccountSchema.methods.needsTokenRefresh = function() {
  if (!this.tokenExpiry) return false;
  const bufferTime = 24 * 60 * 60 * 1000; // 24 hours buffer
  return this.tokenExpiry.getTime() - Date.now() < bufferTime;
};

// Method to refresh token
socialMediaAccountSchema.methods.refreshAccessToken = async function() {
  try {
    // Implementation would depend on the platform
    // This is a placeholder for the token refresh logic
    
    switch (this.platform) {
      case 'Facebook':
      case 'Instagram':
        return await this.refreshFacebookToken();
      case 'Twitter':
        return await this.refreshTwitterToken();
      case 'LinkedIn':
        return await this.refreshLinkedInToken();
      default:
        throw new Error(`Token refresh not implemented for ${this.platform}`);
    }
  } catch (error) {
    this.errors.push({
      message: `Token refresh failed: ${error.message}`,
      code: 'TOKEN_REFRESH_FAILED'
    });
    await this.save();
    throw error;
  }
};

// Method to update stats
socialMediaAccountSchema.methods.updateStats = async function(newStats) {
  try {
    this.stats = {
      ...this.stats,
      ...newStats,
      lastUpdated: new Date()
    };
    await this.save();
  } catch (error) {
    console.error('Error updating stats:', error);
    throw error;
  }
};

// Method to log error
socialMediaAccountSchema.methods.logError = async function(message, code) {
  this.errors.push({
    message,
    code,
    timestamp: new Date()
  });
  await this.save();
};

// Method to resolve errors
socialMediaAccountSchema.methods.resolveErrors = async function() {
  this.errors.forEach(error => {
    error.resolved = true;
  });
  await this.save();
};

// Static method to get active accounts for user
socialMediaAccountSchema.statics.getActiveAccounts = function(userId) {
  return this.find({
    userId,
    isActive: true
  }).sort({ platform: 1 });
};

// Static method to get accounts by platform
socialMediaAccountSchema.statics.getAccountsByPlatform = function(userId, platform) {
  return this.find({
    userId,
    platform,
    isActive: true
  });
};

// Platform-specific token refresh methods (placeholders)
socialMediaAccountSchema.methods.refreshFacebookToken = async function() {
  // Facebook/Instagram token refresh logic
  const axios = require('axios');
  
  try {
    const response = await axios.get('https://graph.facebook.com/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        fb_exchange_token: this.accessToken
      }
    });
    
    this.accessToken = response.data.access_token;
    this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
    await this.save();
    
    return this.accessToken;
  } catch (error) {
    throw new Error(`Facebook token refresh failed: ${error.message}`);
  }
};

socialMediaAccountSchema.methods.refreshTwitterToken = async function() {
  // Twitter token refresh logic would go here
  throw new Error('Twitter token refresh not implemented');
};

socialMediaAccountSchema.methods.refreshLinkedInToken = async function() {
  // LinkedIn token refresh logic would go here
  throw new Error('LinkedIn token refresh not implemented');
};

// Pre-save middleware
socialMediaAccountSchema.pre('save', function(next) {
  // Update lastSyncAt when stats are updated
  if (this.isModified('stats')) {
    this.lastSyncAt = new Date();
  }
  next();
});

module.exports = mongoose.model('SocialMediaAccount', socialMediaAccountSchema);
