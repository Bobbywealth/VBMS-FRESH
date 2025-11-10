require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// PostgreSQL connection
const pool = new Pool({
  connectionString: 'postgresql://vbms_official_database_user:xNSBQdx8Lg1pe6sO9r5wwFsILiFKr8bm@dpg-d4219j9r0fns738rnjb0-a.oregon-postgres.render.com/vbms_official_database',
  ssl: { rejectUnauthorized: false }
});

async function createTestAdmins() {
  try {
    console.log('🔗 Connecting to PostgreSQL...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL');

    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const founderPassword = await bcrypt.hash('Xrprich12$', 10);

    // Create main admin user
    const mainAdminQuery = `
      INSERT INTO users (email, password, first_name, last_name, role, status, phone, business, position, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING id, email, role;
    `;

    const mainAdmin = await pool.query(mainAdminQuery, [
      'admin@vbmstest.com',
      adminPassword,
      'VBMS',
      'Main Admin',
      'main_admin',
      'active',
      '+1-555-0001',
      'VBMS Test Company',
      'System Administrator'
    ]);

    console.log('✅ Main Admin created:', mainAdmin.rows[0]);

    // Create regular admin user
    const admin = await pool.query(mainAdminQuery, [
      'admin2@vbmstest.com',
      adminPassword,
      'VBMS',
      'Admin',
      'admin',
      'active',
      '+1-555-0002',
      'VBMS Test Company',
      'Administrator'
    ]);

    console.log('✅ Regular Admin created:', admin.rows[0]);

    // Create founder account
    const founder = await pool.query(mainAdminQuery, [
      'BobbyAdmin@vbms.com',
      founderPassword,
      'Bobby',
      'Admin',
      'main_admin',
      'active',
      '+1-555-0000',
      'VBMS',
      'Founder'
    ]);

    console.log('✅ Founder account created:', founder.rows[0]);

    // Create test customer
    const customerPassword = await bcrypt.hash('customer123', 10);
    const customer = await pool.query(mainAdminQuery, [
      'customer@vbmstest.com',
      customerPassword,
      'Test',
      'Customer',
      'customer',
      'active',
      '+1-555-1001',
      'Test Business',
      'Owner'
    ]);

    console.log('✅ Test Customer created:', customer.rows[0]);

    console.log('\n🎉 All test accounts created successfully!');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│ MAIN ADMIN                                              │');
    console.log('│ Email: admin@vbmstest.com                               │');
    console.log('│ Password: admin123                                      │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│ REGULAR ADMIN                                           │');
    console.log('│ Email: admin2@vbmstest.com                              │');
    console.log('│ Password: admin123                                      │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│ FOUNDER                                                 │');
    console.log('│ Email: BobbyAdmin@vbms.com                              │');
    console.log('│ Password: Xrprich12$                                    │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│ TEST CUSTOMER                                           │');
    console.log('│ Email: customer@vbmstest.com                            │');
    console.log('│ Password: customer123                                   │');
    console.log('└─────────────────────────────────────────────────────────┘');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test accounts:', error);
    process.exit(1);
  }
}

createTestAdmins();
