const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true
  },
  item: {
    name: { type: String, required: true },
    description: String,
    sku: { type: String, required: true },
    barcode: String,
    category: { type: String, required: true },
    subcategory: String
  },
  pricing: {
    cost: { type: Number, required: true }, // What you pay
    price: { type: Number, required: true }, // What you charge
    margin: { type: Number, default: 0 } // Calculated profit margin
  },
  stock: {
    current: { type: Number, required: true, min: 0 },
    reserved: { type: Number, default: 0 }, // Items in pending orders
    available: { type: Number, default: 0 }, // current - reserved
    minimum: { type: Number, default: 5 }, // Reorder threshold
    maximum: { type: Number, default: 100 }
  },
  tracking: {
    unit: { 
      type: String, 
      enum: ['piece', 'lb', 'oz', 'kg', 'g', 'box', 'case', 'gallon', 'liter'],
      default: 'piece'
    },
    location: String, // Where it's stored
    supplier: String,
    lastOrdered: Date,
    lastReceived: Date,
    expirationDate: Date
  },
  alerts: {
    lowStock: { type: Boolean, default: false },
    outOfStock: { type: Boolean, default: false },
    expiringSoon: { type: Boolean, default: false },
    overstock: { type: Boolean, default: false }
  },
  sales: {
    totalSold: { type: Number, default: 0 },
    lastSold: Date,
    popularityScore: { type: Number, default: 0 } // Based on sales frequency
  },
  status: {
    type: String,
    enum: ['active', 'discontinued', 'seasonal', 'out_of_stock'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Calculate available stock and alerts
inventorySchema.pre('save', function(next) {
  this.stock.available = this.stock.current - this.stock.reserved;
  this.pricing.margin = ((this.pricing.price - this.pricing.cost) / this.pricing.cost) * 100;
  
  // Set alerts
  this.alerts.lowStock = this.stock.available <= this.stock.minimum;
  this.alerts.outOfStock = this.stock.available <= 0;
  this.alerts.overstock = this.stock.current >= this.stock.maximum;
  
  // Check expiration (within 7 days)
  if (this.tracking.expirationDate) {
    const daysUntilExpiration = (this.tracking.expirationDate - new Date()) / (1000 * 60 * 60 * 24);
    this.alerts.expiringSoon = daysUntilExpiration <= 7 && daysUntilExpiration > 0;
  }
  
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);