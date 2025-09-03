const mongoose = require('mongoose');

// Email Schema for storing and managing emails
const EmailSchema = new mongoose.Schema({
  // Basic email information
  to: {
    type: String,
    required: true,
    trim: true
  },
  from: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    html: String,
    text: String
  },
  
  // Email status and metadata
  status: {
    type: String,
    enum: ['draft', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked'],
    default: 'draft'
  },
  type: {
    type: String,
    enum: ['welcome', 'payment_confirmation', 'payment_failed', 'subscription_cancelled', 
           'notification', 'marketing', 'support', 'system', 'custom'],
    default: 'custom'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Sender and recipient details
  sender: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    role: {
      type: String,
      enum: ['admin', 'main_admin', 'customer', 'system']
    }
  },
  recipient: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    role: {
      type: String,
      enum: ['admin', 'main_admin', 'customer', 'system']
    }
  },
  
  // Threading and conversation
  threadId: {
    type: String,
    index: true
  },
  inReplyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Email'
  },
  references: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Email'
  }],
  
  // Email tracking
  tracking: {
    sent: {
      timestamp: Date,
      messageId: String,
      provider: String
    },
    delivered: {
      timestamp: Date,
      provider: String
    },
    opened: {
      timestamp: Date,
      userAgent: String,
      ipAddress: String,
      location: String
    },
    clicked: [{
      timestamp: Date,
      url: String,
      userAgent: String,
      ipAddress: String
    }],
    bounced: {
      timestamp: Date,
      reason: String,
      bounceType: String
    }
  },
  
  // Tags and categorization
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    enum: ['inbox', 'sent', 'drafts', 'archive', 'trash', 'spam'],
    default: 'inbox'
  },
  
  // Email flags
  flags: {
    isRead: {
      type: Boolean,
      default: false
    },
    isStarred: {
      type: Boolean,
      default: false
    },
    isImportant: {
      type: Boolean,
      default: false
    },
    hasAttachments: {
      type: Boolean,
      default: false
    }
  },
  
  // Attachments
  attachments: [{
    filename: String,
    size: Number,
    mimeType: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Email template information
  template: {
    name: String,
    version: String,
    variables: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    }
  },
  
  // Scheduling
  scheduledFor: Date,
  
  // Email analytics
  analytics: {
    uniqueOpens: {
      type: Number,
      default: 0
    },
    totalOpens: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    forwards: {
      type: Number,
      default: 0
    },
    replies: {
      type: Number,
      default: 0
    }
  },
  
  // Error information
  error: {
    message: String,
    code: String,
    timestamp: Date,
    retryCount: {
      type: Number,
      default: 0
    }
  },
  
  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
EmailSchema.index({ to: 1, createdAt: -1 });
EmailSchema.index({ from: 1, createdAt: -1 });
EmailSchema.index({ status: 1, createdAt: -1 });
EmailSchema.index({ type: 1, createdAt: -1 });
EmailSchema.index({ 'sender.userId': 1, createdAt: -1 });
EmailSchema.index({ 'recipient.userId': 1, createdAt: -1 });
EmailSchema.index({ threadId: 1, createdAt: 1 });
EmailSchema.index({ category: 1, 'flags.isRead': 1 });
EmailSchema.index({ scheduledFor: 1, status: 1 });

// Virtual for email age
EmailSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Virtual for full sender name
EmailSchema.virtual('senderName').get(function() {
  if (this.sender.name) {
    return this.sender.name;
  }
  return this.from.split('@')[0];
});

// Virtual for full recipient name
EmailSchema.virtual('recipientName').get(function() {
  if (this.recipient.name) {
    return this.recipient.name;
  }
  return this.to.split('@')[0];
});

// Virtual for email preview (first 100 characters of text content)
EmailSchema.virtual('preview').get(function() {
  if (this.content.text) {
    return this.content.text.substring(0, 100) + '...';
  }
  if (this.content.html) {
    // Strip HTML tags for preview
    const textContent = this.content.html.replace(/<[^>]*>/g, '');
    return textContent.substring(0, 100) + '...';
  }
  return '';
});

// Instance methods
EmailSchema.methods.markAsRead = function() {
  this.flags.isRead = true;
  this.analytics.uniqueOpens = Math.max(this.analytics.uniqueOpens, 1);
  this.analytics.totalOpens += 1;
  return this.save();
};

EmailSchema.methods.markAsUnread = function() {
  this.flags.isRead = false;
  return this.save();
};

EmailSchema.methods.addToArchive = function() {
  this.category = 'archive';
  return this.save();
};

EmailSchema.methods.moveToTrash = function() {
  this.category = 'trash';
  return this.save();
};

EmailSchema.methods.addTag = function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return this.save();
  }
  return Promise.resolve(this);
};

EmailSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

EmailSchema.methods.recordOpen = function(userAgent, ipAddress, location) {
  this.tracking.opened = {
    timestamp: new Date(),
    userAgent,
    ipAddress,
    location
  };
  this.status = 'opened';
  this.analytics.totalOpens += 1;
  if (this.analytics.uniqueOpens === 0) {
    this.analytics.uniqueOpens = 1;
  }
  return this.save();
};

EmailSchema.methods.recordClick = function(url, userAgent, ipAddress) {
  this.tracking.clicked.push({
    timestamp: new Date(),
    url,
    userAgent,
    ipAddress
  });
  this.analytics.clicks += 1;
  return this.save();
};

// Static methods
EmailSchema.statics.findInbox = function(userId, limit = 50) {
  return this.find({
    $or: [
      { to: userId },
      { 'recipient.userId': userId }
    ],
    category: 'inbox'
  })
  .populate('sender.userId', 'name email role')
  .populate('recipient.userId', 'name email role')
  .sort({ createdAt: -1 })
  .limit(limit);
};

EmailSchema.statics.findSent = function(userId, limit = 50) {
  return this.find({
    $or: [
      { from: userId },
      { 'sender.userId': userId }
    ],
    category: 'sent'
  })
  .populate('sender.userId', 'name email role')
  .populate('recipient.userId', 'name email role')
  .sort({ createdAt: -1 })
  .limit(limit);
};

EmailSchema.statics.findDrafts = function(userId, limit = 50) {
  return this.find({
    $or: [
      { from: userId },
      { 'sender.userId': userId }
    ],
    status: 'draft',
    category: 'drafts'
  })
  .populate('sender.userId', 'name email role')
  .populate('recipient.userId', 'name email role')
  .sort({ updatedAt: -1 })
  .limit(limit);
};

EmailSchema.statics.findByThread = function(threadId) {
  return this.find({ threadId })
    .populate('sender.userId', 'name email role')
    .populate('recipient.userId', 'name email role')
    .sort({ createdAt: 1 });
};

EmailSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    $or: [
      { to: userId },
      { 'recipient.userId': userId }
    ],
    'flags.isRead': false,
    category: 'inbox'
  });
};

EmailSchema.statics.getEmailStats = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        $or: [
          { 'sender.userId': mongoose.Types.ObjectId(userId) },
          { 'recipient.userId': mongoose.Types.ObjectId(userId) }
        ],
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalEmails: { $sum: 1 },
        sentEmails: {
          $sum: {
            $cond: [{ $eq: ['$sender.userId', mongoose.Types.ObjectId(userId)] }, 1, 0]
          }
        },
        receivedEmails: {
          $sum: {
            $cond: [{ $eq: ['$recipient.userId', mongoose.Types.ObjectId(userId)] }, 1, 0]
          }
        },
        readEmails: {
          $sum: {
            $cond: ['$flags.isRead', 1, 0]
          }
        },
        totalOpens: { $sum: '$analytics.totalOpens' },
        totalClicks: { $sum: '$analytics.clicks' }
      }
    }
  ]);
};

// Pre-save middleware
EmailSchema.pre('save', function(next) {
  // Generate thread ID if not exists
  if (!this.threadId) {
    this.threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Set category based on status for new emails
  if (this.isNew) {
    if (this.status === 'draft') {
      this.category = 'drafts';
    } else if (this.status === 'sent') {
      this.category = 'sent';
    }
  }
  
  next();
});

// Post-save middleware for analytics
EmailSchema.post('save', function(doc) {
  // Update email analytics asynchronously
  if (doc.status === 'sent' && doc.tracking.sent) {
    // Could trigger analytics updates here
  }
});

module.exports = mongoose.model('Email', EmailSchema);