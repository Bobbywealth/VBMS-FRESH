process.env.NODE_ENV = 'production'; // Force SSL
process.env.DATABASE_URL = "postgresql://vbms_official_database_user:xNSBQdx8Lg1pe6sO9r5wwFsILiFKr8bm@dpg-d4219j9r0fns738rnjb0-a.oregon-postgres.render.com/vbms_official_database";
process.env.JWT_SECRET = "dev-secret";

const { pgPool } = require('./vbms-backend/config/database');

async function testConnection() {
    try {
        console.log('Testing DB connection...');
        const client = await pgPool.connect();
        console.log('Connected!');
        client.release();

        console.log('Starting server...');
        require('./vbms-backend/server.js');

    } catch (err) {
        console.error('Crash:', err);
    }
}

testConnection();
