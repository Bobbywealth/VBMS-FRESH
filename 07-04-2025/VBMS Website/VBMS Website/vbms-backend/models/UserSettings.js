const { pgPool } = require('../config/database');

class UserSettings {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.businessName = data.business_name;
    this.businessEmail = data.business_email;
    this.businessPhone = data.business_phone;
    this.businessAddress = data.business_address;
    this.businessDescription = data.business_description;
    this.logoUrl = data.logo_url;
    this.logoKey = data.logo_key;
    this.emailNotifications = data.email_notifications;
    this.smsNotifications = data.sms_notifications;
    this.orderNotifications = data.order_notifications;
    this.marketingNotifications = data.marketing_notifications;
    this.uberEatsConnected = data.uber_eats_connected;
    this.uberEatsStoreId = data.uber_eats_store_id;
    this.doorDashConnected = data.door_dash_connected;
    this.grubhubConnected = data.grubhub_connected;
    this.cloverConnected = data.clover_connected;
    this.theme = data.theme;
    this.language = data.language;
    this.timezone = data.timezone;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  // Find settings by user ID
  static async findByUserId(userId) {
    try {
      const result = await pgPool.query(
        'SELECT * FROM user_settings WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new UserSettings(result.rows[0]);
    } catch (error) {
      console.error('Error finding settings by user ID:', error);
      throw error;
    }
  }

  // Create or update settings
  static async upsert(userId, settingsData) {
    try {
      const existing = await this.findByUserId(userId);
      
      if (existing) {
        // Update existing
        const updateFields = [];
        const values = [];
        let paramIndex = 1;

        Object.keys(settingsData).forEach(key => {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updateFields.push(`${dbKey} = $${paramIndex}`);
          values.push(settingsData[key]);
          paramIndex++;
        });

        updateFields.push(`updated_at = $${paramIndex}`);
        values.push(new Date());
        values.push(userId);

        const updateQuery = `
          UPDATE user_settings 
          SET ${updateFields.join(', ')} 
          WHERE user_id = $${paramIndex}
          RETURNING *
        `;

        const result = await pgPool.query(updateQuery, values);
        return new UserSettings(result.rows[0]);
      } else {
        // Create new
        const fields = Object.keys(settingsData);
        const dbFields = fields.map(key => key.replace(/([A-Z])/g, '_$1').toLowerCase());
        const placeholders = fields.map((_, i) => `$${i + 1}`);
        
        dbFields.push('user_id');
        placeholders.push(`$${fields.length + 1}`);
        
        const values = [...Object.values(settingsData), userId];

        const insertQuery = `
          INSERT INTO user_settings (${dbFields.join(', ')}) 
          VALUES (${placeholders.join(', ')}) 
          RETURNING *
        `;

        const result = await pgPool.query(insertQuery, values);
        return new UserSettings(result.rows[0]);
      }
    } catch (error) {
      console.error('Error upserting settings:', error);
      throw error;
    }
  }

  // Convert to JSON for API response
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      businessName: this.businessName,
      businessEmail: this.businessEmail,
      businessPhone: this.businessPhone,
      businessAddress: this.businessAddress,
      businessDescription: this.businessDescription,
      logoUrl: this.logoUrl,
      logoKey: this.logoKey,
      emailNotifications: this.emailNotifications,
      smsNotifications: this.smsNotifications,
      orderNotifications: this.orderNotifications,
      marketingNotifications: this.marketingNotifications,
      uberEatsConnected: this.uberEatsConnected,
      uberEatsStoreId: this.uberEatsStoreId,
      doorDashConnected: this.doorDashConnected,
      grubhubConnected: this.grubhubConnected,
      cloverConnected: this.cloverConnected,
      theme: this.theme,
      language: this.language,
      timezone: this.timezone,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = UserSettings;

