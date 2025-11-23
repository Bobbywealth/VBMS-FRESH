const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://vbms_official_database_user:xNSBQdx8Lg1pe6sO9r5wwFsILiFKr8bm@dpg-d4219j9r0fns738rnjb0-a.oregon-postgres.render.com/vbms_official_database',
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkPins() {
    try {
        await client.connect();
        console.log('Connected to database...');

        const res = await client.query('SELECT id, first_name, last_name, email, pin_code, role FROM users');
        console.log('\n--- USERS & PINS ---');
        res.rows.forEach(u => {
            console.log(`User: ${u.first_name} ${u.last_name} (${u.email}) | Role: ${u.role} | PIN: ${u.pin_code}`);
        });
        console.log('--------------------\n');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkPins();
