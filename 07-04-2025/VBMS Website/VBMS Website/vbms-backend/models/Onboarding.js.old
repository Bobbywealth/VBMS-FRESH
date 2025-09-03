const mongoose = require('mongoose');

const OnboardingSchema = new mongoose.Schema({
  bizName: String,
  bizType: String,
  ownerName: String,
  email: String,
  teamSize: Number,
  hours: String,
  cameraCount: Number,
  callSupport: String,
  industry: String,
  features: [String],
  platforms: String,
  notes: String,
  profilePhoto: String, // Path or URL to profile photo
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Onboarding', OnboardingSchema);
