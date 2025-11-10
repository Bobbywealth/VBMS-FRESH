/**
 * Email Sync API Routes
 * Handles Outlook email synchronization
 */

const express = require('express');
const router = express.Router();
const outlookSyncService = require('../services/outlookSyncService');
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');

/**
 * Test IMAP connection
 */
router.get('/test-connection', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Testing Outlook IMAP connection...');
    
    const isConnected = await outlookSyncService.testConnection();
    
    if (isConnected) {
      res.json({
        success: true,
        message: 'Successfully connected to Outlook IMAP server',
        config: {
          host: 'imap.secureserver.net',
          port: 993,
          user: process.env.SMTP_USER,
          secure: true
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to connect to Outlook IMAP server',
        error: 'Connection test failed'
      });
    }
    
  } catch (error) {
    console.error('❌ Connection test error:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing IMAP connection',
      error: error.message
    });
  }
});

/**
 * Get sync status
 */
router.get('/status', authenticateToken, (req, res) => {
  try {
    const status = outlookSyncService.getSyncStatus();
    
    res.json({
      success: true,
      status: {
        isConnected: status.isConnected,
        syncInProgress: status.syncInProgress,
        lastSyncTime: req.user.lastEmailSync || null
      }
    });
    
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking sync status',
      error: error.message
    });
  }
});

/**
 * Sync emails for current user
 */
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { limit = 100 } = req.body;
    const userEmail = req.user.email;
    
    console.log(`🔄 Starting email sync for user: ${userEmail}`);
    
    // Check if sync is already running
    const status = outlookSyncService.getSyncStatus();
    if (status.syncInProgress) {
      return res.status(409).json({
        success: false,
        message: 'Email sync is already in progress',
        status: status
      });
    }
    
    // Start the sync (don't wait for it to complete)
    setTimeout(async () => {
      try {
        const results = await outlookSyncService.syncEmailsForUser(userEmail, limit);
        console.log('✅ Background sync completed:', results);
        
        // Update user's last sync time
        await req.user.updateOne({ lastEmailSync: new Date() });
        
      } catch (syncError) {
        console.error('❌ Background sync error:', syncError);
      }
    }, 100);
    
    // Return immediate response
    res.json({
      success: true,
      message: 'Email sync started in background',
      status: {
        started: true,
        userEmail: userEmail,
        limit: limit,
        estimatedTime: '1-3 minutes'
      }
    });
    
  } catch (error) {
    console.error('❌ Sync start error:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting email sync',
      error: error.message
    });
  }
});

/**
 * Sync emails for specific user (admin only)
 */
router.post('/sync/:userEmail', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { userEmail } = req.params;
    const { limit = 100 } = req.body;
    
    console.log(`🔄 Admin starting email sync for user: ${userEmail}`);
    
    // Check if sync is already running
    const status = outlookSyncService.getSyncStatus();
    if (status.syncInProgress) {
      return res.status(409).json({
        success: false,
        message: 'Email sync is already in progress',
        status: status
      });
    }
    
    // Start the sync
    const results = await outlookSyncService.syncEmailsForUser(userEmail, limit);
    
    res.json({
      success: true,
      message: 'Email sync completed successfully',
      results: results,
      userEmail: userEmail
    });
    
  } catch (error) {
    console.error('❌ Admin sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing emails',
      error: error.message
    });
  }
});

/**
 * Force sync (admin only) - clears existing synced emails first
 */
router.post('/force-sync', authenticateToken, requireAdminPermission, async (req, res) => {
  try {
    const { userEmail, limit = 100 } = req.body;
    
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: 'userEmail is required for force sync'
      });
    }
    
    console.log(`🔄 Force syncing emails for user: ${userEmail}`);
    
    // Delete existing synced emails for this user
    const Email = require('../models/Email');
    const deleteResult = await Email.deleteMany({
      'metadata.outlookSync': true,
      $or: [
        { from: userEmail },
        { to: userEmail },
        { 'sender.userId': req.user._id },
        { 'recipient.userId': req.user._id }
      ]
    });
    
    console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing synced emails`);
    
    // Start fresh sync
    const results = await outlookSyncService.syncEmailsForUser(userEmail, limit);
    
    res.json({
      success: true,
      message: 'Force sync completed successfully',
      results: {
        ...results,
        deletedExisting: deleteResult.deletedCount
      },
      userEmail: userEmail
    });
    
  } catch (error) {
    console.error('❌ Force sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during force sync',
      error: error.message
    });
  }
});

/**
 * Get sync history/logs
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const Email = require('../models/Email');
    
    // Get count of synced emails
    const syncedEmailsCount = await Email.countDocuments({
      'metadata.outlookSync': true,
      $or: [
        { from: req.user.email },
        { to: req.user.email },
        { 'sender.userId': req.user._id },
        { 'recipient.userId': req.user._id }
      ]
    });
    
    // Get latest synced emails
    const latestSynced = await Email.find({
      'metadata.outlookSync': true,
      $or: [
        { from: req.user.email },
        { to: req.user.email },
        { 'sender.userId': req.user._id },
        { 'recipient.userId': req.user._id }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('subject from to createdAt metadata.originalDate');
    
    res.json({
      success: true,
      data: {
        totalSyncedEmails: syncedEmailsCount,
        lastSyncTime: req.user.lastEmailSync || null,
        latestSyncedEmails: latestSynced,
        userEmail: req.user.email
      }
    });
    
  } catch (error) {
    console.error('❌ History fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sync history',
      error: error.message
    });
  }
});

module.exports = router;