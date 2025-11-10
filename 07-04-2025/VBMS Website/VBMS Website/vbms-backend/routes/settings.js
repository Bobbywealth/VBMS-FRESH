const express = require('express');
const router = express.Router();
const UserSettings = require('../models/UserSettings');
const { authenticateToken } = require('../middleware/auth');

// Get business profile settings
router.get('/business-profile', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching business profile for user:', req.user.id);
    let settings = await UserSettings.findByUserId(req.user.id);
    
    if (!settings) {
      // Create default settings if none exist
      settings = await UserSettings.upsert(req.user.id, {
        businessName: '',
        businessEmail: '',
        businessPhone: '',
        businessAddress: '',
        businessDescription: '',
        logoUrl: ''
      });
      console.log('Created new settings for user:', req.user.id);
    }
    
    res.json(settings.toJSON());
  } catch (error) {
    console.error('Error fetching business profile:', error);
    res.status(500).json({ error: 'Failed to fetch business profile' });
  }
});

// Update business profile
router.put('/business-profile', authenticateToken, async (req, res) => {
  try {
    console.log('Updating business profile for user:', req.user.id);
    console.log('Request body:', req.body);

    const { businessName, businessEmail, businessPhone, businessAddress, businessDescription } = req.body;

    const updateData = {};
    if (businessName !== undefined) updateData.businessName = businessName || '';
    if (businessEmail !== undefined) updateData.businessEmail = businessEmail || '';
    if (businessPhone !== undefined) updateData.businessPhone = businessPhone || '';
    if (businessAddress !== undefined) updateData.businessAddress = businessAddress || '';
    if (businessDescription !== undefined) updateData.businessDescription = businessDescription || '';

    const settings = await UserSettings.upsert(req.user.id, updateData);
    console.log('Business profile updated successfully');
    
    res.json({ message: 'Business profile updated successfully', settings: settings.toJSON() });
  } catch (error) {
    console.error('Error updating business profile:', error);
    res.status(500).json({ error: 'Failed to update business profile' });
  }
});

// Get notification settings
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching notification settings for user:', req.user.id);
    let settings = await UserSettings.findByUserId(req.user.id);
    
    if (!settings) {
      // Create default settings if none exist
      settings = await UserSettings.upsert(req.user.id, {
        emailNotifications: true,
        smsNotifications: false,
        orderNotifications: true,
        marketingNotifications: false
      });
      console.log('Created new notification settings for user:', req.user.id);
    }
    
    res.json({
      emailNotifications: settings.emailNotifications,
      smsNotifications: settings.smsNotifications,
      orderNotifications: settings.orderNotifications,
      marketingNotifications: settings.marketingNotifications
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

// Update notification settings
router.put('/notifications', authenticateToken, async (req, res) => {
  try {
    console.log('Updating notification settings for user:', req.user.id);
    const { emailNotifications, smsNotifications, orderNotifications, marketingNotifications } = req.body;

    const updateData = {};
    if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
    if (smsNotifications !== undefined) updateData.smsNotifications = smsNotifications;
    if (orderNotifications !== undefined) updateData.orderNotifications = orderNotifications;
    if (marketingNotifications !== undefined) updateData.marketingNotifications = marketingNotifications;

    const settings = await UserSettings.upsert(req.user.id, updateData);
    res.json({ message: 'Notification settings updated successfully', settings: settings.toJSON() });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

module.exports = router;
