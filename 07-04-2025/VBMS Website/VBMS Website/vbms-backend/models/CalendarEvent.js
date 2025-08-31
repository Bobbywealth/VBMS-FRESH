/**
 * Calendar Event Model with OpenAI Integration
 * Handles event creation, scheduling, and AI-powered suggestions
 */

const mongoose = require('mongoose');

const CalendarEventSchema = new mongoose.Schema({
  // Basic Event Information
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Date and Time
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  allDay: {
    type: Boolean,
    default: false
  },
  timezone: {
    type: String,
    default: 'America/New_York'
  },
  
  // Event Type and Category
  type: {
    type: String,
    enum: ['meeting', 'appointment', 'deadline', 'reminder', 'task', 'personal', 'business', 'training', 'demo', 'call'],
    default: 'meeting'
  },
  category: {
    type: String,
    enum: ['work', 'personal', 'client', 'internal', 'marketing', 'support', 'development', 'admin'],
    default: 'work'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // User and Access Control
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Attendees and Participants
  attendees: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: String,
    name: String,
    role: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'tentative'],
      default: 'pending'
    },
    responseDate: Date
  }],
  
  // Location and Meeting Details
  location: {
    type: String,
    trim: true
  },
  meetingLink: {
    type: String,
    trim: true
  },
  meetingPlatform: {
    type: String,
    enum: ['zoom', 'google_meet', 'teams', 'webex', 'phone', 'in_person', 'other'],
    default: 'zoom'
  },
  
  // Recurring Events
  recurring: {
    enabled: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly'],
      default: 'weekly'
    },
    interval: { type: Number, default: 1 }, // Every X days/weeks/months
    daysOfWeek: [Number], // 0-6 (Sunday-Saturday)
    endDate: Date,
    occurrences: Number,
    parentEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CalendarEvent'
    }
  },
  
  // Reminders and Notifications
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'popup', 'sms', 'push'],
      default: 'email'
    },
    minutesBefore: {
      type: Number,
      default: 15
    },
    sent: { type: Boolean, default: false },
    sentAt: Date
  }],
  
  // Status and Workflow
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled'],
    default: 'scheduled'
  },
  
  // AI Integration
  aiGenerated: { type: Boolean, default: false },
  aiSuggestions: {
    originalPrompt: String,
    suggestedTitle: String,
    suggestedDescription: String,
    suggestedDuration: Number,
    suggestedAttendees: [String],
    suggestedLocation: String,
    confidenceScore: Number,
    processedAt: Date
  },
  
  // Smart Scheduling
  smartScheduling: {
    enabled: { type: Boolean, default: false },
    preferences: {
      preferredTimeSlots: [{
        dayOfWeek: Number, // 0-6
        startTime: String, // "09:00"
        endTime: String    // "17:00"
      }],
      bufferTime: { type: Number, default: 15 }, // Minutes between meetings
      maxDuration: { type: Number, default: 120 }, // Minutes
      allowWeekends: { type: Boolean, default: false }
    },
    alternatives: [{
      startDate: Date,
      endDate: Date,
      score: Number,
      reason: String
    }]
  },
  
  // External Integration
  externalEvents: {
    googleCalendarId: String,
    outlookEventId: String,
    syncStatus: {
      type: String,
      enum: ['synced', 'pending', 'failed', 'conflict'],
      default: 'pending'
    },
    lastSyncAt: Date
  },
  
  // Event Outcome and Follow-up
  outcome: {
    attended: { type: Boolean },
    notes: String,
    followUpRequired: { type: Boolean, default: false },
    followUpDate: Date,
    rating: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  
  // Attachments and Resources
  attachments: [{
    filename: String,
    url: String,
    size: Number,
    mimeType: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Tags and Metadata
  tags: [String],
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
  // Visibility and Privacy
  visibility: {
    type: String,
    enum: ['public', 'private', 'confidential'],
    default: 'private'
  },
  
  // Event Series (for related events)
  seriesId: String,
  parentEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CalendarEvent'
  },
  childEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CalendarEvent'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
CalendarEventSchema.index({ userId: 1, startDate: 1 });
CalendarEventSchema.index({ startDate: 1, endDate: 1 });
CalendarEventSchema.index({ type: 1, category: 1 });
CalendarEventSchema.index({ status: 1, priority: 1 });
CalendarEventSchema.index({ 'attendees.email': 1 });
CalendarEventSchema.index({ tags: 1 });
CalendarEventSchema.index({ createdAt: -1 });

// Virtual for event duration in minutes
CalendarEventSchema.virtual('durationMinutes').get(function() {
  return Math.round((this.endDate - this.startDate) / (1000 * 60));
});

// Virtual for formatted date range
CalendarEventSchema.virtual('dateRange').get(function() {
  const start = this.startDate.toLocaleString();
  const end = this.endDate.toLocaleString();
  return `${start} - ${end}`;
});

// Virtual for days until event
CalendarEventSchema.virtual('daysUntil').get(function() {
  const now = new Date();
  const diffTime = this.startDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance Methods
CalendarEventSchema.methods.addAttendee = function(attendeeData) {
  this.attendees.push({
    userId: attendeeData.userId,
    email: attendeeData.email,
    name: attendeeData.name,
    role: attendeeData.role || 'attendee',
    status: 'pending'
  });
  return this.save();
};

CalendarEventSchema.methods.updateAttendeeStatus = function(email, status) {
  const attendee = this.attendees.find(a => a.email === email);
  if (attendee) {
    attendee.status = status;
    attendee.responseDate = new Date();
  }
  return this.save();
};

CalendarEventSchema.methods.reschedule = function(newStartDate, newEndDate) {
  this.startDate = newStartDate;
  this.endDate = newEndDate;
  this.status = 'rescheduled';
  
  // Reset attendee responses
  this.attendees.forEach(attendee => {
    attendee.status = 'pending';
    attendee.responseDate = undefined;
  });
  
  return this.save();
};

CalendarEventSchema.methods.cancel = function(reason) {
  this.status = 'cancelled';
  this.outcome = this.outcome || {};
  this.outcome.notes = reason;
  return this.save();
};

CalendarEventSchema.methods.complete = function(outcomeData) {
  this.status = 'completed';
  this.outcome = {
    ...this.outcome,
    ...outcomeData,
    attended: true
  };
  return this.save();
};

// Static Methods
CalendarEventSchema.statics.findUpcoming = function(userId, days = 7) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  return this.find({
    userId: userId,
    startDate: { $gte: startDate, $lte: endDate },
    status: { $in: ['scheduled', 'confirmed'] }
  }).sort({ startDate: 1 });
};

CalendarEventSchema.statics.findByDateRange = function(userId, startDate, endDate) {
  return this.find({
    userId: userId,
    $or: [
      {
        startDate: { $gte: startDate, $lte: endDate }
      },
      {
        endDate: { $gte: startDate, $lte: endDate }
      },
      {
        startDate: { $lte: startDate },
        endDate: { $gte: endDate }
      }
    ]
  }).sort({ startDate: 1 });
};

CalendarEventSchema.statics.findConflicts = function(userId, startDate, endDate, excludeEventId) {
  const query = {
    userId: userId,
    status: { $in: ['scheduled', 'confirmed'] },
    $or: [
      {
        startDate: { $lt: endDate },
        endDate: { $gt: startDate }
      }
    ]
  };
  
  if (excludeEventId) {
    query._id = { $ne: excludeEventId };
  }
  
  return this.find(query);
};

// Pre-save middleware
CalendarEventSchema.pre('save', function(next) {
  // Ensure end date is after start date
  if (this.endDate <= this.startDate) {
    const error = new Error('End date must be after start date');
    return next(error);
  }
  
  // Generate series ID for recurring events
  if (this.recurring.enabled && !this.seriesId) {
    this.seriesId = `series_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  next();
});

// Post-save middleware for notifications
CalendarEventSchema.post('save', function(doc) {
  // Trigger reminder scheduling
  if (doc.reminders && doc.reminders.length > 0) {
    // Schedule reminders (would integrate with notification system)
    console.log(`Scheduling ${doc.reminders.length} reminders for event: ${doc.title}`);
  }
});

module.exports = mongoose.model('CalendarEvent', CalendarEventSchema);