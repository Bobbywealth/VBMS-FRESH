require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// PostgreSQL connection - using the production database
const pool = new Pool({
  connectionString: 'postgresql://vbms_official_database_user:xNSBQdx8Lg1pe6sO9r5wwFsILiFKr8bm@dpg-d4219j9r0fns738rnjb0-a.oregon-postgres.render.com/vbms_official_database',
  ssl: { rejectUnauthorized: false }
});

async function createProductionAccounts() {
  try {
    console.log('🔗 Connecting to Production PostgreSQL...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to Production PostgreSQL');

    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('⚠️ Users table does not exist. Creating it...');
      
      // Create users table
      await pool.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          role VARCHAR(50) DEFAULT 'customer',
          status VARCHAR(50) DEFAULT 'active',
          phone VARCHAR(20),
          business VARCHAR(255),
          position VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Users table created');
    } else {
      console.log('✅ Users table exists');
    }

    // Check if admin accounts already exist
    const existingAdmin = await pool.query('SELECT email FROM users WHERE email = $1', ['admin@vbmstest.com']);
    
    if (existingAdmin.rows.length > 0) {
      console.log('⚠️ Admin accounts already exist. Updating passwords...');
      
      // Update existing accounts with new passwords
      const adminPassword = await bcrypt.hash('admin123', 10);
      const founderPassword = await bcrypt.hash('Xrprich12$', 10);
      const customerPassword = await bcrypt.hash('customer123', 10);
      
      await pool.query(`
        UPDATE users SET password = $1, updated_at = NOW() 
        WHERE email = $2
      `, [adminPassword, 'admin@vbmstest.com']);
      
      await pool.query(`
        UPDATE users SET password = $1, updated_at = NOW() 
        WHERE email = $2
      `, [adminPassword, 'admin2@vbmstest.com']);
      
      await pool.query(`
        UPDATE users SET password = $1, updated_at = NOW() 
        WHERE email = $2
      `, [founderPassword, 'BobbyAdmin@vbms.com']);
      
      await pool.query(`
        UPDATE users SET password = $1, updated_at = NOW() 
        WHERE email = $2
      `, [customerPassword, 'customer@vbmstest.com']);
      
      console.log('✅ Passwords updated for existing accounts');
    } else {
      console.log('🔧 Creating new admin accounts...');
      
      // Hash passwords
      const adminPassword = await bcrypt.hash('admin123', 10);
      const founderPassword = await bcrypt.hash('Xrprich12$', 10);
      const customerPassword = await bcrypt.hash('customer123', 10);

      // Create main admin user
      const mainAdmin = await pool.query(`
        INSERT INTO users (email, password, first_name, last_name, role, status, phone, business, position, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id, email, role;
      `, [
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
      const admin = await pool.query(`
        INSERT INTO users (email, password, first_name, last_name, role, status, phone, business, position, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id, email, role;
      `, [
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
      const founder = await pool.query(`
        INSERT INTO users (email, password, first_name, last_name, role, status, phone, business, position, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id, email, role;
      `, [
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
      const customer = await pool.query(`
        INSERT INTO users (email, password, first_name, last_name, role, status, phone, business, position, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id, email, role;
      `, [
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
    }

    // Create additional test customer for design work
    const designCustomerPassword = await bcrypt.hash('design123', 10);
    
    // Check if design customer exists
    const existingDesignCustomer = await pool.query('SELECT email FROM users WHERE email = $1', ['design@vbmstest.com']);
    
    if (existingDesignCustomer.rows.length === 0) {
      const designCustomer = await pool.query(`
        INSERT INTO users (email, password, first_name, last_name, role, status, phone, business, position, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id, email, role;
      `, [
        'design@vbmstest.com',
        designCustomerPassword,
        'Design',
        'Customer',
        'customer',
        'active',
        '+1-555-2001',
        'Design Test Business',
        'Business Owner'
      ]);

      console.log('✅ Design Test Customer created:', designCustomer.rows[0]);
    } else {
      // Update existing design customer password
      await pool.query(`
        UPDATE users SET password = $1, updated_at = NOW() 
        WHERE email = $2
      `, [designCustomerPassword, 'design@vbmstest.com']);
      console.log('✅ Design Test Customer password updated');
    }

    console.log('\n🎉 All production accounts ready!');
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
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│ DESIGN TEST CUSTOMER (NEW!)                            │');
    console.log('│ Email: design@vbmstest.com                              │');
    console.log('│ Password: design123                                     │');
    console.log('└─────────────────────────────────────────────────────────┘');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating production accounts:', error);
    process.exit(1);
  }
}

createProductionAccounts();
