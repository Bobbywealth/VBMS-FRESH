const { pgPool } = require('../config/database');

class Notification {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.message = data.message;
    this.type = data.type;
    this.user_id = data.user_id;
    this.is_read = data.is_read;
    this.action_url = data.action_url;
    this.metadata = data.metadata;
    this.created_at = data.created_at;
    this.read_at = data.read_at;
  }

  // Create notifications table
  static async createTable() {
    const query = `
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
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
    `;
    
    try {
      await pgPool.query(query);
      console.log('✅ Notifications table created successfully');
    } catch (error) {
      console.error('❌ Error creating notifications table:', error);
      throw error;
    }
  }

  // Create a new notification
  static async create(notificationData) {
    const {
      title,
      message,
      type = 'info',
      user_id,
      action_url = null,
      metadata = {}
    } = notificationData;

    const query = `
      INSERT INTO notifications (title, message, type, user_id, action_url, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;

    const values = [
      title,
      message,
      type,
      user_id,
      action_url,
      JSON.stringify(metadata)
    ];

    try {
      const result = await pgPool.query(query, values);
      return new Notification(result.rows[0]);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Bulk create notifications for multiple users
  static async createBulk(notificationData, userIds) {
    const {
      title,
      message,
      type = 'info',
      action_url = null,
      metadata = {}
    } = notificationData;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('userIds must be a non-empty array');
    }

    const values = [];
    const placeholders = [];
    let paramCount = 1;

    userIds.forEach((userId) => {
      placeholders.push(`($${paramCount}, $${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3}, $${paramCount + 4}, $${paramCount + 5}, NOW())`);
      values.push(title, message, type, userId, action_url, JSON.stringify(metadata));
      paramCount += 6;
    });

    const query = `
      INSERT INTO notifications (title, message, type, user_id, action_url, metadata, created_at)
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

    try {
      const result = await pgPool.query(query, values);
      return result.rows.map(row => new Notification(row));
    } catch (error) {
      console.error('Error creating bulk notifications:', error);
      throw error;
    }
  }

  // Find notifications with filters
  static async find(filter = {}, options = {}) {
    const {
      user_id,
      read,
      type,
      unread_only = false
    } = filter;

    const {
      limit = 50,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = options;

    let query = 'SELECT * FROM notifications';
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (user_id) {
      conditions.push(`user_id = $${paramCount}`);
      values.push(user_id);
      paramCount++;
    }

    if (read !== undefined) {
      conditions.push(`is_read = $${paramCount}`);
      values.push(read);
      paramCount++;
    }

    if (type) {
      conditions.push(`type = $${paramCount}`);
      values.push(type);
      paramCount++;
    }

    if (unread_only) {
      conditions.push('is_read = false');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY ${sort_by} ${sort_order}`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    try {
      const result = await pgPool.query(query, values);
      return result.rows.map(row => new Notification(row));
    } catch (error) {
      console.error('Error finding notifications:', error);
      throw error;
    }
  }

  // Find notification by ID
  static async findById(id) {
    const query = 'SELECT * FROM notifications WHERE id = $1';

    try {
      const result = await pgPool.query(query, [id]);
      if (result.rows.length === 0) return null;
      return new Notification(result.rows[0]);
    } catch (error) {
      console.error('Error finding notification by ID:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(id, userId = null) {
    let query = 'UPDATE notifications SET is_read = true, read_at = NOW() WHERE id = $1';
    const values = [id];

    if (userId) {
      query += ' AND user_id = $2';
      values.push(userId);
    }

    query += ' RETURNING *';

    try {
      const result = await pgPool.query(query, values);
      if (result.rows.length === 0) return null;
      return new Notification(result.rows[0]);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    const query = `
      UPDATE notifications 
      SET is_read = true, read_at = NOW() 
      WHERE user_id = $1 AND is_read = false
      RETURNING COUNT(*) as updated_count
    `;

    try {
      const result = await pgPool.query(query, [userId]);
      return parseInt(result.rows[0]?.updated_count) || 0;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  static async delete(id, userId = null) {
    let query = 'DELETE FROM notifications WHERE id = $1';
    const values = [id];

    if (userId) {
      query += ' AND user_id = $2';
      values.push(userId);
    }

    query += ' RETURNING *';

    try {
      const result = await pgPool.query(query, values);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Get notification statistics
  static async getStats(userId = null) {
    let query = `
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE is_read = false) as unread_notifications,
        COUNT(*) FILTER (WHERE is_read = true) as read_notifications,
        COUNT(*) FILTER (WHERE type = 'info') as info_notifications,
        COUNT(*) FILTER (WHERE type = 'success') as success_notifications,
        COUNT(*) FILTER (WHERE type = 'warning') as warning_notifications,
        COUNT(*) FILTER (WHERE type = 'error') as error_notifications,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as recent_notifications
      FROM notifications
    `;

    const values = [];
    if (userId) {
      query += ' WHERE user_id = $1';
      values.push(userId);
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
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }

  // Delete old notifications (cleanup)
  static async deleteOldNotifications(daysOld = 30) {
    const query = `
      DELETE FROM notifications 
      WHERE created_at < NOW() - INTERVAL '${daysOld} days'
      RETURNING COUNT(*) as deleted_count
    `;

    try {
      const result = await pgPool.query(query);
      return parseInt(result.rows[0]?.deleted_count) || 0;
    } catch (error) {
      console.error('Error deleting old notifications:', error);
      throw error;
    }
  }

  // Send system notification to all users
  static async sendSystemNotification(title, message, type = 'info', actionUrl = null) {
    // Get all active users
    const usersQuery = 'SELECT id FROM users WHERE status = $1';
    const usersResult = await pgPool.query(usersQuery, ['active']);
    const userIds = usersResult.rows.map(row => row.id);

    if (userIds.length === 0) {
      return [];
    }

    return await this.createBulk({
      title,
      message,
      type,
      action_url: actionUrl
    }, userIds);
  }
}

module.exports = Notification;
