const { pgPool } = require('../config/database');

class CalendarEvent {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.start_time = data.start_time;
    this.end_time = data.end_time;
    this.all_day = data.all_day;
    this.location = data.location;
    this.event_type = data.event_type;
    this.status = data.status;
    this.created_by = data.created_by;
    this.attendees = data.attendees;
    this.recurrence_rule = data.recurrence_rule;
    this.reminder_minutes = data.reminder_minutes;
    this.metadata = data.metadata;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create calendar_events table
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        all_day BOOLEAN DEFAULT false,
        location TEXT,
        event_type VARCHAR(50) DEFAULT 'meeting',
        status VARCHAR(50) DEFAULT 'scheduled',
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        attendees JSONB DEFAULT '[]',
        recurrence_rule TEXT,
        reminder_minutes INTEGER DEFAULT 15,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
    `;
    
    try {
      await pgPool.query(query);
      console.log('✅ Calendar events table created successfully');
    } catch (error) {
      console.error('❌ Error creating calendar events table:', error);
      throw error;
    }
  }

  // Create a new calendar event
  static async create(eventData) {
    const {
      title,
      description = '',
      start_time,
      end_time,
      all_day = false,
      location = null,
      event_type = 'meeting',
      status = 'scheduled',
      created_by,
      attendees = [],
      recurrence_rule = null,
      reminder_minutes = 15,
      metadata = {}
    } = eventData;

    const query = `
      INSERT INTO calendar_events (
        title, description, start_time, end_time, all_day, location, 
        event_type, status, created_by, attendees, recurrence_rule, 
        reminder_minutes, metadata, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      title,
      description,
      start_time,
      end_time,
      all_day,
      location,
      event_type,
      status,
      created_by,
      JSON.stringify(attendees),
      recurrence_rule,
      reminder_minutes,
      JSON.stringify(metadata)
    ];

    try {
      const result = await pgPool.query(query, values);
      return new CalendarEvent(result.rows[0]);
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  // Find events with filters
  static async find(filter = {}, options = {}) {
    const {
      start_date,
      end_date,
      event_type,
      status,
      created_by,
      attendee_id
    } = filter;

    const {
      limit = 50,
      offset = 0,
      sort_by = 'start_time',
      sort_order = 'ASC'
    } = options;

    let query = `
      SELECT ce.*, 
             u.first_name as creator_first_name, u.last_name as creator_last_name
      FROM calendar_events ce
      LEFT JOIN users u ON ce.created_by = u.id
    `;

    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (start_date) {
      conditions.push(`ce.start_time >= $${paramCount}`);
      values.push(start_date);
      paramCount++;
    }

    if (end_date) {
      conditions.push(`ce.end_time <= $${paramCount}`);
      values.push(end_date);
      paramCount++;
    }

    if (event_type) {
      conditions.push(`ce.event_type = $${paramCount}`);
      values.push(event_type);
      paramCount++;
    }

    if (status) {
      conditions.push(`ce.status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (created_by) {
      conditions.push(`ce.created_by = $${paramCount}`);
      values.push(created_by);
      paramCount++;
    }

    if (attendee_id) {
      conditions.push(`ce.attendees @> $${paramCount}`);
      values.push(JSON.stringify([{user_id: attendee_id}]));
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY ce.${sort_by} ${sort_order}`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    try {
      const result = await pgPool.query(query, values);
      return result.rows.map(row => ({
        ...new CalendarEvent(row),
        creator_name: row.creator_first_name ? `${row.creator_first_name} ${row.creator_last_name}` : null
      }));
    } catch (error) {
      console.error('Error finding calendar events:', error);
      throw error;
    }
  }

  // Find event by ID
  static async findById(id) {
    const query = `
      SELECT ce.*, 
             u.first_name as creator_first_name, u.last_name as creator_last_name
      FROM calendar_events ce
      LEFT JOIN users u ON ce.created_by = u.id
      WHERE ce.id = $1
    `;

    try {
      const result = await pgPool.query(query, [id]);
      if (result.rows.length === 0) return null;
      
      const row = result.rows[0];
      return {
        ...new CalendarEvent(row),
        creator_name: row.creator_first_name ? `${row.creator_first_name} ${row.creator_last_name}` : null
      };
    } catch (error) {
      console.error('Error finding calendar event by ID:', error);
      throw error;
    }
  }

  // Update event
  static async update(id, updates) {
    const allowedFields = [
      'title', 'description', 'start_time', 'end_time', 'all_day', 
      'location', 'event_type', 'status', 'attendees', 'recurrence_rule', 
      'reminder_minutes', 'metadata'
    ];
    
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field)) {
        if (field === 'attendees' || field === 'metadata') {
          updateFields.push(`${field} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          updateFields.push(`${field} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE calendar_events 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await pgPool.query(query, values);
      if (result.rows.length === 0) return null;
      return new CalendarEvent(result.rows[0]);
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  // Delete event
  static async delete(id) {
    const query = 'DELETE FROM calendar_events WHERE id = $1 RETURNING *';
    
    try {
      const result = await pgPool.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  // Get events for a specific date range (useful for calendar views)
  static async getEventsForDateRange(startDate, endDate, userId = null) {
    let query = `
      SELECT ce.*, 
             u.first_name as creator_first_name, u.last_name as creator_last_name
      FROM calendar_events ce
      LEFT JOIN users u ON ce.created_by = u.id
      WHERE (ce.start_time <= $2 AND ce.end_time >= $1)
    `;

    const values = [startDate, endDate];

    if (userId) {
      query += ` AND (ce.created_by = $3 OR ce.attendees @> $4)`;
      values.push(userId, JSON.stringify([{user_id: userId}]));
    }

    query += ' ORDER BY ce.start_time ASC';

    try {
      const result = await pgPool.query(query, values);
      return result.rows.map(row => ({
        ...new CalendarEvent(row),
        creator_name: row.creator_first_name ? `${row.creator_first_name} ${row.creator_last_name}` : null
      }));
    } catch (error) {
      console.error('Error getting events for date range:', error);
      throw error;
    }
  }

  // Get upcoming events
  static async getUpcomingEvents(userId = null, limit = 10) {
    let query = `
      SELECT ce.*, 
             u.first_name as creator_first_name, u.last_name as creator_last_name
      FROM calendar_events ce
      LEFT JOIN users u ON ce.created_by = u.id
      WHERE ce.start_time > NOW() AND ce.status = 'scheduled'
    `;

    const values = [];

    if (userId) {
      query += ` AND (ce.created_by = $1 OR ce.attendees @> $2)`;
      values.push(userId, JSON.stringify([{user_id: userId}]));
    }

    query += ` ORDER BY ce.start_time ASC LIMIT $${values.length + 1}`;
    values.push(limit);

    try {
      const result = await pgPool.query(query, values);
      return result.rows.map(row => ({
        ...new CalendarEvent(row),
        creator_name: row.creator_first_name ? `${row.creator_first_name} ${row.creator_last_name}` : null
      }));
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      throw error;
    }
  }

  // Get event statistics
  static async getStats(userId = null) {
    let query = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_events,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_events,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_events,
        COUNT(*) FILTER (WHERE start_time > NOW()) as upcoming_events,
        COUNT(*) FILTER (WHERE start_time < NOW() AND end_time > NOW()) as current_events,
        COUNT(*) FILTER (WHERE event_type = 'meeting') as meetings,
        COUNT(*) FILTER (WHERE event_type = 'appointment') as appointments,
        COUNT(*) FILTER (WHERE event_type = 'task') as task_events,
        COUNT(*) FILTER (WHERE all_day = true) as all_day_events
      FROM calendar_events
    `;

    const values = [];
    if (userId) {
      query += ` WHERE created_by = $1 OR attendees @> $2`;
      values.push(userId, JSON.stringify([{user_id: userId}]));
    }

    try {
      const result = await pgPool.query(query, values);
      const stats = result.rows[0];
      
      // Convert string counts to integers
      Object.keys(stats).forEach(key => {
        stats[key] = parseInt(stats[key]) || 0;
      });

      return stats;
    } catch (error) {
      console.error('Error getting calendar event stats:', error);
      throw error;
    }
  }
}

module.exports = CalendarEvent;
