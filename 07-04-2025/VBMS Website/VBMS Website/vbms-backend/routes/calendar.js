/**
 * Calendar Routes with OpenAI Integration
 * Smart scheduling and event management
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const OpenAI = require('openai');
const { pgPool } = require('../config/database');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-to-prevent-crash',
});

if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY is missing. AI features in calendar will fail.');
}

// Helper to find conflicts
async function findConflicts(userId, startDate, endDate, excludeEventId = null) {
  const client = await pgPool.connect();
  try {
    let query = `
      SELECT * FROM calendar_events 
      WHERE user_id = $1 
      AND status IN ('scheduled', 'confirmed')
      AND (
        (start_date < $3 AND end_date > $2)
      )
    `;
    const params = [userId, startDate, endDate];

    if (excludeEventId) {
      query += ` AND id != $4`;
      params.push(excludeEventId);
    }

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
}

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

    const client = await pgPool.connect();

    let query = 'SELECT * FROM calendar_events WHERE user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    // Date range filter
    if (start || end) {
      if (start) {
        query += ` AND (start_date >= $${paramIndex} OR end_date >= $${paramIndex})`;
        params.push(start);
        paramIndex++;
      }
      if (end) {
        query += ` AND (start_date <= $${paramIndex} OR end_date <= $${paramIndex})`;
        params.push(end);
        paramIndex++;
      }
    }

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (status) {
      const statuses = status.split(',');
      query += ` AND status = ANY($${paramIndex})`;
      params.push(statuses);
      paramIndex++;
    }

    query += ` ORDER BY start_date ASC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const result = await client.query(query, params);
    client.release();

    // Map snake_case to camelCase for frontend compatibility if needed, 
    // but for now we'll return as is or do simple mapping.
    // The frontend likely expects camelCase.
    const events = result.rows.map(row => ({
      _id: row.id, // Mongoose compatibility
      id: row.id,
      title: row.title,
      description: row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      type: row.type,
      category: row.category,
      status: row.status,
      priority: row.priority,
      location: row.location,
      attendees: row.attendees || [],
      aiGenerated: row.ai_generated,
      aiSuggestions: row.ai_suggestions,
      externalEvents: row.external_events,
      userId: row.user_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json({
      success: true,
      data: events
    });

  } catch (error) {
    console.error('Get events error:', error);
    // Handle missing table
    if (error.code === '42P01') {
      return res.json({ success: true, data: [] });
    }
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
Respond with a JSON object containing: title, description, type, category, priority, suggestedDuration, suggestedAttendees, suggestedLocation, startDate, endDate.`;

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

        // Merge AI suggestions
        eventData.title = eventData.title || aiResponse.title;
        eventData.description = eventData.description || aiResponse.description;
        eventData.type = eventData.type || aiResponse.type;
        eventData.category = eventData.category || aiResponse.category;
        eventData.priority = eventData.priority || aiResponse.priority;
        eventData.location = eventData.location || aiResponse.suggestedLocation;
        eventData.startDate = eventData.startDate || aiResponse.startDate;
        eventData.endDate = eventData.endDate || aiResponse.endDate;

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

      } catch (aiError) {
        console.error('⚠️ AI event creation failed, using manual data:', aiError.message);
      }
    }

    // Check for conflicts
    const conflicts = await findConflicts(
      req.user.id,
      new Date(eventData.startDate),
      new Date(eventData.endDate)
    );

    if (conflicts.length > 0 && !req.body.ignoreConflicts) {
      return res.status(409).json({
        success: false,
        message: 'Calendar conflict detected',
        conflicts: conflicts.map(c => ({
          id: c.id,
          title: c.title,
          startDate: c.start_date,
          endDate: c.end_date
        }))
      });
    }

    const client = await pgPool.connect();
    const result = await client.query(`
      INSERT INTO calendar_events (
        user_id, title, description, start_date, end_date, type, category, 
        status, priority, location, attendees, ai_generated, ai_suggestions, 
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      req.user.id,
      eventData.title,
      eventData.description,
      eventData.startDate,
      eventData.endDate,
      eventData.type || 'meeting',
      eventData.category || 'general',
      eventData.status || 'scheduled',
      eventData.priority || 'medium',
      eventData.location,
      JSON.stringify(eventData.attendees || []),
      eventData.aiGenerated || false,
      eventData.aiSuggestions ? JSON.stringify(eventData.aiSuggestions) : null,
      req.user.id
    ]);

    client.release();

    const row = result.rows[0];
    const event = {
      _id: row.id,
      id: row.id,
      title: row.title,
      description: row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      type: row.type,
      category: row.category,
      status: row.status,
      priority: row.priority,
      location: row.location,
      attendees: row.attendees || [],
      aiGenerated: row.ai_generated,
      aiSuggestions: row.ai_suggestions,
      userId: row.user_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

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
    const client = await pgPool.connect();
    const result = await client.query(`
      SELECT title, start_date, end_date FROM calendar_events 
      WHERE user_id = $1 
      AND start_date >= CURRENT_TIMESTAMP 
      AND start_date <= CURRENT_TIMESTAMP + INTERVAL '30 days'
      AND status IN ('scheduled', 'confirmed')
    `, [req.user.id]);
    client.release();

    const existingEvents = result.rows.map(e => ({
      title: e.title,
      start: e.start_date,
      end: e.end_date
    }));

    const systemPrompt = `You are an intelligent scheduling assistant. Based on the user's request and their calendar, suggest optimal meeting times.
Respond with a JSON object containing: suggestedTimes (array of ISO strings), reasoning, conflicts, recommendations.`;

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

    const client = await pgPool.connect();
    const result = await client.query(`
      SELECT * FROM calendar_events 
      WHERE user_id = $1 
      AND start_date >= CURRENT_TIMESTAMP 
      AND start_date <= CURRENT_TIMESTAMP + ($2 || ' days')::INTERVAL
      ORDER BY start_date ASC
    `, [req.user.id, days]);
    client.release();

    const events = result.rows.map(row => ({
      _id: row.id,
      id: row.id,
      title: row.title,
      startDate: row.start_date,
      endDate: row.end_date,
      type: row.type,
      status: row.status,
      location: row.location,
      attendees: row.attendees || []
    }));

    res.json({
      success: true,
      data: events
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
    const client = await pgPool.connect();

    // Check if event exists
    const checkResult = await client.query('SELECT * FROM calendar_events WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (checkResult.rows.length === 0) {
      client.release();
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found'
      });
    }
    const event = checkResult.rows[0];

    // Check for conflicts if dates are changing
    if (req.body.startDate || req.body.endDate) {
      const newStartDate = req.body.startDate ? new Date(req.body.startDate) : event.start_date;
      const newEndDate = req.body.endDate ? new Date(req.body.endDate) : event.end_date;

      const conflicts = await findConflicts(
        req.user.id,
        newStartDate,
        newEndDate,
        event.id
      );

      if (conflicts.length > 0 && !req.body.ignoreConflicts) {
        client.release();
        return res.status(409).json({
          success: false,
          message: 'Calendar conflict detected',
          conflicts: conflicts.map(c => ({
            id: c.id,
            title: c.title,
            startDate: c.start_date,
            endDate: c.end_date
          }))
        });
      }
    }

    // Build update query dynamically
    const updates = req.body;
    const fields = [];
    const values = [];
    let idx = 1;

    if (updates.title) { fields.push(`title = $${idx++}`); values.push(updates.title); }
    if (updates.description) { fields.push(`description = $${idx++}`); values.push(updates.description); }
    if (updates.startDate) { fields.push(`start_date = $${idx++}`); values.push(updates.startDate); }
    if (updates.endDate) { fields.push(`end_date = $${idx++}`); values.push(updates.endDate); }
    if (updates.type) { fields.push(`type = $${idx++}`); values.push(updates.type); }
    if (updates.category) { fields.push(`category = $${idx++}`); values.push(updates.category); }
    if (updates.status) { fields.push(`status = $${idx++}`); values.push(updates.status); }
    if (updates.priority) { fields.push(`priority = $${idx++}`); values.push(updates.priority); }
    if (updates.location) { fields.push(`location = $${idx++}`); values.push(updates.location); }
    if (updates.attendees) { fields.push(`attendees = $${idx++}`); values.push(JSON.stringify(updates.attendees)); }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    const updateQuery = `UPDATE calendar_events SET ${fields.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`;
    values.push(req.params.id, req.user.id);

    const result = await client.query(updateQuery, values);
    client.release();

    const row = result.rows[0];
    const updatedEvent = {
      _id: row.id,
      id: row.id,
      title: row.title,
      description: row.description,
      startDate: row.start_date,
      endDate: row.end_date,
      type: row.type,
      category: row.category,
      status: row.status,
      priority: row.priority,
      location: row.location,
      attendees: row.attendees || [],
      aiGenerated: row.ai_generated,
      aiSuggestions: row.ai_suggestions,
      userId: row.user_id,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    res.json({
      success: true,
      message: 'Calendar event updated successfully',
      data: updatedEvent
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
    const client = await pgPool.connect();
    const result = await client.query('DELETE FROM calendar_events WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    client.release();

    if (result.rows.length === 0) {
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
Respond with a JSON object containing: shouldCreateEvent, suggestedEvents (array).`;

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

    if (!userId || !eventData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook data'
      });
    }

    const client = await pgPool.connect();

    // Check if event already exists
    const checkQuery = `
      SELECT id FROM calendar_events 
      WHERE user_id = $1 
      AND (external_events->>'googleCalendarId' = $2 OR external_events->>'outlookEventId' = $2)
    `;
    const checkResult = await client.query(checkQuery, [userId, eventData.id]);

    const externalEvents = {
      googleCalendarId: source === 'google' ? eventData.id : undefined,
      outlookEventId: source === 'outlook' ? eventData.id : undefined,
      syncStatus: 'synced',
      lastSyncAt: new Date()
    };

    if (checkResult.rows.length > 0) {
      // Update
      const eventId = checkResult.rows[0].id;
      await client.query(`
        UPDATE calendar_events 
        SET title = $1, description = $2, start_date = $3, end_date = $4, location = $5, 
            external_events = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
      `, [
        eventData.summary || eventData.title,
        eventData.description,
        new Date(eventData.start),
        new Date(eventData.end),
        eventData.location,
        JSON.stringify(externalEvents),
        eventId
      ]);

      client.release();
      res.json({ success: true, message: 'Event updated', eventId });
    } else {
      // Create
      const result = await client.query(`
        INSERT INTO calendar_events (
          user_id, title, description, start_date, end_date, type, category, 
          status, location, external_events, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'meeting', 'external', 'scheduled', $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `, [
        userId,
        eventData.summary || eventData.title,
        eventData.description,
        new Date(eventData.start),
        new Date(eventData.end),
        eventData.location,
        JSON.stringify(externalEvents),
        userId
      ]);

      client.release();
      res.json({ success: true, message: 'Event created', eventId: result.rows[0].id });
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

    const client = await pgPool.connect();
    let query = `
      SELECT 
        COUNT(*) as total_events,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_events,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_events,
        SUM(EXTRACT(EPOCH FROM (end_date - start_date))/60) as total_duration,
        AVG(EXTRACT(EPOCH FROM (end_date - start_date))/60) as avg_duration,
        SUM(CASE WHEN ai_generated = true THEN 1 ELSE 0 END) as ai_generated_events
      FROM calendar_events
      WHERE user_id = $1
    `;
    const params = [req.user.id];
    let idx = 2;

    if (startDate) {
      query += ` AND start_date >= $${idx++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND start_date <= $${idx++}`;
      params.push(endDate);
    }

    const result = await client.query(query, params);
    client.release();

    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        totalEvents: parseInt(stats.total_events),
        completedEvents: parseInt(stats.completed_events),
        cancelledEvents: parseInt(stats.cancelled_events),
        totalDuration: parseFloat(stats.total_duration || 0),
        avgDuration: parseFloat(stats.avg_duration || 0),
        aiGeneratedEvents: parseInt(stats.ai_generated_events),
        eventsByType: [], // Complex to aggregate in one query without GROUP BY, skipping for now
        eventsByCategory: []
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