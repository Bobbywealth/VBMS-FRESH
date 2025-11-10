const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Report Configuration
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    required: true,
    enum: [
      'sales', 'inventory', 'financial', 'customer', 'performance',
      'analytics', 'custom', 'dashboard', 'audit', 'compliance'
    ]
  },
  category: {
    type: String,
    enum: ['operational', 'financial', 'marketing', 'hr', 'compliance', 'custom'],
    default: 'operational'
  },
  
  // Report Parameters
  parameters: {
    dateRange: {
      start: Date,
      end: Date,
      period: {
        type: String,
        enum: ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'this_quarter', 'last_quarter', 'this_year', 'last_year', 'custom'],
        default: 'last_30_days'
      }
    },
    filters: [{
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'between', 'in', 'not_in'],
        default: 'equals'
      },
      value: mongoose.Schema.Types.Mixed
    }],
    grouping: [{
      field: String,
      order: {
        type: String,
        enum: ['asc', 'desc'],
        default: 'asc'
      }
    }],
    sorting: [{
      field: String,
      direction: {
        type: String,
        enum: ['asc', 'desc'],
        default: 'desc'
      }
    }],
    limit: {
      type: Number,
      min: 1,
      max: 10000,
      default: 100
    }
  },
  
  // Data Sources
  dataSources: [{
    collectionName: {
      type: String,
      required: true,
      enum: ['users', 'inventoryitems', 'inventorytransactions', 'vapicalls', 'subscriptions', 'payments', 'tasks', 'orders']
    },
    fields: [String],
    joins: [{
      collectionName: String,
      localField: String,
      foreignField: String,
      as: String
    }]
  }],
  
  // Report Layout and Formatting
  layout: {
    format: {
      type: String,
      enum: ['table', 'chart', 'summary', 'detailed', 'pivot', 'dashboard'],
      default: 'table'
    },
    chartType: {
      type: String,
      enum: ['bar', 'line', 'pie', 'doughnut', 'area', 'scatter', 'radar'],
      default: 'bar'
    },
    columns: [{
      field: String,
      title: String,
      type: {
        type: String,
        enum: ['string', 'number', 'date', 'currency', 'percentage', 'boolean'],
        default: 'string'
      },
      format: String,
      width: Number,
      sortable: {
        type: Boolean,
        default: true
      },
      visible: {
        type: Boolean,
        default: true
      }
    }],
    summary: [{
      field: String,
      function: {
        type: String,
        enum: ['sum', 'avg', 'count', 'min', 'max', 'median', 'distinct_count'],
        default: 'sum'
      },
      title: String
    }]
  },
  
  // Scheduling and Automation
  schedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly'],
      default: 'weekly'
    },
    time: {
      type: String, // Format: "HH:MM"
      default: '09:00'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    recipients: [{
      email: String,
      name: String
    }],
    lastRun: Date,
    nextRun: Date
  },
  
  // Report Execution
  execution: {
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending'
    },
    lastRun: Date,
    duration: Number, // milliseconds
    recordCount: Number,
    errorMessage: String,
    outputSize: Number // bytes
  },
  
  // Access Control
  access: {
    isPublic: {
      type: Boolean,
      default: false
    },
    sharedWith: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      permissions: {
        type: String,
        enum: ['view', 'edit', 'admin'],
        default: 'view'
      }
    }],
    password: String // For password-protected reports
  },
  
  // Report Output
  output: {
    formats: [{
      type: String,
      enum: ['pdf', 'excel', 'csv', 'json', 'html'],
      default: 'pdf'
    }],
    storage: {
      enabled: {
        type: Boolean,
        default: true
      },
      path: String,
      retention: {
        type: Number, // days
        default: 30
      }
    }
  },
  
  // Metadata
  tags: [String],
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  },
  version: {
    type: Number,
    default: 1
  },
  
  // Usage Statistics
  stats: {
    viewCount: {
      type: Number,
      default: 0
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    },
    lastViewed: Date,
    avgExecutionTime: Number
  }
}, {
  timestamps: true,
  suppressReservedKeysWarning: true
});

// Indexes for efficient queries
reportSchema.index({ customerId: 1, type: 1 });
reportSchema.index({ customerId: 1, createdAt: -1 });
reportSchema.index({ 'schedule.enabled': 1, 'schedule.nextRun': 1 });
reportSchema.index({ isTemplate: 1, type: 1 });
reportSchema.index({ tags: 1 });

// Virtual for formatted execution duration
reportSchema.virtual('formattedDuration').get(function() {
  if (!this.execution.duration) return '0ms';
  
  const ms = this.execution.duration;
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
});

// Method to calculate next run time
reportSchema.methods.calculateNextRun = function() {
  if (!this.schedule.enabled) return null;
  
  const now = new Date();
  const [hours, minutes] = this.schedule.time.split(':').map(Number);
  let nextRun = new Date(now);
  
  nextRun.setHours(hours, minutes, 0, 0);
  
  // If time has passed today, schedule for next occurrence
  if (nextRun <= now) {
    switch (this.schedule.frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
      case 'quarterly':
        nextRun.setMonth(nextRun.getMonth() + 3);
        break;
    }
  }
  
  this.schedule.nextRun = nextRun;
  return nextRun;
};

// Method to increment view count
reportSchema.methods.incrementViewCount = function() {
  this.stats.viewCount += 1;
  this.stats.lastViewed = new Date();
  return this.save();
};

// Static method to get popular reports
reportSchema.statics.getPopularReports = function(customerId, limit = 10) {
  return this.find({ customerId })
    .sort({ 'stats.viewCount': -1 })
    .limit(limit)
    .select('name type stats createdAt');
};

// Pre-save middleware
reportSchema.pre('save', function(next) {
  // Calculate next run if schedule is enabled
  if (this.schedule.enabled && this.isModified('schedule')) {
    this.calculateNextRun();
  }
  
  // Update version if report structure changed
  if (this.isModified('dataSources') || this.isModified('parameters') || this.isModified('layout')) {
    this.version += 1;
  }
  
  next();
});

module.exports = mongoose.model('Report', reportSchema);