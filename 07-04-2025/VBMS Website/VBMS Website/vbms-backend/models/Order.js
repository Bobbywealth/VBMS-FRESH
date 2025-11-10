const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  orderInfo: {
    orderId: { type: String, required: true, unique: true },
    externalId: String, // For Uber Eats, Clover, etc.
    source: { 
      type: String, 
      enum: ['website', 'phone', 'uber_eats', 'walk_in', 'clover', 'manual'],
      default: 'manual'
    },
    type: {
      type: String,
      enum: ['delivery', 'pickup', 'dine_in', 'service'],
      default: 'pickup'
    }
  },
  customer: {
    name: String,
    phone: String,
    email: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    }
  },
  items: [{
    name: { type: String, required: true },
    description: String,
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    total: { type: Number, required: true },
    modifiers: [{
      name: String,
      price: Number
    }],
    sku: String,
    category: String
  }],
  pricing: {
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    tip: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
    updatedBy: String
  }],
  timing: {
    orderTime: { type: Date, default: Date.now },
    estimatedTime: Date,
    actualTime: Date,
    deliveryTime: Date
  },
  payment: {
    method: String,
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    amount: Number
  },
  notes: {
    customer: String,
    internal: String,
    delivery: String
  }
}, {
  timestamps: true
});

// Generate unique order ID
orderSchema.pre('save', async function(next) {
  if (!this.orderInfo.orderId) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({}) + 1;
    this.orderInfo.orderId = `VBMS-${year}-${count.toString().padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);