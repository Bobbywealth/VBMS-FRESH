const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://vbms_official_database_user:xNSBQdx8Lg1pe6sO9r5wwFsILiFKr8bm@dpg-d4219j9r0fns738rnjb0-a.oregon-postgres.render.com/vbms_official_database',
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkData() {
    try {
        await client.connect();
        console.log('Connected to database...\n');

        // 1. Get Customer
        const customer = await client.query("SELECT id, email, role FROM users WHERE email = 'customer@vbms.com'");
        console.log('Customer:', customer.rows[0]);

        // 2. Get Employee
        const employee = await client.query("SELECT id, first_name, email, pin_code, employer_id FROM users WHERE email = 'john.doe@example.com'");
        console.log('Employee:', employee.rows[0]);

        // 3. Get Time Logs
        const logs = await client.query("SELECT * FROM time_logs");
        console.log('Time Logs Count:', logs.rowCount);
        console.log('Time Logs:', logs.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkData();
