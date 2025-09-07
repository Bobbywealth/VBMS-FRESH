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
    console.log('⚠️ DATABASE_URL not found, using individual env vars');
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
