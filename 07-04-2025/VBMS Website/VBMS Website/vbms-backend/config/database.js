const { Pool } = require('pg');

// Only load .env in development - Railway provides env vars in production
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

console.log('🔗 DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
console.log('🔗 DATABASE_URL value:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + '...' : 'undefined');
console.log('🔗 NODE_ENV:', process.env.NODE_ENV);

// Parse DATABASE_URL if provided, otherwise use individual env vars
let postgresConfig;

if (process.env.DATABASE_URL) {
    console.log('✅ Using DATABASE_URL connection string');
    postgresConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };
} else {
    console.log('⚠️ DATABASE_URL not found, using individual env vars (will fail)');
    postgresConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'vbms_development',
        user: process.env.DB_USER || process.env.USER,
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };
}

const pgPool = new Pool(postgresConfig);

pgPool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pgPool.on('error', (err) => {
    console.error('❌ PostgreSQL connection error:', err);
});

const initializeDatabase = async () => {
    console.log('🔄 Initializing PostgreSQL database...');
    
    try {
        const client = await pgPool.connect();
        const result = await client.query('SELECT NOW() as current_time');
        client.release();
        console.log('✅ PostgreSQL connection successful:', result.rows[0].current_time);
        
        await createTables();
        
    } catch (error) {
        console.error('❌ PostgreSQL initialization error:', error);
        throw error;
    }
    
    console.log('🎯 PostgreSQL database initialization complete');
};

const createTables = async () => {
    const client = await pgPool.connect();
    
    try {
        console.log('📋 Creating PostgreSQL tables...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                role VARCHAR(50) DEFAULT 'customer',
                status VARCHAR(50) DEFAULT 'active',
                email_verified BOOLEAN DEFAULT false,
                phone VARCHAR(20),
                avatar_url TEXT,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

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

        // Settings table
        await client.query(`
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
        `);

        // Analytics table
        await client.query(`
            CREATE TABLE IF NOT EXISTS analytics (
                id SERIAL PRIMARY KEY,
                event_type VARCHAR(100) NOT NULL,
                event_data JSONB DEFAULT '{}',
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                session_id VARCHAR(255),
                ip_address INET,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Analytics indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
        `);
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at);
        `);

        // Tasks table
        await client.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                priority VARCHAR(20) DEFAULT 'medium',
                assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                due_date TIMESTAMP,
                completed_at TIMESTAMP,
                tags TEXT[] DEFAULT '{}',
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Notifications table
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                read BOOLEAN DEFAULT false,
                action_url TEXT,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP
            )
        `);

        // Calendar events table
        await client.query(`
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

        // Create indexes for Phase 2 tables
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
            CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
            CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
            CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
            CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
            CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);
            CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON calendar_events(created_by);
            CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);
            CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(event_type);
        `);

        console.log('✅ PostgreSQL tables created successfully');
        
        // Initialize default settings
        try {
            const Settings = require('../models/Settings');
            await Settings.initializeDefaults();
        } catch (settingsError) {
            console.log('⚠️ Settings initialization skipped (will initialize on first use)');
        }
        
    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
    } finally {
        client.release();
    }
};

const query = async (text, params) => {
    try {
        const res = await pgPool.query(text, params);
        return res;
    } catch (error) {
        console.error('❌ Query error:', error);
        throw error;
    }
};

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