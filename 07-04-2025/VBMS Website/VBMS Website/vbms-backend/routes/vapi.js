const express = require('express');
const router = express.Router();
const vapiService = require('../services/vapiService');
const VAPICall = require('../models/VAPICall');
const CallbackRequest = require('../models/CallbackRequest');
const { authenticateToken } = require('../middleware/auth');
const ValidationMiddleware = require('../middleware/validation');

// Test VAPI connection
router.get('/test', authenticateToken, async (req, res) => {
  try {
    const result = await vapiService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to test VAPI connection',
      details: error.message
    });
  }
});

// Create AI assistant
router.post('/assistant', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin permissions or AI phone subscription
    if (req.user.role !== 'admin' && !req.user.subscription?.features?.aiPhone) {
      return res.status(403).json({
        error: 'AI Phone feature not available in your subscription'
      });
    }

    const assistantConfig = req.body;
    const assistant = await vapiService.createAssistant(assistantConfig);
    
    res.status(201).json({
      success: true,
      assistant: assistant
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create assistant',
      details: error.message
    });
  }
});

// Get user's assistants
router.get('/assistants', authenticateToken, async (req, res) => {
  try {
    const assistants = await vapiService.listAssistants();
    res.json({
      success: true,
      assistants: assistants
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assistants',
      details: error.message
    });
  }
});

// Update assistant
router.put('/assistant/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateConfig = req.body;
    
    const assistant = await vapiService.updateAssistant(id, updateConfig);
    
    res.json({
      success: true,
      assistant: assistant
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update assistant',
      details: error.message
    });
  }
});

// Make outbound call
router.post('/call', 
  authenticateToken,
  [
    ValidationMiddleware.sanitizeHTML(),
    ValidationMiddleware.handleValidationErrors()
  ],
  async (req, res) => {
    try {
      const { phoneNumber, assistantId, customOptions } = req.body;
      
      // Validate phone number format
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({
          error: 'Invalid phone number format'
        });
      }

      // Check user permissions
      if (req.user.role !== 'admin' && !req.user.subscription?.features?.aiPhone) {
        return res.status(403).json({
          error: 'AI Phone feature not available in your subscription'
        });
      }

      const call = await vapiService.makeCall(phoneNumber, assistantId, customOptions);
      
      // Save call to database
      const vapiCall = new VAPICall({
        vapiCallId: call.id,
        customerId: req.user.id,
        assistantId: assistantId,
        phoneNumber: phoneNumber,
        direction: 'outbound',
        status: call.status || 'queued'
      });
      
      await vapiCall.save();
      
      res.status(201).json({
        success: true,
        call: call,
        callId: vapiCall._id
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to make call',
        details: error.message
      });
    }
  }
);

// Get call details
router.get('/call/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if it's a VAPI call ID or our database ID
    let call;
    if (id.length === 24) { // MongoDB ObjectId
      call = await VAPICall.findById(id).populate('customerId', 'name email');
      if (call) {
        // Get latest data from VAPI
        const vapiCall = await vapiService.getCall(call.vapiCallId);
        // Update our record with latest data
        call.status = vapiCall.status;
        call.duration = vapiCall.duration;
        call.cost = vapiCall.cost;
        call.transcript = vapiCall.transcript;
        call.analysis = vapiCall.analysis;
        await call.save();
      }
    } else {
      // It's a VAPI call ID
      const vapiCall = await vapiService.getCall(id);
      call = await VAPICall.findOne({ vapiCallId: id }).populate('customerId', 'name email');
      
      if (call) {
        // Update our record
        call.status = vapiCall.status;
        call.duration = vapiCall.duration;
        call.cost = vapiCall.cost;
        call.transcript = vapiCall.transcript;
        call.analysis = vapiCall.analysis;
        await call.save();
      }
    }
    
    if (!call) {
      return res.status(404).json({
        error: 'Call not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && call.customerId.toString() !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      call: call
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get call details',
      details: error.message
    });
  }
});

// List user's calls
router.get('/calls', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    
    // Build query
    const query = req.user.role === 'admin' ? {} : { customerId: req.user.id };
    
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const calls = await VAPICall.find(query)
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await VAPICall.countDocuments(query);
    
    res.json({
      success: true,
      calls: calls,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total: total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calls',
      details: error.message
    });
  }
});

// Get call analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Build query based on user role
    const query = {
      createdAt: { $gte: start, $lte: end }
    };
    
    if (req.user.role !== 'admin') {
      query.customerId = req.user.id;
    }
    
    // Get calls from database
    const calls = await VAPICall.find(query);
    
    // Calculate analytics
    const analytics = {
      totalCalls: calls.length,
      completedCalls: calls.filter(call => call.status === 'ended').length,
      averageDuration: 0,
      totalDuration: calls.reduce((sum, call) => sum + (call.duration || 0), 0),
      totalCost: calls.reduce((sum, call) => sum + (call.cost || 0), 0),
      callsByStatus: {},
      callsByDay: {},
      sentimentAnalysis: {
        positive: 0,
        neutral: 0,
        negative: 0
      },
      topTopics: {},
      averageSatisfaction: 0
    };
    
    // Process analytics
    let satisfactionSum = 0;
    let satisfactionCount = 0;
    
    calls.forEach(call => {
      // Count by status
      analytics.callsByStatus[call.status] = (analytics.callsByStatus[call.status] || 0) + 1;
      
      // Count by day
      const day = call.createdAt.toISOString().split('T')[0];
      analytics.callsByDay[day] = (analytics.callsByDay[day] || 0) + 1;
      
      // Sentiment analysis
      if (call.analysis?.sentiment) {
        analytics.sentimentAnalysis[call.analysis.sentiment]++;
      }
      
      // Topics
      if (call.analysis?.topics) {
        call.analysis.topics.forEach(topic => {
          analytics.topTopics[topic] = (analytics.topTopics[topic] || 0) + 1;
        });
      }
      
      // Customer satisfaction
      if (call.customerSatisfaction?.rating) {
        satisfactionSum += call.customerSatisfaction.rating;
        satisfactionCount++;
      }
    });
    
    analytics.averageDuration = analytics.completedCalls > 0 ? 
      Math.round(analytics.totalDuration / analytics.completedCalls) : 0;
    
    analytics.averageSatisfaction = satisfactionCount > 0 ? 
      (satisfactionSum / satisfactionCount).toFixed(1) : 0;
    
    // Convert costs from cents to dollars
    analytics.totalCostDollars = (analytics.totalCost / 100).toFixed(2);
    
    res.json({
      success: true,
      analytics: analytics,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics',
      details: error.message
    });
  }
});

// Schedule callback
router.post('/callback', 
  authenticateToken,
  [
    ValidationMiddleware.sanitizeHTML(),
    ValidationMiddleware.handleValidationErrors()
  ],
  async (req, res) => {
    try {
      const { phone, preferredTime, topic, priority = 'medium' } = req.body;
      
      const callback = new CallbackRequest({
        customerId: req.user.id,
        phone: phone,
        preferredTime: new Date(preferredTime),
        topic: topic,
        priority: priority,
        status: 'pending'
      });
      
      await callback.save();
      
      res.status(201).json({
        success: true,
        callback: callback
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to schedule callback',
        details: error.message
      });
    }
  }
);

// Get callback requests
router.get('/callbacks', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = req.user.role === 'admin' ? {} : { customerId: req.user.id };
    if (status) query.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const callbacks = await CallbackRequest.find(query)
      .populate('customerId', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ preferredTime: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await CallbackRequest.countDocuments(query);
    
    res.json({
      success: true,
      callbacks: callbacks,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch callbacks',
      details: error.message
    });
  }
});

// VAPI webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    
    console.log('📞 VAPI Webhook received:', event.type);
    
    const result = await vapiService.handleWebhook(event);
    
    // Update our database based on the event
    if (event.call?.id) {
      const call = await VAPICall.findOne({ vapiCallId: event.call.id });
      
      if (call) {
        switch (event.type) {
          case 'call-start':
            call.status = 'in-progress';
            call.startedAt = new Date();
            break;
            
          case 'call-end':
            call.status = 'ended';
            call.endedAt = new Date();
            call.duration = event.call.duration || 0;
            call.cost = event.call.cost || 0;
            call.transcript = event.call.transcript || '';
            call.analysis = event.call.analysis || {};
            call.calculateCost(); // Calculate our own cost if needed
            break;
        }
        
        await call.save();
      }
    }
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('❌ VAPI webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
});

module.exports = router;