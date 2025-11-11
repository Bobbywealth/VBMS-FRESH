const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const DATABASE_URL = 'postgresql://vbms_official_database_user:xNSBQdx8Lg1pe6sO9r5wwFsILiFKr8bm@dpg-d4219j9r0fns738rnjb0-a.oregon-postgres.render.com/vbms_official_database';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seedUsers() {
  console.log('\n🌱 SEEDING TEST USERS TO PRODUCTION DATABASE\n');
  console.log('━'.repeat(70));
  
  try {
    const client = await pool.connect();
    
    console.log('\n1️⃣  Creating Test Users...\n');
    
    // Admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await client.query(`
      INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, role;
    `, ['admin@vbmstest.com', adminPassword, 'Admin', 'User', 'admin', true, true]);
    
    console.log(`   ✅ Admin created:`);
    console.log(`      Email: admin@vbmstest.com`);
    console.log(`      Password: admin123`);
    console.log(`      Role: admin\n`);
    
    // Regular admin
    const admin2Password = await bcrypt.hash('admin123', 10);
    const admin2 = await client.query(`
      INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, role;
    `, ['admin2@vbmstest.com', admin2Password, 'Secondary', 'Admin', 'admin', true, true]);
    
    console.log(`   ✅ Secondary Admin created:`);
    console.log(`      Email: admin2@vbmstest.com`);
    console.log(`      Password: admin123`);
    console.log(`      Role: admin\n`);
    
    // Main admin / Founder
    const founderPassword = await bcrypt.hash('Xrprich12$', 10);
    const founder = await client.query(`
      INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, role;
    `, ['BobbyAdmin@vbms.com', founderPassword, 'Bobby', 'Admin', 'main_admin', true, true]);
    
    console.log(`   ✅ Founder account created:`);
    console.log(`      Email: BobbyAdmin@vbms.com`);
    console.log(`      Password: Xrprich12$`);
    console.log(`      Role: main_admin\n`);
    
    // Test customer
    const customerPassword = await bcrypt.hash('customer123', 10);
    const customer = await client.query(`
      INSERT INTO users (email, password, first_name, last_name, role, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, role;
    `, ['customer@vbmstest.com', customerPassword, 'Test', 'Customer', 'customer', true, true]);
    
    console.log(`   ✅ Test Customer created:`);
    console.log(`      Email: customer@vbmstest.com`);
    console.log(`      Password: customer123`);
    console.log(`      Role: customer\n`);
    
    // Verify
    const verify = await client.query('SELECT COUNT(*) as count FROM users');
    
    console.log('━'.repeat(70));
    console.log(`\n✨ SEEDING COMPLETE!\n`);
    console.log(`   Total users now in database: ${verify.rows[0].count}`);
    console.log('\n📋 LOGIN CREDENTIALS:\n');
    console.log('   ADMIN LOGIN:');
    console.log('   URL: https://vbms-fresh-official-website-launch.onrender.com/login.html');
    console.log('   Email: admin@vbmstest.com');
    console.log('   Password: admin123\n');
    console.log('   CUSTOMER LOGIN:');
    console.log('   URL: https://vbms-fresh-official-website-launch.onrender.com/customer-login.html');
    console.log('   Email: customer@vbmstest.com');
    console.log('   Password: customer123\n');
    console.log('━'.repeat(70) + '\n');
    
    client.release();
    
  } catch (error) {
    console.error('\n❌ Error during seeding:', error.message);
    if (error.code === '23505') {
      console.error('   (Duplicate key - users may already exist)');
    }
  } finally {
    await pool.end();
  }
}

seedUsers();

