const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL is not set!');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

const createUsers = async () => {
    const client = await pool.connect();
    try {
        console.log('🔄 Connected to DB. Creating users...');

        // Hash passwords
        const adminHash = await bcrypt.hash('admin123', 10);
        const customerHash = await bcrypt.hash('customer123', 10);

        // Create Admin
        const adminRes = await client.query(`
            INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (email) DO UPDATE 
            SET password = $2, role = $5
            RETURNING id, email, role;
        `, ['admin@vbms.com', adminHash, 'Admin', 'User', 'admin', true, true]);
        console.log('✅ Admin user created:', adminRes.rows[0]);

        // Create Customer
        const customerRes = await client.query(`
            INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (email) DO UPDATE 
            SET password = $2, role = $5
            RETURNING id, email, role;
        `, ['customer@vbms.com', customerHash, 'Test', 'Customer', 'customer', true, true]);
        console.log('✅ Customer user created:', customerRes.rows[0]);

    } catch (err) {
        console.error('❌ Error creating users:', err);
    } finally {
        client.release();
        await pool.end(); // Ensure pool is closed properly
        console.log('👋 Connection closed.');
    }
};

createUsers();
