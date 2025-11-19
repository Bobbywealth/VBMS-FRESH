const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');
const emailService = require('../services/emailService');
const jwt = require('jsonwebtoken');
const { pgPool } = require('../config/database');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod';

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

      const client = await pgPool.connect();

      // Check if user already exists
      const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (userCheck.rows.length > 0) {
        client.release();
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user account
      const firstName = ownerName?.split(' ')[0] || ownerName;
      const lastName = ownerName?.split(' ').slice(1).join(' ') || '';

      const newUserResult = await client.query(`
      INSERT INTO users (first_name, last_name, email, password, role, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'customer', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, email, first_name, last_name, role
    `, [firstName, lastName, email, hashedPassword]);

      const user = newUserResult.rows[0];

      // Create business profile / settings
      // We'll store this in user_settings table as established in settings.js
      // We might need to add columns if they don't exist, but for now we map what we can
      // Assuming user_settings has columns for business info. 
      // If not, we might lose some data or need to store in a JSONB column if available.
      // Let's assume we can store basic info and maybe put the rest in 'business_description' or similar for now if schema is limited.

      // Ideally we'd have a 'businesses' table. Let's try to insert into 'user_settings' first.
      await client.query(`
      INSERT INTO user_settings (
        user_id, 
        business_name, 
        business_description, 
        logo_url,
        updated_at
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    `, [
        user.id,
        bizName,
        `Type: ${bizType}, Industry: ${industry}, Team: ${teamSize}, Hours: ${hours}, Cameras: ${cameraCount}, Call Support: ${callSupport}, Notes: ${notes}`,
        profilePhoto || ''
      ]);

      // Send welcome email
      // We need to construct a user object that emailService expects
      const userObj = {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role
      };

      await emailService.sendWelcomeEmail(userObj);

      // Send admin notification
      await emailService.sendAdminNewSignupNotification(userObj, { packageName: selectedPackage || 'Free Trial', price: { monthly: 0 } });

      client.release();

      // Generate JWT token for immediate login
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: userObj.name,
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
          id: user.id,
          name: userObj.name,
          email: user.email,
          role: user.role,
          businessId: user.id // Using user ID as business ID for now since 1:1 mapping
        },
        business: {
          id: user.id,
          name: bizName,
          type: bizType,
          industry: industry
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
    const client = await pgPool.connect();

    // We don't have an 'onboarding' table or column in users table in the new schema yet (assumed).
    // So we'll return a default completed state if the user exists.
    // Or check if user_settings exists.

    const settingsResult = await client.query('SELECT * FROM user_settings WHERE user_id = $1', [req.user.id]);
    const hasSettings = settingsResult.rows.length > 0;

    client.release();

    res.json({
      completed: hasSettings,
      currentStep: hasSettings ? 4 : 1,
      wizardData: {}, // We don't store wizard state in PG currently
      hasSubscription: req.user.subscriptionStatus === 'active',
      business: hasSettings ? settingsResult.rows[0] : null
    });

  } catch (error) {
    console.error('Error fetching onboarding progress:', error);
    res.status(500).json({ error: 'Failed to fetch onboarding progress' });
  }
});

// Update onboarding step for authenticated user
router.put('/step', authenticateToken, async (req, res) => {
  try {
    // Since we don't store step-by-step progress in PG yet, we'll just acknowledge.
    // In a real implementation, we'd add a column 'onboarding_step' to users table.
    res.json({
      success: true,
      currentStep: req.body.step
    });
  } catch (error) {
    console.error('Error updating onboarding step:', error);
    res.status(500).json({ error: 'Failed to update onboarding step' });
  }
});

// Legacy endpoint for compatibility
router.post('/', async (req, res) => {
  try {
    // Just log it for now, as we are moving away from this
    console.log('Legacy onboarding data received:', req.body);
    res.json({
      message: "Onboarding received",
      success: true
    });
  } catch (error) {
    console.error('Legacy onboarding save error:', error);
    res.status(500).json({ error: "Failed to save onboarding data." });
  }
});

module.exports = router;