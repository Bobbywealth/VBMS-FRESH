const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true,
    index: true
  },
  
  // Transaction Details
  type: {
    type: String,
    required: true,
    enum: [
      'stock_in',          // Receiving inventory
      'stock_out',         // Selling/using inventory
      'adjustment',        // Manual adjustments
      'transfer',          // Location transfers
      'return',            // Customer returns
      'damage',            // Damaged goods
      'theft',             // Theft/loss
      'expired',           // Expired goods
      'promotion',         // Promotional usage
      'sample',            // Sample usage
      'correction'         // Error corrections
    ]
  },
  
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Before/After quantities for audit trail
  beforeQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  afterQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Transaction Context
  reason: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Reference Information
  referenceType: {
    type: String,
    enum: ['order', 'purchase', 'transfer', 'adjustment', 'return', 'other']
  },
  referenceId: String, // Order ID, Purchase ID, etc.
  
  // Location Information
  location: {
    from: {
      warehouse: String,
      zone: String,
      aisle: String,
      shelf: String,
      bin: String
    },
    to: {
      warehouse: String,
      zone: String,
      aisle: String,
      shelf: String,
      bin: String
    }
  },
  
  // Financial Information
  unitCost: {
    type: Number,
    min: 0,
    default: 0
  },
  totalCost: {
    type: Number,
    min: 0,
    default: 0
  },
  unitPrice: {
    type: Number,
    min: 0,
    default: 0
  },
  totalPrice: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // User and System Information
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  performedByName: String,
  
  // Supplier Information (for stock_in transactions)
  supplier: {
    name: String,
    contactInfo: String,
    invoiceNumber: String,
    deliveryDate: Date
  },
  
  // Customer Information (for stock_out transactions)
  customer: {
    name: String,
    email: String,
    phone: String,
    orderId: String
  },
  
  // Additional Metadata
  notes: String,
  attachments: [{
    filename: String,
    url: String,
    type: String // 'receipt', 'invoice', 'photo', etc.
  }],
  
  // Batch/Lot Information
  batch: {
    number: String,
    expirationDate: Date,
    manufacturingDate: Date
  },
  
  // System Tracking
  ipAddress: String,
  userAgent: String,
  automaticTransaction: {
    type: Boolean,
    default: false
  },
  
  // Approval Workflow
  requiresApproval: {
    type: Boolean,
    default: false
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String
}, {
  timestamps: true
});

// Indexes for efficient queries
inventoryTransactionSchema.index({ customerId: 1, createdAt: -1 });
inventoryTransactionSchema.index({ itemId: 1, createdAt: -1 });
inventoryTransactionSchema.index({ type: 1, createdAt: -1 });
inventoryTransactionSchema.index({ referenceId: 1 });
inventoryTransactionSchema.index({ performedBy: 1, createdAt: -1 });

// Pre-save middleware to calculate totals
inventoryTransactionSchema.pre('save', function(next) {
  if (this.unitCost && this.quantity) {
    this.totalCost = this.unitCost * this.quantity;
  }
  
  if (this.unitPrice && this.quantity) {
    this.totalPrice = this.unitPrice * this.quantity;
  }
  
  next();
});

// Virtual for profit/loss calculation
inventoryTransactionSchema.virtual('profitLoss').get(function() {
  if (this.totalPrice && this.totalCost) {
    return this.totalPrice - this.totalCost;
  }
  return 0;
});

// Static methods for analytics
inventoryTransactionSchema.statics.getTransactionsByPeriod = function(customerId, startDate, endDate, type = null) {
  const query = {
    customerId: customerId,
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (type) {
    query.type = type;
  }
  
  return this.find(query).populate('itemId', 'name sku category').sort({ createdAt: -1 });
};

inventoryTransactionSchema.statics.getInventoryValueChange = function(customerId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        customerId: mongoose.Types.ObjectId(customerId),
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$type',
        totalValue: { $sum: '$totalCost' },
        totalQuantity: { $sum: '$quantity' },
        count: { $sum: 1 }
      }
    }
  ]);
};

inventoryTransactionSchema.statics.getTopMovingItems = function(customerId, startDate, endDate, limit = 10) {
  return this.aggregate([
    {
      $match: {
        customerId: mongoose.Types.ObjectId(customerId),
        createdAt: { $gte: startDate, $lte: endDate },
        type: { $in: ['stock_out', 'stock_in'] }
      }
    },
    {
      $group: {
        _id: '$itemId',
        totalMovement: { $sum: '$quantity' },
        stockOut: {
          $sum: {
            $cond: [{ $eq: ['$type', 'stock_out'] }, '$quantity', 0]
          }
        },
        stockIn: {
          $sum: {
            $cond: [{ $eq: ['$type', 'stock_in'] }, '$quantity', 0]
          }
        },
        transactionCount: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'inventoryitems',
        localField: '_id',
        foreignField: '_id',
        as: 'item'
      }
    },
    {
      $unwind: '$item'
    },
    {
      $sort: { totalMovement: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Method to reverse a transaction (for corrections)
inventoryTransactionSchema.methods.reverse = async function(reason) {
  const InventoryItem = require('./InventoryItem');
  const item = await InventoryItem.findById(this.itemId);
  
  if (!item) {
    throw new Error('Item not found');
  }
  
  // Create reverse transaction
  const reverseTransaction = new this.constructor({
    customerId: this.customerId,
    itemId: this.itemId,
    type: this.type === 'stock_in' ? 'stock_out' : 'stock_in',
    quantity: this.quantity,
    beforeQuantity: item.quantity.current,
    afterQuantity: this.type === 'stock_in' ? 
      item.quantity.current - this.quantity : 
      item.quantity.current + this.quantity,
    reason: `Reversal: ${reason}`,
    referenceType: 'correction',
    referenceId: this._id.toString(),
    performedBy: this.performedBy,
    unitCost: this.unitCost,
    unitPrice: this.unitPrice
  });
  
  // Adjust item quantity
  const adjustment = this.type === 'stock_in' ? -this.quantity : this.quantity;
  await item.adjustQuantity(adjustment, `Reversal: ${reason}`);
  
  return await reverseTransaction.save();
};

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);