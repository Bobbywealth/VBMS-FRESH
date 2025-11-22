const { Pool } = require('pg');
require('dotenv').config();

console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

// PostgreSQL Configuration
const postgresConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create PostgreSQL connection pool
const pgPool = new Pool(postgresConfig);

// Test PostgreSQL connection
pgPool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pgPool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

// Database initialization
const initializeDatabase = async () => {
  console.log('🔄 Initializing PostgreSQL database...');

  try {
    const client = await pgPool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    client.release();
    console.log('✅ PostgreSQL connection successful:', result.rows[0].current_time);
    console.log('🗄️  PostgreSQL version:', result.rows[0].postgres_version);

    // Create tables
    await createTables();

  } catch (error) {
    console.error('❌ PostgreSQL initialization error:', error);
    throw error;
  }

  console.log('🎯 PostgreSQL database initialization complete');
};

// Create tables if they don't exist
const createTables = async () => {
  const client = await pgPool.connect();

  try {
    console.log('📋 Creating PostgreSQL tables...');

    // Create or recreate users table
    console.log('🔄 Starting users table creation/recreation...');
    try {
      await client.query(`DROP TABLE IF EXISTS users CASCADE;`);
      console.log('✅ Dropped old users table (if existed)');
    } catch (error) {
      console.log('ℹ️  Drop table error (ignoring):', error.message);
    }

    console.log('🔄 Creating new users table...');
    // Users table
    await client.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                role VARCHAR(50) DEFAULT 'customer',
                is_active BOOLEAN DEFAULT true,
                email_verified BOOLEAN DEFAULT false,
                phone VARCHAR(20),
                avatar_url TEXT,
                stripe_customer_id VARCHAR(255),
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
    console.log('✅ Users table created successfully');

    // Create tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(20) DEFAULT 'medium',
        due_date TIMESTAMP,
        assigned_to INTEGER REFERENCES users(id),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create calendar_events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create emails table
    await client.query(`
      CREATE TABLE IF NOT EXISTS emails (
        id SERIAL PRIMARY KEY,
        subject VARCHAR(255),
        sender VARCHAR(255),
        recipient VARCHAR(255),
        body TEXT,
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER REFERENCES users(id)
      );
    `);

    // Create time_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        clock_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        clock_out TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active', -- 'active' or 'completed'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add pin_code to users if not exists
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10);
    `);

    // --- SEED INITIAL USERS ---
    const bcrypt = require('bcryptjs');

    // Check if admin exists
    const adminCheck = await client.query("SELECT * FROM users WHERE email = 'admin@vbms.com'");
    if (adminCheck.rows.length === 0) {
      console.log('🌱 Seeding Admin User...');
      const adminHash = await bcrypt.hash('admin123', 10);
      await client.query(`
        INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified, pin_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, ['admin@vbms.com', adminHash, 'Admin', 'User', 'admin', true, true, '1234']);
      console.log('✅ Admin User Created');
    } else {
      // Ensure admin has a PIN
      await client.query("UPDATE users SET pin_code = '1234' WHERE email = 'admin@vbms.com' AND pin_code IS NULL");
    }

    // Check if customer exists
    const customerCheck = await client.query("SELECT * FROM users WHERE email = 'customer@vbms.com'");
    if (customerCheck.rows.length === 0) {
      console.log('🌱 Seeding Customer User...');
      const customerHash = await bcrypt.hash('customer123', 10);
      await client.query(`
        INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified, pin_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, ['customer@vbms.com', customerHash, 'Test', 'Customer', 'customer', true, true, '0000']);
      console.log('✅ Customer User Created');
    } else {
      // Ensure customer has a PIN
      await client.query("UPDATE users SET pin_code = '0000' WHERE email = 'customer@vbms.com' AND pin_code IS NULL");
    }

    console.log('✅ Database initialized successfully');

    // Notifications table
    await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                is_read BOOLEAN DEFAULT false,
                action_url TEXT,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Affiliates table
    await client.query(`
            CREATE TABLE IF NOT EXISTS affiliates (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                affiliate_id VARCHAR(100) UNIQUE NOT NULL,
                referral_code VARCHAR(50) UNIQUE NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                tier VARCHAR(50) DEFAULT 'bronze',
                commission_rate DECIMAL(5,4) DEFAULT 0.1000,
                total_earnings DECIMAL(10,2) DEFAULT 0.00,
                total_referrals INTEGER DEFAULT 0,
                payment_info JSONB DEFAULT '{}',
                settings JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Create or recreate payments table
    console.log('🔄 Starting payments table creation/recreation...');
    try {
      // Drop old payments table if it exists with wrong schema
      await client.query(`DROP TABLE IF EXISTS payments CASCADE;`);
      console.log('✅ Dropped old payments table (if existed)');
    } catch (error) {
      console.log('ℹ️  Drop table error (ignoring):', error.message);
    }

    console.log('🔄 Creating new payments table...');
    // Create payments table with correct schema
    await client.query(`
          CREATE TABLE payments (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            email VARCHAR(255),
            amount DECIMAL(10,2) NOT NULL,
            stripe_payment_id VARCHAR(255) UNIQUE,
            status VARCHAR(50) DEFAULT 'pending',
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
    console.log('✅ Payments table created successfully');

    // Create indexes for payments
    await client.query(`
          CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
          CREATE INDEX IF NOT EXISTS idx_payments_stripe_id ON payments(stripe_payment_id);
          CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
          CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
          CREATE INDEX IF NOT EXISTS idx_payments_email ON payments(email);
        `);

    // Create subscriptions table
    console.log('🔄 Starting subscriptions table creation/recreation...');
    try {
      await client.query(`DROP TABLE IF EXISTS subscriptions CASCADE;`);
      console.log('✅ Dropped old subscriptions table (if existed)');
    } catch (error) {
      console.log('ℹ️  Drop table error (ignoring):', error.message);
    }

    console.log('🔄 Creating new subscriptions table...');
    await client.query(`
          CREATE TABLE subscriptions (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            package_type VARCHAR(50) NOT NULL,
            package_name VARCHAR(255) NOT NULL,
            price_monthly DECIMAL(10,2) DEFAULT 0,
            price_per_call DECIMAL(10,2) DEFAULT 0,
            price_setup DECIMAL(10,2) DEFAULT 0,
            status VARCHAR(50) DEFAULT 'active',
            stripe_subscription_id VARCHAR(255),
            stripe_customer_id VARCHAR(255),
            current_period_start TIMESTAMP,
            current_period_end TIMESTAMP,
            next_billing_date TIMESTAMP,
            last_payment_date TIMESTAMP,
            payment_failed_count INTEGER DEFAULT 0,
            cancelled_at TIMESTAMP,
            trial_end TIMESTAMP,
            feature_live_monitoring BOOLEAN DEFAULT FALSE,
            feature_order_management BOOLEAN DEFAULT FALSE,
            feature_phone_support BOOLEAN DEFAULT FALSE,
            feature_ai_phone BOOLEAN DEFAULT FALSE,
            feature_inventory_tracker BOOLEAN DEFAULT FALSE,
            feature_priority_support BOOLEAN DEFAULT FALSE,
            feature_custom_dashboard BOOLEAN DEFAULT FALSE,
            feature_advanced_analytics BOOLEAN DEFAULT FALSE,
            usage_monthly_hours INTEGER DEFAULT 0,
            usage_calls_count INTEGER DEFAULT 0,
            usage_last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            end_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
    console.log('✅ Subscriptions table created successfully');

    // Create indexes for subscriptions
    await client.query(`
          CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
          CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
          CREATE INDEX IF NOT EXISTS idx_subscriptions_package_type ON subscriptions(package_type);
          CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id);
          CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date);
        `);

    // Create user_settings table for customer settings
    await client.query(`
          CREATE TABLE IF NOT EXISTS user_settings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
            business_name VARCHAR(255),
            business_email VARCHAR(255),
            business_phone VARCHAR(50),
            business_address TEXT,
            business_description TEXT,
            logo_url TEXT,
            logo_key TEXT,
            email_notifications BOOLEAN DEFAULT true,
            sms_notifications BOOLEAN DEFAULT false,
            order_notifications BOOLEAN DEFAULT true,
            marketing_notifications BOOLEAN DEFAULT false,
            uber_eats_connected BOOLEAN DEFAULT false,
            uber_eats_store_id VARCHAR(255),
            door_dash_connected BOOLEAN DEFAULT false,
            grubhub_connected BOOLEAN DEFAULT false,
            clover_connected BOOLEAN DEFAULT false,
            theme VARCHAR(50) DEFAULT 'dark',
            language VARCHAR(10) DEFAULT 'en',
            timezone VARCHAR(100) DEFAULT 'UTC',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

    // Create index for user_settings
    await client.query(`
          CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
        `);

    console.log('✅ PostgreSQL tables created successfully');

  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Helper function to execute queries
const query = async (text, params) => {
  try {
    const start = Date.now();
    const res = await pgPool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Query executed in', duration + 'ms:', text.substring(0, 50) + '...');
    return res;
  } catch (error) {
    console.error('❌ Query error:', error);
    throw error;
  }
};

// Helper function to get a client from the pool
const getClient = async () => {
  const client = await pgPool.connect();
  return client;
};

module.exports = {
  pgPool,
  initializeDatabase,
  createTables,
  query,
  getClient
};