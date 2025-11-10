const mongoose = require('mongoose');

const vapiCallSchema = new mongoose.Schema({
  vapiCallId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assistantId: {
    type: String,
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  status: {
    type: String,
    enum: ['queued', 'ringing', 'in-progress', 'forwarding', 'ended'],
    default: 'queued'
  },
  startedAt: Date,
  endedAt: Date,
  duration: {
    type: Number, // in seconds
    default: 0
  },
  cost: {
    type: Number, // in cents
    default: 0
  },
  transcript: {
    type: String,
    default: ''
  },
  summary: String,
  recording: {
    url: String,
    duration: Number
  },
  analysis: {
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    },
    topics: [String],
    successEvaluation: {
      score: {
        type: Number,
        min: 0,
        max: 10
      },
      reason: String
    },
    actionItems: [String]
  },
  functionCalls: [{
    name: String,
    parameters: mongoose.Schema.Types.Mixed,
    result: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  customerSatisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    collectedAt: Date
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpNotes: String,
  tags: [String],
  metadata: {
    userAgent: String,
    ipAddress: String,
    referrer: String,
    campaignId: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
vapiCallSchema.index({ customerId: 1, createdAt: -1 });
vapiCallSchema.index({ status: 1 });
vapiCallSchema.index({ startedAt: -1 });
vapiCallSchema.index({ 'analysis.sentiment': 1 });

// Virtual for formatted duration
vapiCallSchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return '0:00';
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Method to calculate call cost (example pricing)
vapiCallSchema.methods.calculateCost = function() {
  const costPerMinute = 15; // cents per minute
  const costPerSecond = costPerMinute / 60;
  this.cost = Math.ceil(this.duration * costPerSecond);
  return this.cost;
};

module.exports = mongoose.model('VAPICall', vapiCallSchema);