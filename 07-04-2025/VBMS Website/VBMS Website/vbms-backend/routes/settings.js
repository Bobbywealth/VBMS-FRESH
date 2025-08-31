const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const File = require('../models/File');
const { authenticateToken } = require('../middleware/auth');
const storageService = require('../services/storageService');

// Get business profile settings
router.get('/business-profile', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching business profile for user:', req.user.id);
    let settings = await Settings.findOne({ userId: req.user.id });
    if (!settings) {
      // Create default settings if none exist
      settings = new Settings({
        userId: req.user.id,
        businessName: '',
        businessEmail: '',
        businessPhone: '',
        businessAddress: '',
        businessDescription: '',
        logoUrl: ''
      });
      await settings.save();
      console.log('Created new settings for user:', req.user.id);
    }
    res.json(settings);
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

    let settings = await Settings.findOne({ userId: req.user.id });
    if (!settings) {
      settings = new Settings({
        userId: req.user.id,
        businessName: businessName || '',
        businessEmail: businessEmail || '',
        businessPhone: businessPhone || '',
        businessAddress: businessAddress || '',
        businessDescription: businessDescription || ''
      });
    } else {
      settings.businessName = businessName || settings.businessName;
      settings.businessEmail = businessEmail || settings.businessEmail;
      settings.businessPhone = businessPhone || settings.businessPhone;
      settings.businessAddress = businessAddress || settings.businessAddress;
      settings.businessDescription = businessDescription || settings.businessDescription;
    }

    await settings.save();
    console.log('Business profile updated successfully');
    res.json({ message: 'Business profile updated successfully', settings });
  } catch (error) {
    console.error('Error updating business profile:', error);
    res.status(500).json({ error: 'Failed to update business profile' });
  }
});

// Get notification settings
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching notification settings for user:', req.user.id);
    let settings = await Settings.findOne({ userId: req.user.id });
    if (!settings) {
      settings = new Settings({
        userId: req.user.id,
        emailNotifications: true,
        smsNotifications: false,
        orderNotifications: true,
        marketingNotifications: false
      });
      await settings.save();
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

    let settings = await Settings.findOne({ userId: req.user.id });
    if (!settings) {
      settings = new Settings({ userId: req.user.id });
    }

    settings.emailNotifications = emailNotifications !== undefined ? emailNotifications : settings.emailNotifications;
    settings.smsNotifications = smsNotifications !== undefined ? smsNotifications : settings.smsNotifications;
    settings.orderNotifications = orderNotifications !== undefined ? orderNotifications : settings.orderNotifications;
    settings.marketingNotifications = marketingNotifications !== undefined ? marketingNotifications : settings.marketingNotifications;

    await settings.save();
    res.json({ message: 'Notification settings updated successfully', settings });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// Upload logo
// Configure multer for logo uploads
const logoUpload = storageService.getMulterConfig('logos');

router.post('/upload-logo', authenticateToken, logoUpload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get the file URL (works for both local and S3)
    const logoUrl = req.file.location || storageService.getFileUrl(req.file.key || `logos/${req.file.filename}`);
    const fileKey = req.file.key || `logos/${req.file.filename}`;

    let settings = await Settings.findOne({ userId: req.user.id });
    if (!settings) {
      settings = new Settings({ userId: req.user.id });
    }

    // Delete old logo from storage and database if it exists
    if (settings.logoKey) {
      try {
        await storageService.deleteFile(settings.logoKey);
        await File.findOneAndDelete({ fileKey: settings.logoKey });
      } catch (deleteError) {
        console.log('Could not delete old logo:', deleteError.message);
      }
    }

    // Create file record
    const fileRecord = new File({
      userId: req.user.id,
      originalName: req.file.originalname,
      fileName: req.file.filename || req.file.key,
      fileKey: fileKey,
      fileUrl: logoUrl,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      category: 'logos',
      storage: req.file.location ? 's3' : 'local',
      accessLevel: 'public'
    });
    await fileRecord.save();

    settings.logoUrl = logoUrl;
    settings.logoKey = fileKey;
    await settings.save();

    res.json({ 
      message: 'Logo uploaded successfully', 
      logoUrl,
      fileSize: req.file.size,
      fileName: req.file.originalname,
      fileId: fileRecord._id
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// Get integration settings
router.get('/integrations', authenticateToken, async (req, res) => {
  try {
    let settings = await Settings.findOne({ userId: req.user.id });
    if (!settings) {
      settings = new Settings({
        userId: req.user.id,
        uberEatsConnected: false,
        doorDashConnected: false,
        grubhubConnected: false,
        cloverConnected: false
      });
      await settings.save();
    }
    
    res.json({
      uberEatsConnected: settings.uberEatsConnected,
      uberEatsStoreId: settings.uberEatsStoreId,
      doorDashConnected: settings.doorDashConnected,
      grubhubConnected: settings.grubhubConnected,
      cloverConnected: settings.cloverConnected
    });
  } catch (error) {
    console.error('Error fetching integration settings:', error);
    res.status(500).json({ error: 'Failed to fetch integration settings' });
  }
});

// Update integration settings
router.put('/integrations', authenticateToken, async (req, res) => {
  try {
    const { platform, connected, storeId } = req.body;
    
    let settings = await Settings.findOne({ userId: req.user.id });
    if (!settings) {
      settings = new Settings({ userId: req.user.id });
    }

    switch (platform) {
      case 'ubereats':
        settings.uberEatsConnected = connected;
        if (storeId) settings.uberEatsStoreId = storeId;
        break;
      case 'doordash':
        settings.doorDashConnected = connected;
        break;
      case 'grubhub':
        settings.grubhubConnected = connected;
        break;
      case 'clover':
        settings.cloverConnected = connected;
        break;
    }

    await settings.save();
    res.json({ message: `${platform} integration updated successfully`, settings });
  } catch (error) {
    console.error('Error updating integration settings:', error);
    res.status(500).json({ error: 'Failed to update integration settings' });
  }
});

// General file upload endpoint
const generalUpload = storageService.getMulterConfig('documents');

router.post('/upload-file', authenticateToken, generalUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = req.file.location || storageService.getFileUrl(req.file.key || `documents/${req.file.filename}`);
    const fileKey = req.file.key || `documents/${req.file.filename}`;

    // Determine category based on mime type
    let category = 'general';
    if (req.file.mimetype.startsWith('image/')) category = 'images';
    else if (req.file.mimetype.startsWith('video/')) category = 'videos';
    else if (req.file.mimetype.startsWith('audio/')) category = 'audio';
    else if (req.file.mimetype.includes('pdf') || req.file.mimetype.includes('document')) category = 'documents';

    // Create file record
    const fileRecord = new File({
      userId: req.user.id,
      originalName: req.file.originalname,
      fileName: req.file.filename || req.file.key,
      fileKey: fileKey,
      fileUrl: fileUrl,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      category: category,
      storage: req.file.location ? 's3' : 'local',
      accessLevel: 'private'
    });
    await fileRecord.save();

    res.json({
      message: 'File uploaded successfully',
      fileUrl,
      fileKey,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      category: category,
      fileId: fileRecord._id
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Delete file endpoint
router.delete('/delete-file/:fileKey(*)', authenticateToken, async (req, res) => {
  try {
    const fileKey = req.params.fileKey;
    
    // Find and verify ownership
    const fileRecord = await File.findOne({ fileKey, userId: req.user.id });
    if (!fileRecord) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }
    
    // Delete from storage
    await storageService.deleteFile(fileKey);
    
    // Delete from database
    await File.findByIdAndDelete(fileRecord._id);
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Get storage statistics
router.get('/storage-stats', authenticateToken, async (req, res) => {
  try {
    const stats = await storageService.getStorageStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching storage stats:', error);
    res.status(500).json({ error: 'Failed to fetch storage stats' });
  }
});

// List user's files
router.get('/files/:category?', authenticateToken, async (req, res) => {
  try {
    const category = req.params.category || null;
    const limit = parseInt(req.query.limit) || 50;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    // Build query
    const query = { userId: req.user.id };
    if (category && category !== 'all') {
      query.category = category;
    }

    // Get files with pagination
    const files = await File.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const total = await File.countDocuments(query);

    res.json({
      files,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        limit
      },
      category: category || 'all'
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

module.exports = router;