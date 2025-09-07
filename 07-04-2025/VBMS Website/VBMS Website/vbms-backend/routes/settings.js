const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');

/**
 * Get all settings (Admin only)
 */
router.get('/', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { category, public_only } = req.query;
    
    const filter = {};
    if (category) filter.category = category;
    if (public_only === 'true') filter.is_public = true;

    const settings = await Settings.find(filter);

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
      error: error.message
    });
  }
});

/**
 * Get public settings (No auth required)
 */
router.get('/public', async (req, res) => {
  try {
    const settings = await Settings.getPublicSettings();

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching public settings',
      error: error.message
    });
  }
});

/**
 * Get setting by key (Admin only)
 */
router.get('/:key', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const setting = await Settings.findByKey(req.params.key);
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching setting',
      error: error.message
    });
  }
});

/**
 * Create or update setting (Admin only)
 */
router.post('/', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { key, value, category, type, description, is_public } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Setting key is required'
      });
    }

    const setting = await Settings.upsert(key, value, {
      category,
      type,
      description,
      is_public
    });

    res.status(201).json({
      success: true,
      message: 'Setting saved successfully',
      data: setting
    });
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving setting',
      error: error.message
    });
  }
});

/**
 * Update setting by key (Admin only)
 */
router.put('/:key', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { value, category, type, description, is_public } = req.body;
    
    const updates = {};
    if (value !== undefined) updates.value = value;
    if (category !== undefined) updates.category = category;
    if (type !== undefined) updates.type = type;
    if (description !== undefined) updates.description = description;
    if (is_public !== undefined) updates.is_public = is_public;

    const setting = await Settings.updateByKey(req.params.key, updates);
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: setting
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating setting',
      error: error.message
    });
  }
});

/**
 * Delete setting by key (Admin only)
 */
router.delete('/:key', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const deleted = await Settings.deleteByKey(req.params.key);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.json({
      success: true,
      message: 'Setting deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting setting',
      error: error.message
    });
  }
});

/**
 * Bulk update settings (Admin only)
 */
router.post('/bulk', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { settings } = req.body;

    if (!Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        message: 'Settings must be an array'
      });
    }

    const results = [];
    for (const settingData of settings) {
      const { key, value, category, type, description, is_public } = settingData;
      
      if (!key) {
        results.push({ key: 'unknown', error: 'Key is required' });
        continue;
      }

      try {
        const setting = await Settings.upsert(key, value, {
          category,
          type,
          description,
          is_public
        });
        results.push({ key, success: true, data: setting });
      } catch (error) {
        results.push({ key, error: error.message });
      }
    }

    res.json({
      success: true,
      message: 'Bulk settings update completed',
      results
    });
  } catch (error) {
    console.error('Error bulk updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk updating settings',
      error: error.message
    });
  }
});

module.exports = router;