const { pgPool } = require('../config/database');

class Settings {
  constructor(data) {
    this.id = data.id;
    this.key = data.key;
    this.value = data.value;
    this.category = data.category;
    this.type = data.type;
    this.description = data.description;
    this.is_public = data.is_public;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create settings table
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        category VARCHAR(100) DEFAULT 'general',
        type VARCHAR(50) DEFAULT 'string',
        description TEXT,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    try {
      await pgPool.query(query);
      console.log('✅ Settings table created successfully');
    } catch (error) {
      console.error('❌ Error creating settings table:', error);
      throw error;
    }
  }

  // Get all settings
  static async find(filter = {}) {
    let query = 'SELECT * FROM settings';
    const values = [];
    const conditions = [];

    if (filter.category) {
      conditions.push(`category = $${values.length + 1}`);
      values.push(filter.category);
    }

    if (filter.is_public !== undefined) {
      conditions.push(`is_public = $${values.length + 1}`);
      values.push(filter.is_public);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY category, key';

    try {
      const result = await pgPool.query(query, values);
      return result.rows.map(row => new Settings(row));
    } catch (error) {
      console.error('Error finding settings:', error);
      throw error;
    }
  }

  // Get setting by key
  static async findByKey(key) {
    const query = 'SELECT * FROM settings WHERE key = $1';
    
    try {
      const result = await pgPool.query(query, [key]);
      if (result.rows.length === 0) return null;
      return new Settings(result.rows[0]);
    } catch (error) {
      console.error('Error finding setting by key:', error);
      throw error;
    }
  }

  // Create or update setting
  static async upsert(key, value, options = {}) {
    const {
      category = 'general',
      type = 'string',
      description = '',
      is_public = false
    } = options;

    const query = `
      INSERT INTO settings (key, value, category, type, description, is_public, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (key) 
      DO UPDATE SET 
        value = EXCLUDED.value,
        category = EXCLUDED.category,
        type = EXCLUDED.type,
        description = EXCLUDED.description,
        is_public = EXCLUDED.is_public,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [key, value, category, type, description, is_public];

    try {
      const result = await pgPool.query(query, values);
      return new Settings(result.rows[0]);
    } catch (error) {
      console.error('Error upserting setting:', error);
      throw error;
    }
  }

  // Update setting by key
  static async updateByKey(key, updates) {
    const allowedFields = ['value', 'category', 'type', 'description', 'is_public'];
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field)) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(key);

    const query = `
      UPDATE settings 
      SET ${updateFields.join(', ')}
      WHERE key = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await pgPool.query(query, values);
      if (result.rows.length === 0) return null;
      return new Settings(result.rows[0]);
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  }

  // Delete setting by key
  static async deleteByKey(key) {
    const query = 'DELETE FROM settings WHERE key = $1 RETURNING *';
    
    try {
      const result = await pgPool.query(query, [key]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error deleting setting:', error);
      throw error;
    }
  }

  // Get public settings (for frontend)
  static async getPublicSettings() {
    const query = 'SELECT key, value, type FROM settings WHERE is_public = true ORDER BY category, key';
    
    try {
      const result = await pgPool.query(query);
      const settings = {};
      result.rows.forEach(row => {
        let value = row.value;
        // Parse value based on type
        if (row.type === 'boolean') {
          value = value === 'true';
        } else if (row.type === 'number') {
          value = parseFloat(value);
        } else if (row.type === 'json') {
          try {
            value = JSON.parse(value);
          } catch (e) {
            // Keep as string if JSON parse fails
          }
        }
        settings[row.key] = value;
      });
      return settings;
    } catch (error) {
      console.error('Error getting public settings:', error);
      throw error;
    }
  }

  // Initialize default settings
  static async initializeDefaults() {
    const defaults = [
      { key: 'app_name', value: 'VBMS', category: 'general', type: 'string', is_public: true },
      { key: 'app_version', value: '1.0.0', category: 'general', type: 'string', is_public: true },
      { key: 'maintenance_mode', value: 'false', category: 'system', type: 'boolean', is_public: true },
      { key: 'registration_enabled', value: 'true', category: 'auth', type: 'boolean', is_public: true },
      { key: 'max_file_upload_size', value: '10485760', category: 'system', type: 'number', is_public: false },
      { key: 'email_notifications_enabled', value: 'true', category: 'notifications', type: 'boolean', is_public: false },
      { key: 'stripe_enabled', value: 'false', category: 'payments', type: 'boolean', is_public: false },
      { key: 'openai_enabled', value: 'false', category: 'ai', type: 'boolean', is_public: false }
    ];

    try {
      for (const setting of defaults) {
        await this.upsert(setting.key, setting.value, {
          category: setting.category,
          type: setting.type,
          is_public: setting.is_public,
          description: `Default ${setting.key} setting`
        });
      }
      console.log('✅ Default settings initialized');
    } catch (error) {
      console.error('❌ Error initializing default settings:', error);
      throw error;
    }
  }
}

module.exports = Settings;
