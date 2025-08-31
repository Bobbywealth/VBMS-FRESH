const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// 1. Define the schema
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['main_admin', 'admin', 'support', 'customer', 'client'],
    default: "client" 
  },
  position: { type: String, default: "Member" },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: "active" 
  },
  profile: {
    photo: { type: String, default: "" },
    phone: String,
    timezone: { type: String, default: 'America/New_York' },
    preferences: {
      notifications: { type: Boolean, default: true },
      darkMode: { type: Boolean, default: false },
      language: { type: String, default: 'en' }
    }
  },
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business'
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  billing: {
    stripeCustomerId: String,
    defaultPaymentMethod: String,
    billingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'USA' }
    }
  },
  adminPermissions: {
    canCreateAdmins: { type: Boolean, default: false },
    canManageCustomers: { type: Boolean, default: false },
    canViewAllData: { type: Boolean, default: false },
    canSetPricing: { type: Boolean, default: false },
    canToggleFeatures: { type: Boolean, default: false },
    canManageStaff: { type: Boolean, default: false },
    canAccessBilling: { type: Boolean, default: false },
    canViewAnalytics: { type: Boolean, default: false },
    canSystemSettings: { type: Boolean, default: false }
  },
  onboarding: {
    completed: { type: Boolean, default: false },
    currentStep: { type: Number, default: 1 },
    wizardData: {
      businessInfo: Object,
      integrations: Object,
      preferences: Object
    }
  },
  security: {
    lastLogin: { type: Date },
    lastPasswordChange: { type: Date, default: Date.now },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    loginHistory: [{
      ip: String,
      userAgent: String,
      timestamp: { type: Date, default: Date.now },
      success: Boolean
    }]
  },
  lastLogin: Date, // Keep for backward compatibility
  lastActivity: { type: Date, default: Date.now }
}, { timestamps: true });

// 2. Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// 3. Compare method for login
UserSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
