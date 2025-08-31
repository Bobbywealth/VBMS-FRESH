const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  packageType: {
    type: String,
    enum: ['start', 'core', 'ai_phone', 'premium_plus'],
    required: true
  },
  packageName: {
    type: String,
    required: true
  },
  price: {
    monthly: { type: Number, required: true },
    perCall: { type: Number, default: 0 }, // For AI Phone System
    setup: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled', 'past_due'],
    default: 'active'
  },
  billing: {
    stripeSubscriptionId: String,
    stripeCustomerId: String,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    nextBillingDate: Date,
    lastPaymentDate: Date,
    paymentFailedCount: { type: Number, default: 0 },
    cancelledAt: Date,
    trialEnd: Date,
    discountApplied: {
      couponId: String,
      percentOff: Number,
      amountOff: Number,
      validUntil: Date
    }
  },
  features: {
    liveMonitoring: { type: Boolean, default: false },
    orderManagement: { type: Boolean, default: false },
    phoneSupport: { type: Boolean, default: false },
    aiPhone: { type: Boolean, default: false },
    inventoryTracker: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    customDashboard: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false }
  },
  usage: {
    monthlyHours: { type: Number, default: 0 },
    callsCount: { type: Number, default: 0 },
    lastReset: { type: Date, default: Date.now }
  },
  startDate: { type: Date, default: Date.now },
  endDate: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Subscription', subscriptionSchema);