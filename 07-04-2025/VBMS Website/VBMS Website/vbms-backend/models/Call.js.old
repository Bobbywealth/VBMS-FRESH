const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  callInfo: {
    callId: { type: String, required: true, unique: true },
    vapiCallId: String, // From Vapi AI system
    phoneNumber: { type: String, required: true },
    direction: { 
      type: String, 
      enum: ['inbound', 'outbound'],
      required: true 
    },
    duration: { type: Number, default: 0 }, // in seconds
    cost: { type: Number, default: 0.30 } // $0.30 per call
  },
  customer: {
    name: String,
    phone: { type: String, required: true },
    email: String,
    isReturning: { type: Boolean, default: false }
  },
  callPurpose: {
    type: String,
    enum: ['reservation', 'order', 'inquiry', 'complaint', 'support', 'other'],
    default: 'inquiry'
  },
  outcome: {
    type: String,
    enum: ['answered', 'voicemail', 'busy', 'no_answer', 'failed'],
    default: 'answered'
  },
  aiHandling: {
    wasHandledByAI: { type: Boolean, default: true },
    confidence: { type: Number, min: 0, max: 100 }, // AI confidence level
    transferredToHuman: { type: Boolean, default: false },
    transferReason: String,
    satisfaction: { type: Number, min: 1, max: 5 } // 1-5 rating
  },
  conversation: {
    transcript: String,
    summary: String,
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      default: 'neutral'
    },
    keywords: [String],
    actionItems: [String]
  },
  businessAction: {
    createdOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    createdReservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation'
    },
    followUpRequired: { type: Boolean, default: false },
    followUpNote: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'low'
    }
  },
  timing: {
    startTime: { type: Date, required: true },
    endTime: Date,
    timeZone: String,
    businessHours: { type: Boolean, default: true }
  },
  recording: {
    url: String,
    duration: Number,
    available: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Generate unique call ID
callSchema.pre('save', async function(next) {
  if (!this.callInfo.callId) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.constructor.countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    }) + 1;
    this.callInfo.callId = `CALL-${today}-${count.toString().padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Call', callSchema);