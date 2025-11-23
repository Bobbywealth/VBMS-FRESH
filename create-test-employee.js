const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
    connectionString: 'postgresql://vbms_official_database_user:xNSBQdx8Lg1pe6sO9r5wwFsILiFKr8bm@dpg-d4219j9r0fns738rnjb0-a.oregon-postgres.render.com/vbms_official_database',
    ssl: {
        rejectUnauthorized: false
    }
});

async function createEmployee() {
    try {
        await client.connect();
        console.log('Connected to database...');

        // Get customer ID
        const customerRes = await client.query("SELECT id FROM users WHERE email = 'customer@vbms.com'");
        if (customerRes.rows.length === 0) {
            console.log('Customer not found!');
            return;
        }
        const customerId = customerRes.rows[0].id;
        console.log('Customer ID:', customerId);

        // Create Employee
        const hash = await bcrypt.hash('employee123', 10);
        const pin = '5555';
        const email = 'john.doe@example.com';

        // Check if exists
        const check = await client.query("SELECT id FROM users WHERE email = $1", [email]);
        if (check.rows.length > 0) {
            console.log('Employee already exists. Updating PIN...');
            await client.query("UPDATE users SET pin_code = $1 WHERE email = $2", [pin, email]);
        } else {
            console.log('Creating new employee...');
            await client.query(`
        INSERT INTO users (first_name, last_name, email, password, role, pin_code, employer_id, is_active, email_verified)
        VALUES ($1, $2, $3, $4, 'employee', $5, $6, true, true)
      `, ['John', 'Doe', email, hash, pin, customerId]);
        }

        console.log('✅ Employee John Doe created with PIN 5555');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

createEmployee();
