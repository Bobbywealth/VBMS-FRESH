/**
 * Affiliate Program Model
 * Admin-controlled affiliate system
 */

const mongoose = require('mongoose');

const AffiliateSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  // Affiliate Details
  affiliateId: {
    type: String,
    unique: true,
    required: true
  },
  referralCode: {
    type: String,
    unique: true,
    required: true,
    uppercase: true
  },
  
  // Status and Control
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending'
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
  },
  
  // Commission Structure
  commissionRate: {
    type: Number,
    default: 0.15, // 15% default
    min: 0,
    max: 1
  },
  customCommissionRates: {
    starter: { type: Number, default: 0.15 },
    professional: { type: Number, default: 0.20 },
    enterprise: { type: Number, default: 0.25 }
  },
  
  // Contact Information
  contactInfo: {
    phone: String,
    website: String,
    company: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'USA' }
    }
  },
  
  // Payment Information
  paymentInfo: {
    method: {
      type: String,
      enum: ['paypal', 'stripe', 'bank_transfer', 'check'],
      default: 'paypal'
    },
    paypalEmail: String,
    stripeAccountId: String,
    bankDetails: {
      accountNumber: String,
      routingNumber: String,
      accountName: String,
      bankName: String
    }
  },
  
  // Performance Tracking
  stats: {
    totalReferrals: { type: Number, default: 0 },
    successfulReferrals: { type: Number, default: 0 },
    totalCommissionEarned: { type: Number, default: 0 },
    totalCommissionPaid: { type: Number, default: 0 },
    pendingCommission: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    lifetimeValue: { type: Number, default: 0 }
  },
  
  // Referral Tracking
  referrals: [{
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    customerEmail: String,
    signupDate: { type: Date, default: Date.now },
    firstPurchaseDate: Date,
    totalSpent: { type: Number, default: 0 },
    commissionEarned: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['signup', 'converted', 'churned'],
      default: 'signup'
    }
  }],
  
  // Commission History
  commissions: [{
    orderId: String,
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    orderAmount: Number,
    commissionAmount: Number,
    commissionRate: Number,
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'cancelled'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    paidAt: Date,
    paymentMethod: String,
    paymentReference: String,
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Marketing Materials
  marketingAssets: {
    profileImage: String,
    bannerImages: [String],
    customLinks: [{
      name: String,
      url: String,
      description: String,
      clicks: { type: Number, default: 0 }
    }],
    socialMediaLinks: {
      facebook: String,
      twitter: String,
      linkedin: String,
      instagram: String,
      youtube: String
    }
  },
  
  // Admin Controls
  adminNotes: String,
  tags: [String],
  
  // Onboarding
  onboardingCompleted: { type: Boolean, default: false },
  agreementSignedAt: Date,
  agreementVersion: String,
  
  // Activity Tracking
  lastLoginAt: Date,
  lastActivityAt: Date,
  
  // Settings
  settings: {
    emailNotifications: { type: Boolean, default: true },
    monthlyReports: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: false },
    autoWithdraw: { type: Boolean, default: false },
    minimumPayout: { type: Number, default: 100 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
AffiliateSchema.index({ email: 1 });
AffiliateSchema.index({ affiliateId: 1 });
AffiliateSchema.index({ referralCode: 1 });
AffiliateSchema.index({ status: 1, tier: 1 });
AffiliateSchema.index({ 'stats.totalCommissionEarned': -1 });

// Virtual for conversion rate calculation
AffiliateSchema.virtual('calculatedConversionRate').get(function() {
  if (this.stats.totalReferrals === 0) return 0;
  return (this.stats.successfulReferrals / this.stats.totalReferrals) * 100;
});

// Virtual for pending payout amount
AffiliateSchema.virtual('pendingPayout').get(function() {
  return this.stats.totalCommissionEarned - this.stats.totalCommissionPaid;
});

// Methods
AffiliateSchema.methods.addReferral = function(customerData) {
  this.referrals.push({
    customerId: customerData.customerId,
    customerEmail: customerData.email,
    signupDate: new Date()
  });
  this.stats.totalReferrals += 1;
  return this.save();
};

AffiliateSchema.methods.recordConversion = function(referralId, orderData) {
  const referral = this.referrals.id(referralId);
  if (referral) {
    referral.status = 'converted';
    referral.firstPurchaseDate = new Date();
    referral.totalSpent = orderData.amount;
    
    const commissionAmount = orderData.amount * this.commissionRate;
    referral.commissionEarned = commissionAmount;
    
    // Add to commission history
    this.commissions.push({
      orderId: orderData.orderId,
      customerId: referral.customerId,
      orderAmount: orderData.amount,
      commissionAmount: commissionAmount,
      commissionRate: this.commissionRate,
      status: 'pending'
    });
    
    // Update stats
    this.stats.successfulReferrals += 1;
    this.stats.totalCommissionEarned += commissionAmount;
    this.stats.pendingCommission += commissionAmount;
    this.stats.conversionRate = this.calculatedConversionRate;
  }
  
  return this.save();
};

AffiliateSchema.methods.approveCommission = function(commissionId, adminId) {
  const commission = this.commissions.id(commissionId);
  if (commission && commission.status === 'pending') {
    commission.status = 'approved';
    commission.approvedBy = adminId;
    commission.approvedAt = new Date();
  }
  return this.save();
};

AffiliateSchema.methods.payCommission = function(commissionId, paymentData) {
  const commission = this.commissions.id(commissionId);
  if (commission && commission.status === 'approved') {
    commission.status = 'paid';
    commission.paidAt = new Date();
    commission.paymentMethod = paymentData.method;
    commission.paymentReference = paymentData.reference;
    
    // Update stats
    this.stats.totalCommissionPaid += commission.commissionAmount;
    this.stats.pendingCommission -= commission.commissionAmount;
  }
  return this.save();
};

// Static methods
AffiliateSchema.statics.findByReferralCode = function(code) {
  return this.findOne({ referralCode: code.toUpperCase(), status: 'active' });
};

AffiliateSchema.statics.getTopPerformers = function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ 'stats.totalCommissionEarned': -1 })
    .limit(limit);
};

AffiliateSchema.statics.getPendingPayouts = function() {
  return this.find({
    status: 'active',
    'stats.pendingCommission': { $gt: 0 }
  }).sort({ 'stats.pendingCommission': -1 });
};

// Pre-save middleware
AffiliateSchema.pre('save', function(next) {
  // Generate affiliate ID if not exists
  if (!this.affiliateId) {
    this.affiliateId = `AFF${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }
  
  // Generate referral code if not exists
  if (!this.referralCode) {
    const nameCode = this.name.replace(/\s+/g, '').substr(0, 4).toUpperCase();
    const randomCode = Math.random().toString(36).substr(2, 4).toUpperCase();
    this.referralCode = `${nameCode}${randomCode}`;
  }
  
  // Update activity timestamp
  this.lastActivityAt = new Date();
  
  next();
});

module.exports = mongoose.model('Affiliate', AffiliateSchema);