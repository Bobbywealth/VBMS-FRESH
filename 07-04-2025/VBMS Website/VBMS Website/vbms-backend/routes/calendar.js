const express = require('express');
const router = express.Router();
const CalendarEvent = require('../models/CalendarEvent');
const { authenticateToken, requireAdminPermission } = require('../middleware/auth');

/**
 * Get calendar events with filtering
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      event_type,
      status,
      page = 1,
      limit = 50
    } = req.query;

    const filter = {};
    if (start_date) filter.start_date = start_date;
    if (end_date) filter.end_date = end_date;
    if (event_type) filter.event_type = event_type;
    if (status) filter.status = status;

    // Non-admin users can only see events they created or are attending
    if (req.user.role !== 'main_admin' && req.user.role !== 'admin') {
      filter.created_by = req.user.id;
      // Note: attendee filtering would need more complex logic
    }

    const options = {
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };

    const events = await CalendarEvent.find(filter, options);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: events.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calendar events',
      error: error.message
    });
  }
});

/**
 * Get events for a specific date range (calendar view)
 */
router.get('/range/:start/:end', authenticateToken, async (req, res) => {
  try {
    const { start, end } = req.params;
    
    // Validate date format
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD format.'
      });
    }

    // Non-admin users can only see their own events
    const userId = (req.user.role === 'main_admin' || req.user.role === 'admin') ? null : req.user.id;
    
    const events = await CalendarEvent.getEventsForDateRange(startDate, endDate, userId);

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error fetching events for date range:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching events for date range',
      error: error.message
    });
  }
});

/**
 * Get upcoming events
 */
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Non-admin users can only see their own events
    const userId = (req.user.role === 'main_admin' || req.user.role === 'admin') ? null : req.user.id;
    
    const events = await CalendarEvent.getUpcomingEvents(userId, parseInt(limit));

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming events',
      error: error.message
    });
  }
});

/**
 * Get calendar event by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const event = await CalendarEvent.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found'
      });
    }

    // Check permissions - users can only see events they created or are attending
    if (req.user.role !== 'main_admin' && req.user.role !== 'admin') {
      if (event.created_by !== req.user.id) {
        // Check if user is in attendees (simplified check)
        const attendees = Array.isArray(event.attendees) ? event.attendees : [];
        const isAttendee = attendees.some(attendee => attendee.user_id === req.user.id);
        
        if (!isAttendee) {
          return res.status(403).json({
            success: false,
            message: 'Access denied'
          });
        }
      }
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error fetching calendar event:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calendar event',
      error: error.message
    });
  }
});

/**
 * Create new calendar event
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      start_time,
      end_time,
      all_day = false,
      location,
      event_type = 'meeting',
      status = 'scheduled',
      attendees = [],
      recurrence_rule,
      reminder_minutes = 15,
      metadata = {}
    } = req.body;

    if (!title || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Title, start_time, and end_time are required'
      });
    }

    // Validate dates
    const startDate = new Date(start_time);
    const endDate = new Date(end_time);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    const eventData = {
      title,
      description,
      start_time: startDate,
      end_time: endDate,
      all_day,
      location,
      event_type,
      status,
      created_by: req.user.id,
      attendees,
      recurrence_rule,
      reminder_minutes: parseInt(reminder_minutes),
      metadata
    };

    const event = await CalendarEvent.create(eventData);

    res.status(201).json({
      success: true,
      message: 'Calendar event created successfully',
      data: event
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating calendar event',
      error: error.message
    });
  }
});

/**
 * Update calendar event
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if event exists and user has permission
    const existingEvent = await CalendarEvent.findById(req.params.id);
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'main_admin' && req.user.role !== 'admin' && existingEvent.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const {
      title,
      description,
      start_time,
      end_time,
      all_day,
      location,
      event_type,
      status,
      attendees,
      recurrence_rule,
      reminder_minutes,
      metadata
    } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (start_time !== undefined) updates.start_time = new Date(start_time);
    if (end_time !== undefined) updates.end_time = new Date(end_time);
    if (all_day !== undefined) updates.all_day = all_day;
    if (location !== undefined) updates.location = location;
    if (event_type !== undefined) updates.event_type = event_type;
    if (status !== undefined) updates.status = status;
    if (attendees !== undefined) updates.attendees = attendees;
    if (recurrence_rule !== undefined) updates.recurrence_rule = recurrence_rule;
    if (reminder_minutes !== undefined) updates.reminder_minutes = parseInt(reminder_minutes);
    if (metadata !== undefined) updates.metadata = metadata;

    // Validate dates if provided
    if (updates.start_time && updates.end_time && updates.start_time >= updates.end_time) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    const event = await CalendarEvent.update(req.params.id, updates);

    res.json({
      success: true,
      message: 'Calendar event updated successfully',
      data: event
    });
  } catch (error) {
    console.error('Error updating calendar event:', error);
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
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if event exists and user has permission
    const existingEvent = await CalendarEvent.findById(req.params.id);
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Calendar event not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'main_admin' && req.user.role !== 'admin' && existingEvent.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const deleted = await CalendarEvent.delete(req.params.id);

    res.json({
      success: true,
      message: 'Calendar event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting calendar event',
      error: error.message
    });
  }
});

/**
 * Get calendar statistics
 */
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    // Admin gets all stats, users get their own stats
    const userId = (req.user.role === 'main_admin' || req.user.role === 'admin') ? null : req.user.id;
    const stats = await CalendarEvent.getStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching calendar stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calendar statistics',
      error: error.message
    });
  }
});

module.exports = router;