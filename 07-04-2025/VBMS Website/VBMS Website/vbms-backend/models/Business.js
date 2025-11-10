const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessInfo: {
    name: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['restaurant', 'retail', 'service', 'manufacturing', 'logistics', 'other'],
      required: true 
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'USA' }
    },
    contact: {
      phone: String,
      email: String,
      website: String
    },
    description: String,
    logo: String, // URL to uploaded logo
    timezone: { type: String, default: 'America/New_York' }
  },
  operationalSettings: {
    hoursOfOperation: {
      monday: { open: String, close: String, closed: Boolean },
      tuesday: { open: String, close: String, closed: Boolean },
      wednesday: { open: String, close: String, closed: Boolean },
      thursday: { open: String, close: String, closed: Boolean },
      friday: { open: String, close: String, closed: Boolean },
      saturday: { open: String, close: String, closed: Boolean },
      sunday: { open: String, close: String, closed: Boolean }
    },
    integrations: {
      uberEats: {
        enabled: { type: Boolean, default: false },
        restaurantId: String,
        apiKey: String,
        webhook: String
      },
      clover: {
        enabled: { type: Boolean, default: false },
        merchantId: String,
        apiKey: String
      },
      vapi: {
        enabled: { type: Boolean, default: false },
        assistantId: String,
        phoneNumber: String,
        apiKey: String
      }
    },
    monitoring: {
      cameras: [{
        name: String,
        location: String,
        streamUrl: String,
        status: { type: String, enum: ['online', 'offline'], default: 'offline' }
      }]
    }
  },
  analytics: {
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
    customerCount: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  status: {
    type: String,
    enum: ['active', 'setup', 'suspended', 'closed'],
    default: 'setup'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Business', businessSchema);