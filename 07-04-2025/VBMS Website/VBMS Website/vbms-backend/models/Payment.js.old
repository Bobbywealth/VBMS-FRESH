const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: { type: String },
  amount: { type: Number, required: true },
  stripePaymentId: { type: String, required: true, unique: true },
  status: { type: String },
  metadata: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', PaymentSchema); 