const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  // Business Profile Settings
  businessName: { type: String, default: '' },
  businessEmail: { type: String, default: '' },
  businessPhone: { type: String, default: '' },
  businessAddress: { type: String, default: '' },
  businessDescription: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  logoKey: { type: String, default: '' }, // For file management (S3 key or local path)

  // Notification Settings
  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: false },
  orderNotifications: { type: Boolean, default: true },
  marketingNotifications: { type: Boolean, default: false },

  // Integration Settings
  uberEatsConnected: { type: Boolean, default: false },
  uberEatsStoreId: { type: String, default: '' },
  doorDashConnected: { type: Boolean, default: false },
  grubhubConnected: { type: Boolean, default: false },
  cloverConnected: { type: Boolean, default: false },

  // Account Settings
  theme: { type: String, default: 'dark' },
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC' }
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);