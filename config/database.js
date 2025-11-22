const { Pool } = require('pg');
require('dotenv').config();

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
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ PostgreSQL connection successful');

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
        // Users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
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
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

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
    const start = Date.now();
    const res = await pgPool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Query executed', { text: text.substring(0, 50) + '...', duration, rows: res.rowCount });
    return res;
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