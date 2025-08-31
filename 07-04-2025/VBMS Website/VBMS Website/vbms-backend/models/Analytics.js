const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  period: {
    type: { 
      type: String, 
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      required: true 
    },
    date: { type: Date, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },
  revenue: {
    total: { type: Number, default: 0 },
    online: { type: Number, default: 0 },
    phone: { type: Number, default: 0 },
    walkIn: { type: Number, default: 0 },
    uberEats: { type: Number, default: 0 },
    growth: { type: Number, default: 0 } // Percentage growth from previous period
  },
  orders: {
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    averageValue: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 } // Percentage
  },
  customers: {
    total: { type: Number, default: 0 },
    new: { type: Number, default: 0 },
    returning: { type: Number, default: 0 },
    retention: { type: Number, default: 0 }, // Percentage
    lifetime: { type: Number, default: 0 } // Average lifetime value
  },
  calls: {
    total: { type: Number, default: 0 },
    answered: { type: Number, default: 0 },
    aiHandled: { type: Number, default: 0 },
    humanTransfer: { type: Number, default: 0 },
    averageDuration: { type: Number, default: 0 }, // in seconds
    cost: { type: Number, default: 0 }, // Total call costs
    satisfaction: { type: Number, default: 0 } // Average satisfaction
  },
  inventory: {
    topSelling: [{
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory' },
      name: String,
      quantity: Number,
      revenue: Number
    }],
    lowStock: { type: Number, default: 0 },
    outOfStock: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 }
  },
  performance: {
    averageOrderTime: { type: Number, default: 0 }, // minutes
    onTimeDelivery: { type: Number, default: 0 }, // percentage
    customerSatisfaction: { type: Number, default: 0 }, // 1-5 rating
    operationalEfficiency: { type: Number, default: 0 } // percentage
  },
  trends: {
    busyHours: [{
      hour: Number,
      orderCount: Number,
      revenue: Number
    }],
    popularItems: [{
      name: String,
      count: Number
    }],
    seasonality: {
      factor: Number, // Seasonal multiplier
      trend: String // 'up', 'down', 'stable'
    }
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
analyticsSchema.index({ businessId: 1, 'period.type': 1, 'period.date': 1 }, { unique: true });

module.exports = mongoose.model('Analytics', analyticsSchema);