const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');
const Email = require('../models/Email');
const User = require('../models/User');
const emailService = require('../services/emailService');
const mongoose = require('mongoose');

// Get inbox emails
router.get('/inbox', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 100, search = '', category = 'inbox' } = req.query;
    const userId = req.user.id;
    
    // Enforce maximum of 100 emails total
    const maxLimit = Math.min(parseInt(limit), 100);
    const currentPage = parseInt(page);
    const maxEmails = 100;
    
    // Build search query for emails TO this user (inbox)
    const searchQuery = {
      $or: [
        { to: req.user.email },
        { 'recipient.userId': mongoose.Types.ObjectId(userId) }
      ]
      // Remove category filter to show all received emails
    };
    
    // Add search filter if provided
    if (search) {
      searchQuery.$and = [
        {
          $or: [
            { subject: { $regex: search, $options: 'i' } },
            { 'content.text': { $regex: search, $options: 'i' } },
            { from: { $regex: search, $options: 'i' } },
            { 'sender.name': { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }
    
    // Calculate skip but ensure we don't go beyond 100 emails
    const skip = Math.min((currentPage - 1) * maxLimit, maxEmails);
    const actualLimit = Math.min(maxLimit, maxEmails - skip);
    
    const emails = await Email.find(searchQuery)
      .populate('sender.userId', 'name email role')
      .populate('recipient.userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(actualLimit > 0 ? actualLimit : 0)
      .skip(skip)
      .lean();
    
    const totalEmails = await Email.countDocuments(searchQuery);
    const unreadCount = await Email.countDocuments({
      ...searchQuery,
      'flags.isRead': false
    });
    
    res.json({
      success: true,
      emails: emails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalEmails,
        pages: Math.ceil(totalEmails / limit)
      },
      unreadCount
    });
    
  } catch (error) {
    console.error('Error fetching inbox:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch emails', error: error.message });
  }
});

// Get sent emails
router.get('/sent', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;
    
    // Enforce maximum of 100 emails total
    const maxLimit = Math.min(parseInt(limit), 100);
    const currentPage = parseInt(page);
    const maxEmails = 100;
    
    const emails = await Email.find({
      $or: [
        { from: req.user.email },
        { 'sender.userId': mongoose.Types.ObjectId(userId) }
      ]
      // Remove category filter to show all sent emails
    })
    .populate('sender.userId', 'name email role')
    .populate('recipient.userId', 'name email role')
    .sort({ createdAt: -1 })
    .limit(maxLimit)
    .skip((currentPage - 1) * maxLimit);
    
    const totalEmails = await Email.countDocuments({
      $or: [
        { from: req.user.email },
        { 'sender.userId': mongoose.Types.ObjectId(userId) }
      ]
      // Remove category filter to show all sent emails
    });
    
    res.json({
      success: true,
      emails: emails,
      pagination: {
        page: currentPage,
        limit: maxLimit,
        total: Math.min(totalEmails, maxEmails),
        pages: Math.ceil(Math.min(totalEmails, maxEmails) / maxLimit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching sent emails:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch sent emails', error: error.message });
  }
});

// Get drafts
router.get('/drafts', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    
    const emails = await Email.find({
      $or: [
        { from: req.user.email },
        { 'sender.userId': mongoose.Types.ObjectId(userId) }
      ],
      status: 'draft',
      category: 'drafts'
    })
    .populate('sender.userId', 'name email role')
    .populate('recipient.userId', 'name email role')
    .sort({ updatedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);
    
    const totalEmails = await Email.countDocuments({
      $or: [
        { from: req.user.email },
        { 'sender.userId': mongoose.Types.ObjectId(userId) }
      ],
      status: 'draft',
      category: 'drafts'
    });
    
    res.json({
      success: true,
      emails: emails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalEmails,
        pages: Math.ceil(totalEmails / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching drafts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch drafts', error: error.message });
  }
});

// Get single email by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const email = await Email.findById(req.params.id)
      .populate('sender.userId', 'name email role')
      .populate('recipient.userId', 'name email role')
      .populate('inReplyTo')
      .populate('references');
    
    if (!email) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }
    
    // Check if user has access to this email
    const userId = req.user.id;
    const userEmail = req.user.email;
    const hasAccess = email.to === userEmail || 
                     email.from === userEmail ||
                     (email.sender.userId && email.sender.userId.toString() === userId) ||
                     (email.recipient.userId && email.recipient.userId.toString() === userId);
    
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Mark as read if it's in the user's inbox
    if (email.to === userEmail || (email.recipient.userId && email.recipient.userId.toString() === userId)) {
      if (!email.flags.isRead) {
        await email.markAsRead();
      }
    }
    
    res.json({ success: true, email });
    
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch email', error: error.message });
  }
});

// Send new email
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { to, subject, content, priority = 'normal', type = 'custom', scheduledFor } = req.body;
    
    if (!to || !subject || !content) {
      return res.status(400).json({ success: false, message: 'To, subject, and content are required' });
    }
    
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userName = req.user.name;
    const userRole = req.user.role;
    
    // Find recipient user if exists
    let recipientUser = null;
    if (to.includes('@')) {
      recipientUser = await User.findOne({ email: to });
    }
    
    // Create email record
    const emailData = {
      to,
      from: userEmail,
      subject,
      content: {
        html: content.html || content,
        text: content.text || content.replace(/<[^>]*>/g, '')
      },
      status: scheduledFor ? 'draft' : 'sent',
      type,
      priority,
      sender: {
        userId: mongoose.Types.ObjectId(userId),
        name: userName,
        role: userRole
      },
      category: scheduledFor ? 'drafts' : 'sent',
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null
    };
    
    if (recipientUser) {
      emailData.recipient = {
        userId: recipientUser._id,
        name: recipientUser.name,
        role: recipientUser.role
      };
    }
    
    const email = new Email(emailData);
    await email.save();
    
    // Send email immediately if not scheduled
    if (!scheduledFor) {
      try {
        const emailSent = await emailService.sendEmail(
          to,
          subject,
          content.html || content,
          content.text
        );
        
        if (emailSent) {
          email.status = 'sent';
          email.tracking.sent = {
            timestamp: new Date(),
            messageId: `msg_${Date.now()}`,
            provider: 'smtp'
          };
          
          // Create copy in recipient's inbox if they are a system user
          if (recipientUser) {
            const inboxEmail = new Email({
              ...emailData,
              category: 'inbox',
              status: 'delivered'
            });
            await inboxEmail.save();
          }
        } else {
          email.status = 'failed';
          email.error = {
            message: 'Failed to send email via SMTP',
            timestamp: new Date(),
            retryCount: 0
          };
        }
        
        await email.save();
        
      } catch (sendError) {
        console.error('Error sending email:', sendError);
        email.status = 'failed';
        email.error = {
          message: sendError.message,
          timestamp: new Date(),
          retryCount: 0
        };
        await email.save();
      }
    }
    
    await email.populate('sender.userId recipient.userId');
    
    res.json({ success: true, message: 'Email processed successfully', email });
    
  } catch (error) {
    console.error('Error creating email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

// Save draft
router.post('/draft', authenticateToken, async (req, res) => {
  try {
    const { to, subject, content, priority = 'normal', type = 'custom' } = req.body;
    
    const userId = req.user.id;
    const userEmail = req.user.email;
    const userName = req.user.name;
    const userRole = req.user.role;
    
    const email = new Email({
      to: to || '',
      from: userEmail,
      subject: subject || '',
      content: {
        html: content?.html || content || '',
        text: content?.text || content?.replace(/<[^>]*>/g, '') || ''
      },
      status: 'draft',
      type,
      priority,
      sender: {
        userId: mongoose.Types.ObjectId(userId),
        name: userName,
        role: userRole
      },
      category: 'drafts'
    });
    
    await email.save();
    await email.populate('sender.userId recipient.userId');
    
    res.json({ success: true, message: 'Draft saved successfully', email });
    
  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({ success: false, message: 'Failed to save draft', error: error.message });
  }
});

// Update draft
router.put('/draft/:id', authenticateToken, async (req, res) => {
  try {
    const { to, subject, content, priority, type } = req.body;
    const userId = req.user.id;
    
    const email = await Email.findOne({
      _id: req.params.id,
      'sender.userId': userId,
      status: 'draft'
    });
    
    if (!email) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }
    
    // Update fields
    if (to !== undefined) email.to = to;
    if (subject !== undefined) email.subject = subject;
    if (content !== undefined) {
      email.content = {
        html: content.html || content,
        text: content.text || content.replace(/<[^>]*>/g, '')
      };
    }
    if (priority !== undefined) email.priority = priority;
    if (type !== undefined) email.type = type;
    
    await email.save();
    await email.populate('sender.userId recipient.userId');
    
    res.json({ success: true, message: 'Draft updated successfully', email });
    
  } catch (error) {
    console.error('Error updating draft:', error);
    res.status(500).json({ success: false, message: 'Failed to update draft', error: error.message });
  }
});

// Delete email/draft
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    const email = await Email.findById(req.params.id);
    
    if (!email) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }
    
    // Check if user has permission to delete
    const canDelete = email.from === userEmail || 
                     (email.sender.userId && email.sender.userId.toString() === userId) ||
                     email.to === userEmail ||
                     (email.recipient.userId && email.recipient.userId.toString() === userId);
    
    if (!canDelete) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Move to trash instead of permanent delete
    email.category = 'trash';
    await email.save();
    
    res.json({ success: true, message: 'Email moved to trash' });
    
  } catch (error) {
    console.error('Error deleting email:', error);
    res.status(500).json({ success: false, message: 'Failed to delete email', error: error.message });
  }
});

// Mark as read/unread
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { isRead } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    const email = await Email.findById(req.params.id);
    
    if (!email) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }
    
    // Check if user is the recipient
    const isRecipient = email.to === userEmail || 
                       (email.recipient.userId && email.recipient.userId.toString() === userId);
    
    if (!isRecipient) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    if (isRead) {
      await email.markAsRead();
    } else {
      await email.markAsUnread();
    }
    
    res.json({ success: true, message: `Email marked as ${isRead ? 'read' : 'unread'}` });
    
  } catch (error) {
    console.error('Error updating read status:', error);
    res.status(500).json({ success: false, message: 'Failed to update read status', error: error.message });
  }
});

// Archive/unarchive email
router.put('/:id/archive', authenticateToken, async (req, res) => {
  try {
    const { archive } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    const email = await Email.findById(req.params.id);
    
    if (!email) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }
    
    // Check if user has access
    const hasAccess = email.to === userEmail || 
                     email.from === userEmail ||
                     (email.sender.userId && email.sender.userId.toString() === userId) ||
                     (email.recipient.userId && email.recipient.userId.toString() === userId);
    
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    if (archive) {
      await email.addToArchive();
    } else {
      email.category = 'inbox';
      await email.save();
    }
    
    res.json({ success: true, message: `Email ${archive ? 'archived' : 'unarchived'}` });
    
  } catch (error) {
    console.error('Error archiving email:', error);
    res.status(500).json({ success: false, message: 'Failed to archive email', error: error.message });
  }
});

// Get email statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    
    const [inboxCount, sentCount, draftCount, unreadCount] = await Promise.all([
      Email.countDocuments({
        $or: [
          { to: userEmail },
          { 'recipient.userId': mongoose.Types.ObjectId(userId) }
        ],
        category: 'inbox'
      }),
      Email.countDocuments({
        $or: [
          { from: userEmail },
          { 'sender.userId': mongoose.Types.ObjectId(userId) }
        ],
        category: 'sent'
      }),
      Email.countDocuments({
        $or: [
          { from: userEmail },
          { 'sender.userId': mongoose.Types.ObjectId(userId) }
        ],
        status: 'draft'
      }),
      Email.countDocuments({
        $or: [
          { to: userEmail },
          { 'recipient.userId': mongoose.Types.ObjectId(userId) }
        ],
        'flags.isRead': false,
        category: 'inbox'
      })
    ]);
    
    // Get email activity for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentActivity = await Email.aggregate([
      {
        $match: {
          $or: [
            { 'sender.userId': mongoose.Types.ObjectId(userId) },
            { 'recipient.userId': mongoose.Types.ObjectId(userId) }
          ],
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          sent: {
            $sum: {
              $cond: [{ $eq: ['$sender.userId', mongoose.Types.ObjectId(userId)] }, 1, 0]
            }
          },
          received: {
            $sum: {
              $cond: [{ $eq: ['$recipient.userId', mongoose.Types.ObjectId(userId)] }, 1, 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json({
      success: true,
      stats: {
        inbox: inboxCount,
        sent: sentCount,
        drafts: draftCount,
        unread: unreadCount,
        recentActivity
      }
    });
    
  } catch (error) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics', error: error.message });
  }
});

// Admin-only routes

// Get all system emails (admin only)
router.get('/admin/all', authenticateToken, requireAdminPermission('email_management'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status, type, days = 30 } = req.query;
    
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      query.createdAt = { $gte: startDate };
    }
    
    const emails = await Email.find(query)
      .populate('sender.userId', 'name email role')
      .populate('recipient.userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const totalEmails = await Email.countDocuments(query);
    
    res.json({
      success: true,
      emails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalEmails,
        pages: Math.ceil(totalEmails / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching admin emails:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch emails', error: error.message });
  }
});

// Get system email analytics (admin only)
router.get('/admin/analytics', authenticateToken, requireAdminPermission('email_management'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const analytics = await Email.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalEmails: { $sum: 1 },
          sentEmails: {
            $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
          },
          deliveredEmails: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          failedEmails: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          openedEmails: {
            $sum: { $cond: [{ $gt: ['$analytics.totalOpens', 0] }, 1, 0] }
          },
          totalOpens: { $sum: '$analytics.totalOpens' },
          totalClicks: { $sum: '$analytics.clicks' },
          avgOpenRate: { $avg: '$analytics.uniqueOpens' }
        }
      }
    ]);
    
    const typeBreakdown = await Email.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          sent: {
            $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      analytics: analytics[0] || {
        totalEmails: 0,
        sentEmails: 0,
        deliveredEmails: 0,
        failedEmails: 0,
        openedEmails: 0,
        totalOpens: 0,
        totalClicks: 0,
        avgOpenRate: 0
      },
      typeBreakdown
    });
    
  } catch (error) {
    console.error('Error fetching email analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: error.message });
  }
});

module.exports = router;