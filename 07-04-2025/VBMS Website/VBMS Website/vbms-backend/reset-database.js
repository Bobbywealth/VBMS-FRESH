require('dotenv').config();
const { Pool } = require('pg');

// PostgreSQL connection - using the production database
const pool = new Pool({
  connectionString: 'postgresql://vbms_official_database_user:xNSBQdx8Lg1pe6sO9r5wwFsILiFKr8bm@dpg-d4219j9r0fns738rnjb0-a.oregon-postgres.render.com/vbms_official_database',
  ssl: { rejectUnauthorized: false }
});

async function resetDatabase() {
  try {
    console.log('🔗 Connecting to Production PostgreSQL...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to Production PostgreSQL');

    // Drop problematic tables and recreate them
    console.log('🔄 Dropping problematic tables...');
    
    await pool.query('DROP TABLE IF EXISTS calendar_events CASCADE');
    await pool.query('DROP TABLE IF EXISTS time_logs CASCADE');
    await pool.query('DROP TABLE IF EXISTS notifications CASCADE');
    await pool.query('DROP TABLE IF EXISTS tasks CASCADE');
    
    console.log('✅ Tables dropped');

    // Recreate tables
    console.log('🔄 Recreating tables...');

    // Tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(50) DEFAULT 'medium',
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        due_date TIMESTAMP,
        completed_at TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        is_read BOOLEAN DEFAULT false,
        action_url TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP
      )
    `);

    // Calendar events table
    await pool.query(`
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
      )
    `);

    // Time logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS time_logs (
        id SERIAL PRIMARY KEY,
        employee_name VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL CHECK (action IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
        timestamp_local TIMESTAMP NOT NULL,
        timestamp_utc TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tables recreated');

    // Create indexes
    console.log('🔄 Creating indexes...');

    // Tasks indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    `);

    // Notifications indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
    `);

    // Calendar events indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
      CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
    `);

    // Time logs indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_time_logs_employee_name ON time_logs(employee_name);
      CREATE INDEX IF NOT EXISTS idx_time_logs_action ON time_logs(action);
      CREATE INDEX IF NOT EXISTS idx_time_logs_timestamp_local ON time_logs(timestamp_local);
      CREATE INDEX IF NOT EXISTS idx_time_logs_created_at ON time_logs(created_at);
    `);

    console.log('✅ Indexes created');

    console.log('🎉 Database reset completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();
