/**
 * Calendar Routes with OpenAI Integration
 * Smart scheduling and event management
 */

const express = require('express');
const router = express.Router();
const CalendarEvent = require('../models/CalendarEvent');
const { authenticateToken } = require('../middleware/auth');
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Get user's calendar events
 */
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const { 
      start, 
      end, 
      type, 
      category, 
      status = 'scheduled,confirmed',
      limit = 100 
    } = req.query;

    const filter = { userId: req.user.id };
    
    // Date range filter
    if (start || end) {
      filter.$or = [
        {
          startDate: { 
            ...(start && { $gte: new Date(start) }),
            ...(end && { $lte: new Date(end) })
          }
        },
        {
          endDate: { 
            ...(start && { $gte: new Date(start) }),
            ...(end && { $lte: new Date(end) })
          }
        }
      ];
    }
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (status) filter.status = { $in: status.split(',') };

    const events = await CalendarEvent.find(filter)
      .populate('attendees.userId', 'name email')
      .sort({ startDate: 1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: events
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calendar events',
      error: error.message
    });
  }
});

/**
 * Create new calendar event with optional AI assistance
 */
router.post('/events', authenticateToken, async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      userId: req.user.id,
      createdBy: req.user.id
    };

    // AI-powered event creation if prompt is provided
    if (req.body.aiPrompt) {
      try {
        console.log('🤖 Using AI to create calendar event...');
        
        const systemPrompt = `You are a smart calendar assistant. Based on the user's request, create a structured calendar event. 

Current date/time: ${new Date().toISOString()}
User timezone: ${req.body.timezone || 'America/New_York'}

Respond with a JSON object containing:
- title: Clear, professional event title
- description: Detailed description
- type: one of [meeting, appointment, deadline, reminder, task, personal, business, training, demo, call]
- category: one of [work, personal, client, internal, marketing, support, development, admin]
- priority: one of [low, medium, high, urgent]
- suggestedDuration: duration in minutes
- suggestedAttendees: array of email addresses if mentioned
- suggestedLocation: location or meeting platform
- startDate: ISO date string (make reasonable assumptions for timing)
- endDate: ISO date string

Be intelligent about scheduling - consider business hours, reasonable meeting durations, etc.`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: req.body.aiPrompt }
          ],
          max_tokens: 1000,
          temperature: 0.3
        });

        const aiResponse = JSON.parse(completion.choices[0].message.content);
        
        // Merge AI suggestions with provided data
        eventData.title = eventData.title || aiResponse.title;
        eventData.description = eventData.description || aiResponse.description;
        eventData.type = eventData.type || aiResponse.type;
        eventData.category = eventData.category || aiResponse.category;
        eventData.priority = eventData.priority || aiResponse.priority;
        eventData.location = eventData.location || aiResponse.suggestedLocation;
        eventData.startDate = eventData.startDate || aiResponse.startDate;
        eventData.endDate = eventData.endDate || aiResponse.endDate;
        
        // Store AI metadata
        eventData.aiGenerated = true;
        eventData.aiSuggestions = {
          originalPrompt: req.body.aiPrompt,
          suggestedTitle: aiResponse.title,
          suggestedDescription: aiResponse.description,
          suggestedDuration: aiResponse.suggestedDuration,
          suggestedAttendees: aiResponse.suggestedAttendees,
          suggestedLocation: aiResponse.suggestedLocation,
          confidenceScore: 0.85,
          processedAt: new Date()
        };

        console.log('✅ AI event creation successful');

      } catch (aiError) {
        console.error('⚠️ AI event creation failed, using manual data:', aiError.message);
        // Continue with manual event creation
      }
    }

    // Check for conflicts
    const conflicts = await CalendarEvent.findConflicts(
      req.user.id,
      new Date(eventData.startDate),
      new Date(eventData.endDate)
    );

    if (conflicts.length > 0 && !req.body.ignoreConflicts) {
      return res.status(409).json({
        success: false,
        message: 'Calendar conflict detected',
        conflicts: conflicts.map(c => ({
          id: c._id,
          title: c.title,
          startDate: c.startDate,
          endDate: c.endDate
        }))
      });
    }

    const event = new CalendarEvent(eventData);
    await event.save();
    
    await event.populate('attendees.userId', 'name email');

    res.status(201).json({
      success: true,
      message: 'Calendar event created successfully',
      data: event
    });

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating calendar event',
      error: error.message
    });
  }
});

/**
 * AI-powered smart scheduling
 */
router.post('/smart-schedule', authenticateToken, async (req, res) => {
  try {
    const { prompt, preferences, attendeeEmails, duration = 60 } = req.body;

    console.log('🧠 AI Smart Scheduling Request...');

    // Get user's existing events for context
    const existingEvents = await CalendarEvent.find({
      userId: req.user.id,
      startDate: { 
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
      },
      status: { $in: ['scheduled', 'confirmed'] }
    });

    const systemPrompt = `You are an intelligent scheduling assistant. Based on the user's request and their calendar, suggest optimal meeting times.

Current date/time: ${new Date().toISOString()}
User's existing events: ${JSON.stringify(existingEvents.map(e => ({
  title: e.title,
  start: e.startDate,
  end: e.endDate
})))}

Default preferences:
- Business hours: 9 AM - 5 PM
- Buffer time: 15 minutes between meetings
- Preferred duration: ${duration} minutes
- Timezone: ${preferences?.timezone || 'America/New_York'}

User preferences: ${JSON.stringify(preferences || {})}

Respond with a JSON object containing:
- suggestedTimes: array of 3-5 optimal time slots with ISO date strings
- reasoning: explanation for each suggestion
- conflicts: any potential issues identified
- recommendations: additional suggestions for better scheduling

Consider work-life balance, meeting fatigue, and optimal productivity times.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.3
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);

    res.json({
      success: true,
      message: 'Smart scheduling suggestions generated',
      data: {
        suggestions: aiResponse.suggestedTimes,
        reasoning: aiResponse.reasoning,
        conflicts: aiResponse.conflicts,
        recommendations: aiResponse.recommendations,
        aiProcessedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Smart scheduling error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating smart schedule',
      error: error.message
    });
  }
});

/**
 * Get upcoming events
 */
router.get('/events/upcoming', authenticateToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const upcomingEvents = await CalendarEvent.findUpcoming(req.user.id, parseInt(days))
      .populate('attendees.userId', 'name email');

    res.json({
      success: true,
      data: upcomingEvents
    });

  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming events',
      error: error.message
    });
  }
});

/**
 * Update calendar event
 */
router.put('/events/:id', authenticateToken, async (req, res) => {
  try {
    const event = await CalendarEvent.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found'
      });
    }

    // Check for conflicts if dates are changing
    if (req.body.startDate || req.body.endDate) {
      const newStartDate = req.body.startDate ? new Date(req.body.startDate) : event.startDate;
      const newEndDate = req.body.endDate ? new Date(req.body.endDate) : event.endDate;

      const conflicts = await CalendarEvent.findConflicts(
        req.user.id,
        newStartDate,
        newEndDate,
        event._id
      );

      if (conflicts.length > 0 && !req.body.ignoreConflicts) {
        return res.status(409).json({
          success: false,
          message: 'Calendar conflict detected',
          conflicts: conflicts.map(c => ({
            id: c._id,
            title: c.title,
            startDate: c.startDate,
            endDate: c.endDate
          }))
        });
      }
    }

    Object.assign(event, req.body);
    await event.save();
    
    await event.populate('attendees.userId', 'name email');

    res.json({
      success: true,
      message: 'Calendar event updated successfully',
      data: event
    });

  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating calendar event',
      error: error.message
    });
  }
});

/**
 * Delete calendar event
 */
router.delete('/events/:id', authenticateToken, async (req, res) => {
  try {
    const event = await CalendarEvent.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found'
      });
    }

    res.json({
      success: true,
      message: 'Calendar event deleted successfully'
    });

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting calendar event',
      error: error.message
    });
  }
});

/**
 * AI-powered event suggestions based on email context
 */
router.post('/suggest-from-email', authenticateToken, async (req, res) => {
  try {
    const { emailContent, emailSubject, fromEmail } = req.body;

    console.log('📧 Creating calendar suggestions from email...');

    const systemPrompt = `You are a smart calendar assistant. Analyze this email and suggest relevant calendar events.

Current date/time: ${new Date().toISOString()}

Respond with a JSON object containing:
- shouldCreateEvent: boolean - whether this email warrants a calendar event
- suggestedEvents: array of event objects with:
  - title: string
  - description: string  
  - type: string (meeting, call, deadline, reminder, etc.)
  - priority: string (low, medium, high, urgent)
  - suggestedDate: ISO string (if mentioned) or null
  - suggestedDuration: number in minutes
  - attendees: array of email addresses
  - notes: string with additional context

Look for meeting requests, deadlines, appointments, follow-ups, or anything that needs to be scheduled.`;

    const emailText = `Subject: ${emailSubject}\nFrom: ${fromEmail}\n\n${emailContent}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: emailText }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);

    res.json({
      success: true,
      message: 'Email analysis completed',
      data: aiResponse
    });

  } catch (error) {
    console.error('Email suggestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing email for calendar suggestions',
      error: error.message
    });
  }
});

/**
 * Receive external calendar events (webhooks)
 */
router.post('/external/webhook', async (req, res) => {
  try {
    const { source, eventData, userId } = req.body;
    
    console.log(`📅 Received external calendar event from ${source}`);

    // Validate the webhook source and user
    if (!userId || !eventData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook data'
      });
    }

    // Transform external event data to our format
    const transformedEvent = {
      title: eventData.summary || eventData.title,
      description: eventData.description,
      startDate: new Date(eventData.start),
      endDate: new Date(eventData.end),
      userId: userId,
      createdBy: userId,
      type: 'meeting',
      category: 'external',
      externalEvents: {
        googleCalendarId: source === 'google' ? eventData.id : undefined,
        outlookEventId: source === 'outlook' ? eventData.id : undefined,
        syncStatus: 'synced',
        lastSyncAt: new Date()
      },
      location: eventData.location,
      attendees: eventData.attendees ? eventData.attendees.map(a => ({
        email: a.email,
        name: a.name,
        status: a.responseStatus === 'accepted' ? 'accepted' : 'pending'
      })) : []
    };

    // Check if event already exists
    const existingEvent = await CalendarEvent.findOne({
      userId: userId,
      $or: [
        { 'externalEvents.googleCalendarId': eventData.id },
        { 'externalEvents.outlookEventId': eventData.id }
      ]
    });

    if (existingEvent) {
      // Update existing event
      Object.assign(existingEvent, transformedEvent);
      existingEvent.externalEvents.lastSyncAt = new Date();
      await existingEvent.save();
      
      res.json({
        success: true,
        message: 'Event updated from external source',
        eventId: existingEvent._id
      });
    } else {
      // Create new event
      const newEvent = new CalendarEvent(transformedEvent);
      await newEvent.save();
      
      res.json({
        success: true,
        message: 'Event created from external source',
        eventId: newEvent._id
      });
    }

  } catch (error) {
    console.error('External event webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing external calendar event',
      error: error.message
    });
  }
});

/**
 * Get calendar analytics
 */
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchFilter = { userId: req.user.id };
    if (startDate || endDate) {
      matchFilter.startDate = {};
      if (startDate) matchFilter.startDate.$gte = new Date(startDate);
      if (endDate) matchFilter.startDate.$lte = new Date(endDate);
    }

    const analytics = await CalendarEvent.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          completedEvents: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledEvents: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalDuration: { $sum: '$durationMinutes' },
          avgDuration: { $avg: '$durationMinutes' },
          eventsByType: {
            $push: '$type'
          },
          eventsByCategory: {
            $push: '$category'
          },
          aiGeneratedEvents: {
            $sum: { $cond: ['$aiGenerated', 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: analytics[0] || {
        totalEvents: 0,
        completedEvents: 0,
        cancelledEvents: 0,
        totalDuration: 0,
        avgDuration: 0,
        eventsByType: [],
        eventsByCategory: [],
        aiGeneratedEvents: 0
      }
    });

  } catch (error) {
    console.error('Calendar analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calendar analytics',
      error: error.message
    });
  }
});

module.exports = router;