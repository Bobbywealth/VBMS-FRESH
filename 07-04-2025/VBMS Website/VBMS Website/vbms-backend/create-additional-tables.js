const { pgPool } = require('./config/database');

async function createAdditionalTables() {
  const client = await pgPool.connect();
  
  try {
    console.log('Creating additional tables for new functionality...');
    
    // Business profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255),
        industry VARCHAR(100),
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);
    
    // Backup schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS backup_schedules (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        frequency VARCHAR(20) CHECK (frequency IN ('daily', 'weekly', 'monthly')),
        time TIME,
        retention INTEGER DEFAULT 30,
        email_notification BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);
    
    // Feature toggles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS feature_toggles (
        id SERIAL PRIMARY KEY,
        feature_key VARCHAR(100) UNIQUE NOT NULL,
        enabled BOOLEAN DEFAULT false,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // System logs table (for storing application logs)
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(20) CHECK (level IN ('error', 'warn', 'info', 'debug')),
        message TEXT NOT NULL,
        source VARCHAR(255),
        stack_trace TEXT,
        metadata JSONB,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Pricing analytics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pricing_analytics (
        id SERIAL PRIMARY KEY,
        date DATE DEFAULT CURRENT_DATE,
        total_revenue DECIMAL(10,2) DEFAULT 0,
        active_subscriptions INTEGER DEFAULT 0,
        new_subscriptions INTEGER DEFAULT 0,
        cancelled_subscriptions INTEGER DEFAULT 0,
        conversion_rate DECIMAL(5,2) DEFAULT 0,
        churn_rate DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(date)
      )
    `);
    
    // Subscription history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plan_id VARCHAR(100),
        stripe_subscription_id VARCHAR(255),
        status VARCHAR(50),
        started_at TIMESTAMP,
        ended_at TIMESTAMP,
        amount DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'USD',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Activity logs table (for user activity tracking)
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(100),
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Notifications table (for in-app notifications)
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50) DEFAULT 'info',
        read BOOLEAN DEFAULT false,
        action_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // Reports table (for generated reports)
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50),
        format VARCHAR(20) DEFAULT 'pdf',
        file_path VARCHAR(500),
        parameters JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `);
    
    // Insert default feature toggles
    await client.query(`
      INSERT INTO feature_toggles (feature_key, enabled, description) VALUES
      ('liveMonitoring', true, 'Real-time system monitoring'),
      ('orderManagement', true, 'Order processing and tracking'),
      ('inventoryTracker', true, 'Inventory management system'),
      ('customDashboard', true, 'Customizable dashboard widgets'),
      ('phoneSupport', true, 'Phone support integration'),
      ('aiAssistant', false, 'AI-powered assistant features'),
      ('advancedReporting', false, 'Advanced analytics and reporting'),
      ('multiLocation', false, 'Multi-location business support')
      ON CONFLICT (feature_key) DO NOTHING
    `);
    
    console.log('✅ Additional tables created successfully');
    
  } catch (error) {
    console.error('❌ Error creating additional tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  createAdditionalTables()
    .then(() => {
      console.log('Database setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createAdditionalTables };
