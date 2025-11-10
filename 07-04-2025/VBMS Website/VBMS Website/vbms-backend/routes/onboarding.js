const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Business = require('../models/Business');
const Onboarding = require('../models/Onboarding');
const Subscription = require('../models/Subscription');
const { authenticateToken } = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const emailService = require('../services/emailService');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme123';

// Enhanced onboarding endpoint with user creation and business setup
router.post('/complete', 
  ValidationMiddleware.validateOnboarding(),
  async (req, res) => {
  try {
    const {
      // User data
      ownerName,
      email,
      password,
      // Business data
      bizName,
      bizType,
      industry,
      teamSize,
      hours,
      cameraCount,
      callSupport,
      features,
      platforms,
      notes,
      // Subscription selection
      selectedPackage,
      profilePhoto
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user account
    const user = new User({
      name: ownerName,
      email: email,
      password: password,
      role: 'customer',
      status: 'active',
      profile: {
        photo: profilePhoto || '',
        preferences: {
          notifications: true,
          darkMode: false,
          language: 'en'
        }
      },
      onboarding: {
        completed: true,
        currentStep: 3,
        wizardData: {
          businessInfo: {
            bizName,
            bizType,
            industry,
            teamSize,
            hours,
            cameraCount
          },
          preferences: {
            callSupport,
            features,
            platforms,
            notes
          }
        }
      }
    });

    await user.save();

    // Create business profile
    const business = new Business({
      customerId: user._id,
      businessName: bizName,
      businessType: bizType,
      industry: industry,
      teamSize: teamSize,
      operatingHours: hours,
      infrastructure: {
        cameraCount: cameraCount,
        callSupportNeeded: callSupport === 'yes'
      },
      features: features || [],
      platforms: platforms,
      notes: notes,
      status: 'active'
    });

    await business.save();

    // Link business to user
    user.business = business._id;
    await user.save();

    // Save to legacy onboarding collection for compatibility
    const onboardingRecord = new Onboarding({
      bizName,
      bizType,
      ownerName,
      email,
      teamSize,
      hours,
      cameraCount,
      callSupport,
      industry,
      features,
      platforms,
      notes,
      profilePhoto,
      userId: user._id
    });

    await onboardingRecord.save();

    // Send welcome email
    await emailService.sendWelcomeEmail(user);
    
    // Send admin notification
    await emailService.sendAdminNewSignupNotification(user, { packageName: selectedPackage || 'Free Trial', price: { monthly: 0 } });

    // Generate JWT token for immediate login
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        name: user.name, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Onboarding completed successfully',
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: business._id
      },
      business: {
        id: business._id,
        name: business.businessName,
        type: business.businessType,
        industry: business.industry
      },
      redirectTo: selectedPackage ? '/billing.html' : '/customer-dashboard.html'
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ 
      error: 'Onboarding failed', 
      details: error.message 
    });
  }
});

// Get onboarding progress for authenticated user
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('business');
    
    res.json({
      completed: user.onboarding.completed,
      currentStep: user.onboarding.currentStep,
      wizardData: user.onboarding.wizardData,
      hasSubscription: !!user.subscription,
      business: user.business
    });

  } catch (error) {
    console.error('Error fetching onboarding progress:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding progress' });
  }
});

// Update onboarding step for authenticated user
router.put('/step', authenticateToken, async (req, res) => {
  try {
    const { step, data } = req.body;
    
    const user = await User.findById(req.user.id);
    user.onboarding.currentStep = step;
    
    if (data) {
      user.onboarding.wizardData = {
        ...user.onboarding.wizardData,
        ...data
      };
    }
    
    await user.save();
    
    res.json({ 
      success: true, 
      currentStep: user.onboarding.currentStep 
    });

  } catch (error) {
    console.error('Error updating onboarding step:', error);
    res.status(500).json({ error: 'Failed to update onboarding step' });
  }
});

// Legacy endpoint for compatibility
router.post('/', async (req, res) => {
  try {
    const data = req.body;
    const record = await Onboarding.create(data);
    res.json({ 
      message: "Onboarding received", 
      record,
      success: true
    });
  } catch (error) {
    console.error('Legacy onboarding save error:', error);
    res.status(500).json({ error: "Failed to save onboarding data." });
  }
});

module.exports = router;