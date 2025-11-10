const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business'
  },
  
  // Basic Item Information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  sku: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    index: true
  },
  barcode: {
    type: String,
    trim: true,
    index: true
  },
  
  // Categories and Classification
  category: {
    type: String,
    required: true,
    enum: [
      'electronics', 'clothing', 'food', 'beverages', 'supplies', 
      'equipment', 'furniture', 'accessories', 'raw_materials', 
      'finished_goods', 'services', 'other'
    ],
    default: 'other'
  },
  subcategory: {
    type: String,
    trim: true
  },
  tags: [String],
  
  // Inventory Tracking
  quantity: {
    current: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    reserved: {
      type: Number,
      min: 0,
      default: 0
    },
    available: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  
  // Stock Levels and Thresholds
  stockLevels: {
    minimum: {
      type: Number,
      min: 0,
      default: 0
    },
    maximum: {
      type: Number,
      min: 0,
      default: 1000
    },
    reorderPoint: {
      type: Number,
      min: 0,
      default: 10
    },
    reorderQuantity: {
      type: Number,
      min: 0,
      default: 50
    }
  },
  
  // Pricing Information
  pricing: {
    cost: {
      type: Number,
      min: 0,
      default: 0
    },
    sellingPrice: {
      type: Number,
      min: 0,
      default: 0
    },
    wholesalePrice: {
      type: Number,
      min: 0,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  
  // Physical Properties
  specifications: {
    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ['g', 'kg', 'lb', 'oz'],
        default: 'kg'
      }
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: {
        type: String,
        enum: ['mm', 'cm', 'm', 'in', 'ft'],
        default: 'cm'
      }
    },
    volume: {
      value: Number,
      unit: {
        type: String,
        enum: ['ml', 'l', 'gal', 'qt'],
        default: 'l'
      }
    }
  },
  
  // Supplier Information
  suppliers: [{
    name: {
      type: String,
      required: true
    },
    contactInfo: {
      email: String,
      phone: String,
      address: String
    },
    leadTime: {
      type: Number, // days
      default: 7
    },
    minimumOrderQuantity: {
      type: Number,
      default: 1
    },
    cost: {
      type: Number,
      min: 0
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Location and Storage
  locations: [{
    warehouse: {
      type: String,
      default: 'Main'
    },
    zone: String,
    aisle: String,
    shelf: String,
    bin: String,
    quantity: {
      type: Number,
      min: 0,
      default: 0
    }
  }],
  
  // Status and Flags
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued', 'out_of_stock'],
    default: 'active'
  },
  isPerishable: {
    type: Boolean,
    default: false
  },
  expirationDate: Date,
  
  // Images and Media
  images: [{
    url: String,
    caption: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Tracking and Analytics
  analytics: {
    totalSold: {
      type: Number,
      default: 0
    },
    totalReceived: {
      type: Number,
      default: 0
    },
    averageSalesPerMonth: {
      type: Number,
      default: 0
    },
    lastSoldDate: Date,
    lastRestockedDate: Date,
    turnoverRate: {
      type: Number,
      default: 0
    }
  },
  
  // Alerts and Notifications
  alerts: {
    lowStock: {
      type: Boolean,
      default: true
    },
    outOfStock: {
      type: Boolean,
      default: true
    },
    expiringSoon: {
      type: Boolean,
      default: true
    },
    overstock: {
      type: Boolean,
      default: false
    }
  },
  
  // Additional Metadata
  notes: String,
  customFields: [{
    name: String,
    value: mongoose.Schema.Types.Mixed,
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'boolean'],
      default: 'text'
    }
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
inventoryItemSchema.index({ customerId: 1, sku: 1 }, { unique: true });
inventoryItemSchema.index({ customerId: 1, category: 1 });
inventoryItemSchema.index({ customerId: 1, status: 1 });
inventoryItemSchema.index({ customerId: 1, 'quantity.current': 1 });
inventoryItemSchema.index({ barcode: 1 });
inventoryItemSchema.index({ 'stockLevels.reorderPoint': 1, 'quantity.current': 1 });

// Virtual for available quantity calculation
inventoryItemSchema.virtual('availableQuantity').get(function() {
  return Math.max(0, this.quantity.current - this.quantity.reserved);
});

// Virtual for stock status
inventoryItemSchema.virtual('stockStatus').get(function() {
  const available = this.availableQuantity;
  if (available === 0) return 'out_of_stock';
  if (available <= this.stockLevels.reorderPoint) return 'low_stock';
  if (available >= this.stockLevels.maximum) return 'overstock';
  return 'in_stock';
});

// Virtual for profit margin
inventoryItemSchema.virtual('profitMargin').get(function() {
  if (!this.pricing.cost || !this.pricing.sellingPrice) return 0;
  return ((this.pricing.sellingPrice - this.pricing.cost) / this.pricing.sellingPrice * 100);
});

// Pre-save middleware to update available quantity
inventoryItemSchema.pre('save', function(next) {
  this.quantity.available = Math.max(0, this.quantity.current - this.quantity.reserved);
  
  // Update analytics
  if (this.quantity.current <= this.stockLevels.reorderPoint) {
    this.alerts.lowStock = true;
  }
  
  if (this.quantity.current === 0) {
    this.status = 'out_of_stock';
    this.alerts.outOfStock = true;
  } else if (this.status === 'out_of_stock' && this.quantity.current > 0) {
    this.status = 'active';
  }
  
  next();
});

// Methods
inventoryItemSchema.methods.adjustQuantity = function(adjustment, reason = 'manual_adjustment') {
  const oldQuantity = this.quantity.current;
  this.quantity.current = Math.max(0, this.quantity.current + adjustment);
  
  // Log the transaction
  const InventoryTransaction = require('./InventoryTransaction');
  const transaction = new InventoryTransaction({
    itemId: this._id,
    customerId: this.customerId,
    type: adjustment > 0 ? 'stock_in' : 'stock_out',
    quantity: Math.abs(adjustment),
    reason: reason,
    beforeQuantity: oldQuantity,
    afterQuantity: this.quantity.current
  });
  
  transaction.save().catch(console.error);
  
  return this.save();
};

inventoryItemSchema.methods.reserve = function(quantity) {
  if (this.availableQuantity >= quantity) {
    this.quantity.reserved += quantity;
    return this.save();
  }
  throw new Error('Insufficient available quantity');
};

inventoryItemSchema.methods.release = function(quantity) {
  this.quantity.reserved = Math.max(0, this.quantity.reserved - quantity);
  return this.save();
};

inventoryItemSchema.methods.getPrimarySupplier = function() {
  return this.suppliers.find(supplier => supplier.isPrimary) || this.suppliers[0];
};

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);