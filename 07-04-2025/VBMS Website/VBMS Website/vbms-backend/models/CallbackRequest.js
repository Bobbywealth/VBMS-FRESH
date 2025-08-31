const mongoose = require('mongoose');

const callbackRequestSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  phone: {
    type: String,
    required: true
  },
  preferredTime: {
    type: Date,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  callId: {
    type: String, // VAPI call ID
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'completed', 'cancelled', 'failed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  notes: String,
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: Date,
  scheduledAt: Date,
  requestedAt: {
    type: Date,
    default: Date.now
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  customerSatisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
callbackRequestSchema.index({ status: 1, preferredTime: 1 });
callbackRequestSchema.index({ customerId: 1, createdAt: -1 });

module.exports = mongoose.model('CallbackRequest', callbackRequestSchema);