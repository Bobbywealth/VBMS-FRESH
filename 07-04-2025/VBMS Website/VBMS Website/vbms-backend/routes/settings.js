const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pgPool } = require('../config/database');

// Get business profile settings
router.get('/business-profile', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching business profile for user:', req.user.id);
    const client = await pgPool.connect();

    // Check if settings exist
    const result = await client.query('SELECT * FROM user_settings WHERE user_id = $1', [req.user.id]);
    let settings = result.rows[0];

    if (!settings) {
      // Create default settings if none exist
      const insertResult = await client.query(`
        INSERT INTO user_settings (user_id, business_name, business_email, business_phone, business_address, business_description, logo_url)
        VALUES ($1, '', '', '', '', '', '')
        RETURNING *
      `, [req.user.id]);

      settings = insertResult.rows[0];
      console.log('Created new settings for user:', req.user.id);
    }

    client.release();

    // Map snake_case to camelCase for frontend
    const formattedSettings = {
      businessName: settings.business_name,
      businessEmail: settings.business_email,
      businessPhone: settings.business_phone,
      businessAddress: settings.business_address,
      businessDescription: settings.business_description,
      logoUrl: settings.logo_url
    };

    res.json(formattedSettings);
  } catch (error) {
    console.error('Error fetching business profile:', error);
    // If table doesn't exist, return empty object to prevent crash
    if (error.code === '42P01') { // undefined_table
      return res.json({});
    }
    res.status(500).json({ error: 'Failed to fetch business profile' });
  }
});

// Update business profile
router.put('/business-profile', authenticateToken, async (req, res) => {
  try {
    console.log('Updating business profile for user:', req.user.id);
    const { businessName, businessEmail, businessPhone, businessAddress, businessDescription } = req.body;

    const client = await pgPool.connect();

    const result = await client.query(`
      INSERT INTO user_settings (user_id, business_name, business_email, business_phone, business_address, business_description, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE 
      SET business_name = EXCLUDED.business_name,
          business_email = EXCLUDED.business_email,
          business_phone = EXCLUDED.business_phone,
          business_address = EXCLUDED.business_address,
          business_description = EXCLUDED.business_description,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [req.user.id, businessName || '', businessEmail || '', businessPhone || '', businessAddress || '', businessDescription || '']);

    client.release();

    const settings = result.rows[0];
    const formattedSettings = {
      businessName: settings.business_name,
      businessEmail: settings.business_email,
      businessPhone: settings.business_phone,
      businessAddress: settings.business_address,
      businessDescription: settings.business_description,
      logoUrl: settings.logo_url
    };

    console.log('Business profile updated successfully');
    res.json({ message: 'Business profile updated successfully', settings: formattedSettings });
  } catch (error) {
    console.error('Error updating business profile:', error);
    res.status(500).json({ error: 'Failed to update business profile' });
  }
});

// Get notification settings
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching notification settings for user:', req.user.id);
    const client = await pgPool.connect();

    const result = await client.query('SELECT * FROM user_settings WHERE user_id = $1', [req.user.id]);
    let settings = result.rows[0];

    if (!settings) {
      // Create default settings if none exist
      const insertResult = await client.query(`
        INSERT INTO user_settings (user_id, email_notifications, sms_notifications, order_notifications, marketing_notifications)
        VALUES ($1, true, false, true, false)
        RETURNING *
      `, [req.user.id]);
      settings = insertResult.rows[0];
    }

    client.release();

    res.json({
      emailNotifications: settings.email_notifications,
      smsNotifications: settings.sms_notifications,
      orderNotifications: settings.order_notifications,
      marketingNotifications: settings.marketing_notifications
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    if (error.code === '42P01') { // undefined_table
      return res.json({
        emailNotifications: true,
        smsNotifications: false,
        orderNotifications: true,
        marketingNotifications: false
      });
    }
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

// Update notification settings
router.put('/notifications', authenticateToken, async (req, res) => {
  try {
    console.log('Updating notification settings for user:', req.user.id);
    const { emailNotifications, smsNotifications, orderNotifications, marketingNotifications } = req.body;

    const client = await pgPool.connect();

    // We need to be careful not to overwrite other settings if we use ON CONFLICT UPDATE with a full row replacement
    // So we should use COALESCE or separate update
    // But since we are using ON CONFLICT, we can just update specific columns

    const result = await client.query(`
      INSERT INTO user_settings (user_id, email_notifications, sms_notifications, order_notifications, marketing_notifications, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE 
      SET email_notifications = EXCLUDED.email_notifications,
          sms_notifications = EXCLUDED.sms_notifications,
          order_notifications = EXCLUDED.order_notifications,
          marketing_notifications = EXCLUDED.marketing_notifications,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      req.user.id,
      emailNotifications !== undefined ? emailNotifications : true,
      smsNotifications !== undefined ? smsNotifications : false,
      orderNotifications !== undefined ? orderNotifications : true,
      marketingNotifications !== undefined ? marketingNotifications : false
    ]);

    client.release();

    const settings = result.rows[0];
    res.json({
      message: 'Notification settings updated successfully',
      settings: {
        emailNotifications: settings.email_notifications,
        smsNotifications: settings.sms_notifications,
        orderNotifications: settings.order_notifications,
        marketingNotifications: settings.marketing_notifications
      }
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

module.exports = router;
