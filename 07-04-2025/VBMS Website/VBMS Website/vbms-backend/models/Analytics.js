const { pgPool } = require('../config/database');

class Analytics {
  constructor(data) {
    this.id = data.id;
    this.event_type = data.event_type;
    this.event_data = data.event_data;
    this.user_id = data.user_id;
    this.session_id = data.session_id;
    this.ip_address = data.ip_address;
    this.user_agent = data.user_agent;
    this.created_at = data.created_at;
  }

  // Create analytics table
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS analytics (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB DEFAULT '{}',
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        session_id VARCHAR(255),
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
      CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at);
    `;
    
    try {
      await pgPool.query(query);
      console.log('✅ Analytics table created successfully');
    } catch (error) {
      console.error('❌ Error creating analytics table:', error);
      throw error;
    }
  }

  // Track an event
  static async track(eventType, eventData = {}, options = {}) {
    const {
      userId = null,
      sessionId = null,
      ipAddress = null,
      userAgent = null
    } = options;

    const query = `
      INSERT INTO analytics (event_type, event_data, user_id, session_id, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;

    const values = [
      eventType,
      JSON.stringify(eventData),
      userId,
      sessionId,
      ipAddress,
      userAgent
    ];

    try {
      const result = await pgPool.query(query, values);
      return new Analytics(result.rows[0]);
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      throw error;
    }
  }

  // Get dashboard statistics
  static async getDashboardStats(timeframe = '7d') {
    const timeCondition = this.getTimeCondition(timeframe);
    
    const query = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(*) FILTER (WHERE event_type = 'login') as logins,
        COUNT(*) FILTER (WHERE event_type = 'register') as registrations,
        COUNT(*) FILTER (WHERE event_type = 'page_view') as page_views,
        COUNT(*) FILTER (WHERE event_type = 'api_call') as api_calls
      FROM analytics 
      WHERE created_at >= NOW() - INTERVAL '${timeCondition}'
    `;

    try {
      const result = await pgPool.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  // Get user activity over time
  static async getUserActivity(timeframe = '7d', interval = 'day') {
    const timeCondition = this.getTimeCondition(timeframe);
    const intervalFormat = this.getIntervalFormat(interval);
    
    const query = `
      SELECT 
        DATE_TRUNC('${interval}', created_at) as time_bucket,
        COUNT(*) as total_events,
        COUNT(DISTINCT user_id) as unique_users
      FROM analytics 
      WHERE created_at >= NOW() - INTERVAL '${timeCondition}'
      GROUP BY time_bucket
      ORDER BY time_bucket
    `;

    try {
      const result = await pgPool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting user activity:', error);
      throw error;
    }
  }

  // Get top events
  static async getTopEvents(timeframe = '7d', limit = 10) {
    const timeCondition = this.getTimeCondition(timeframe);
    
    const query = `
      SELECT 
        event_type,
        COUNT(*) as event_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM analytics 
      WHERE created_at >= NOW() - INTERVAL '${timeCondition}'
      GROUP BY event_type
      ORDER BY event_count DESC
      LIMIT $1
    `;

    try {
      const result = await pgPool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting top events:', error);
      throw error;
    }
  }

  // Get user stats
  static async getUserStats() {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'customer') as customers,
        COUNT(*) FILTER (WHERE role = 'admin') as admins,
        COUNT(*) FILTER (WHERE role = 'main_admin') as main_admins,
        COUNT(*) FILTER (WHERE status = 'active') as active_users,
        COUNT(*) FILTER (WHERE last_login >= NOW() - INTERVAL '24 hours') as recent_logins
      FROM users
    `;

    try {
      const result = await pgPool.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  // Get system health metrics
  static async getSystemHealth() {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as events_last_hour,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as events_last_day,
        COUNT(DISTINCT user_id) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as active_users_last_hour,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_event_age_seconds
      FROM analytics
    `;

    try {
      const result = await pgPool.query(query);
      const healthData = result.rows[0];
      
      // Add database connection status
      const dbQuery = 'SELECT NOW() as current_time, version() as pg_version';
      const dbResult = await pgPool.query(dbQuery);
      
      return {
        ...healthData,
        database_connected: true,
        database_version: dbResult.rows[0].pg_version,
        last_check: dbResult.rows[0].current_time
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        database_connected: false,
        error: error.message
      };
    }
  }

  // Helper methods
  static getTimeCondition(timeframe) {
    const timeframes = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
      '1y': '1 year'
    };
    return timeframes[timeframe] || '7 days';
  }

  static getIntervalFormat(interval) {
    const intervals = {
      'minute': 'minute',
      'hour': 'hour', 
      'day': 'day',
      'week': 'week',
      'month': 'month'
    };
    return intervals[interval] || 'day';
  }
}

module.exports = Analytics;
