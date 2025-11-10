const mongoose = require('mongoose');

// Notification Schema for real-time notifications across the system
const NotificationSchema = new mongoose.Schema({
  // Basic notification information
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: [
      'email', 'order', 'payment', 'system', 'user', 'security', 
      'inventory', 'task', 'calendar', 'ai_phone', 'support',
      'welcome', 'alert', 'warning', 'info', 'success', 'error'
    ],
    required: true
  },
  
  // Recipient information
  recipient: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'main_admin', 'customer', 'all'],
      required: true
    }
  },
  
  // Sender information (optional - can be system generated)
  sender: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    role: String,
    isSystem: {
      type: Boolean,
      default: false
    }
  },
  
  // Notification properties
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent', 'critical'],
    default: 'normal'
  },
  category: {
    type: String,
    enum: [
      'business', 'financial', 'technical', 'marketing', 
      'communication', 'security', 'maintenance'
    ],
    default: 'business'
  },
  
  // Status and interaction
  status: {
    type: String,
    enum: ['unread', 'read', 'archived', 'dismissed'],
    default: 'unread'
  },
  readAt: Date,
  
  // Action and navigation
  action: {
    type: {
      type: String,
      enum: ['navigate', 'modal', 'external', 'api_call', 'none'],
      default: 'none'
    },
    url: String,
    params: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },
  
  // Rich content
  content: {
    html: String,
    buttons: [{
      text: String,
      action: String,
      style: {
        type: String,
        enum: ['primary', 'secondary', 'success', 'danger', 'warning', 'info'],
        default: 'primary'
      }
    }],
    image: String,
    icon: String,
    color: String
  },
  
  // Sound and visual settings
  sound: {
    enabled: {
      type: Boolean,
      default: true
    },
    type: {
      type: String,
      enum: [
        'default', 'email', 'order', 'payment', 'alert', 'success', 
        'error', 'warning', 'urgent', 'gentle', 'notification'
      ],
      default: 'default'
    },
    volume: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    }
  },
  
  // Display settings
  display: {
    toast: {
      type: Boolean,
      default: true
    },
    position: {
      type: String,
      enum: ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'center'],
      default: 'top-right'
    },
    duration: {
      type: Number,
      default: 5000 // milliseconds
    },
    persistent: {
      type: Boolean,
      default: false
    }
  },
  
  // Scheduling and expiration
  scheduledFor: Date,
  expiresAt: Date,
  
  // Related data
  relatedTo: {
    type: {
      type: String,
      enum: ['email', 'order', 'payment', 'user', 'task', 'inventory', 'system']
    },
    id: mongoose.Schema.Types.ObjectId,
    collectionName: String
  },
  
  // Delivery tracking
  delivery: {
    attempts: {
      type: Number,
      default: 0
    },
    delivered: {
      type: Boolean,
      default: false
    },
    deliveredAt: Date,
    failureReason: String
  },
  
  // Metadata and tags
  tags: [{
    type: String,
    trim: true
  }],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  suppressReservedKeysWarning: true
});

// Indexes for performance
NotificationSchema.index({ 'recipient.userId': 1, createdAt: -1 });
NotificationSchema.index({ 'recipient.role': 1, createdAt: -1 });
NotificationSchema.index({ status: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, priority: 1 });
NotificationSchema.index({ scheduledFor: 1, status: 1 });
NotificationSchema.index({ expiresAt: 1 });
NotificationSchema.index({ 'relatedTo.type': 1, 'relatedTo.id': 1 });

// Virtual for notification age
NotificationSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Virtual for is urgent
NotificationSchema.virtual('isUrgent').get(function() {
  return ['urgent', 'critical'].includes(this.priority);
});

// Virtual for should play sound
NotificationSchema.virtual('shouldPlaySound').get(function() {
  return this.sound.enabled && this.status === 'unread';
});

// Instance methods
NotificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

NotificationSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

NotificationSchema.methods.dismiss = function() {
  this.status = 'dismissed';
  return this.save();
};

NotificationSchema.methods.markAsDelivered = function() {
  this.delivery.delivered = true;
  this.delivery.deliveredAt = new Date();
  return this.save();
};

NotificationSchema.methods.incrementDeliveryAttempt = function(reason = null) {
  this.delivery.attempts += 1;
  if (reason) {
    this.delivery.failureReason = reason;
  }
  return this.save();
};

NotificationSchema.methods.toClientFormat = function() {
  return {
    id: this._id,
    title: this.title,
    message: this.message,
    type: this.type,
    priority: this.priority,
    status: this.status,
    createdAt: this.createdAt,
    readAt: this.readAt,
    action: this.action,
    content: this.content,
    sound: this.sound,
    display: this.display,
    isUrgent: this.isUrgent,
    shouldPlaySound: this.shouldPlaySound,
    age: this.age,
    tags: this.tags
  };
};

// Static methods
NotificationSchema.statics.findUnreadForUser = function(userId, limit = 50) {
  return this.find({
    'recipient.userId': userId,
    status: 'unread',
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  })
  .populate('sender.userId', 'name email role')
  .sort({ priority: -1, createdAt: -1 })
  .limit(limit);
};

NotificationSchema.statics.findForUser = function(userId, options = {}) {
  const {
    status,
    type,
    priority,
    limit = 50,
    page = 1,
    includeExpired = false
  } = options;
  
  const query = {
    'recipient.userId': userId
  };
  
  if (status) {
    query.status = status;
  }
  
  if (type) {
    query.type = type;
  }
  
  if (priority) {
    query.priority = priority;
  }
  
  if (!includeExpired) {
    query.$or = [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ];
  }
  
  return this.find(query)
    .populate('sender.userId', 'name email role')
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

NotificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    'recipient.userId': userId,
    status: 'unread',
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

NotificationSchema.statics.createSystemNotification = function(data) {
  return this.create({
    ...data,
    sender: {
      isSystem: true,
      name: 'VBMS System',
      role: 'system'
    }
  });
};

NotificationSchema.statics.createBulkNotification = function(userIds, notificationData) {
  const notifications = userIds.map(userId => ({
    ...notificationData,
    recipient: {
      userId: userId,
      role: notificationData.recipient?.role || 'customer'
    }
  }));
  
  return this.insertMany(notifications);
};

NotificationSchema.statics.findScheduled = function() {
  return this.find({
    scheduledFor: { $lte: new Date() },
    status: 'unread',
    'delivery.delivered': false
  });
};

NotificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
    status: { $in: ['read', 'dismissed', 'archived'] }
  });
};

NotificationSchema.statics.getStats = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        'recipient.userId': mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: {
          $sum: {
            $cond: [{ $eq: ['$status', 'unread'] }, 1, 0]
          }
        },
        byType: {
          $push: {
            type: '$type',
            priority: '$priority'
          }
        }
      }
    }
  ]);
};

// Pre-save middleware
NotificationSchema.pre('save', function(next) {
  // Set expiration if not set and notification is not persistent
  if (!this.expiresAt && !this.display.persistent) {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 30); // Default 30 days
    this.expiresAt = expiration;
  }
  
  // Set default sound type based on notification type
  if (!this.sound.type || this.sound.type === 'default') {
    const soundMap = {
      email: 'email',
      order: 'order',
      payment: 'payment',
      alert: 'alert',
      warning: 'warning',
      error: 'error',
      success: 'success',
      system: 'notification'
    };
    
    this.sound.type = soundMap[this.type] || 'notification';
  }
  
  // Set default icon based on type
  if (!this.content.icon) {
    const iconMap = {
      email: 'bi-envelope',
      order: 'bi-box',
      payment: 'bi-credit-card',
      system: 'bi-gear',
      user: 'bi-person',
      security: 'bi-shield',
      inventory: 'bi-stack',
      task: 'bi-check-circle',
      calendar: 'bi-calendar',
      ai_phone: 'bi-telephone',
      support: 'bi-headset',
      welcome: 'bi-hand-thumbs-up',
      alert: 'bi-exclamation-triangle',
      warning: 'bi-exclamation-triangle',
      info: 'bi-info-circle',
      success: 'bi-check-circle',
      error: 'bi-x-circle'
    };
    
    this.content.icon = iconMap[this.type] || 'bi-bell';
  }
  
  next();
});

// Post-save middleware for real-time delivery
NotificationSchema.post('save', function(doc) {
  // Emit real-time notification via WebSocket if available
  if (global.io && doc.status === 'unread') {
    global.io.to(`user_${doc.recipient.userId}`).emit('notification', doc.toClientFormat());
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);