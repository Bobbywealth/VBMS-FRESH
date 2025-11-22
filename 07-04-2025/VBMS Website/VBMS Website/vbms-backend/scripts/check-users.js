const { Pool } = require('pg');
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

const listUsers = async () => {
    const client = await pool.connect();
    try {
        console.log('🔍 Checking users in database...');
        const res = await client.query('SELECT id, email, role, is_active FROM users');
        console.log('Users found:', res.rows);
    } catch (err) {
        console.error('❌ Error querying users:', err);
    } finally {
        client.release();
        pool.end();
    }
};

listUsers();
