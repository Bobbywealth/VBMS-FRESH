const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://vbms_official_database_user:xNSBQdx8Lg1pe6sO9r5wwFsILiFKr8bm@dpg-d4219j9r0fns738rnjb0-a.oregon-postgres.render.com/vbms_official_database',
    ssl: {
        rejectUnauthorized: false
    }
});

async function fixTables() {
    try {
        await client.connect();
        console.log('Connected to database...\n');

        // Drop old tables
        console.log('Dropping old time_logs table...');
        await client.query('DROP TABLE IF EXISTS breaks CASCADE');
        await client.query('DROP TABLE IF EXISTS time_logs CASCADE');

        // Create new time_logs table with correct structure
        console.log('Creating new time_logs table...');
        await client.query(`
      CREATE TABLE time_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        clock_in TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        clock_out TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create breaks table
        console.log('Creating breaks table...');
        await client.query(`
      CREATE TABLE breaks (
        id SERIAL PRIMARY KEY,
        time_log_id INTEGER REFERENCES time_logs(id),
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        console.log('\n✅ Tables created successfully!');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

fixTables();
