const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://vbms_official_database_user:xNSBQdx8Lg1pe6sO9r5wwFsILiFKr8bm@dpg-d4219j9r0fns738rnjb0-a.oregon-postgres.render.com/vbms_official_database',
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkTables() {
    try {
        await client.connect();
        console.log('Connected to database...\n');

        // Check if time_logs table exists
        const timeLogs = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'time_logs'
      ORDER BY ordinal_position
    `);

        console.log('=== TIME_LOGS TABLE ===');
        if (timeLogs.rows.length === 0) {
            console.log('❌ Table does not exist!');
        } else {
            timeLogs.rows.forEach(col => {
                console.log(`  ${col.column_name}: ${col.data_type}`);
            });
        }

        // Check if breaks table exists
        const breaks = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'breaks'
      ORDER BY ordinal_position
    `);

        console.log('\n=== BREAKS TABLE ===');
        if (breaks.rows.length === 0) {
            console.log('❌ Table does not exist!');
        } else {
            breaks.rows.forEach(col => {
                console.log(`  ${col.column_name}: ${col.data_type}`);
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkTables();
