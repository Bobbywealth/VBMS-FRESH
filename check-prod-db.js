const { Pool } = require('pg');

// Use the PRODUCTION database URL from render.yaml
const DATABASE_URL = 'postgresql://vbms_official_database_user:xNSBQdx8Lg1pe6sO9r5wwFsILiFKr8bm@dpg-d4219j9r0fns738rnjb0-a.oregon-postgres.render.com/vbms_official_database';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Render
});

async function checkProdDatabase() {
  console.log('\n📊 VBMS PRODUCTION DATABASE DIAGNOSTIC\n');
  console.log('━'.repeat(70));
  
  try {
    console.log('\n1️⃣  Connecting to Production Database on Render...');
    const client = await pool.connect();
    
    const result = await client.query('SELECT NOW()');
    console.log(`✅ Connected Successfully!`);
    console.log(`   Server Time: ${result.rows[0].now}`);
    console.log(`   Database: vbms_official_database`);
    console.log(`   Host: dpg-d4219j9r0fns738rnjb0-a.oregon-postgres.render.com`);
    
    // Get all tables
    console.log('\n2️⃣  Checking Tables...');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`✅ Found ${tables.rows.length} table(s):`);
    tables.rows.forEach(t => console.log(`   - ${t.table_name}`));
    
    // Check USERS table
    console.log('\n3️⃣  Checking USERS Table...');
    try {
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      const userRows = await client.query('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC LIMIT 10');
      
      console.log(`✅ Users Table Found`);
      console.log(`   Total Users: ${userCount.rows[0].count}`);
      
      if (userRows.rows.length > 0) {
        console.log('\n   📋 Users in Database:');
        console.log('   ' + '─'.repeat(66));
        userRows.rows.forEach((user, i) => {
          console.log(`   ${i+1}. Email: ${user.email}`);
          console.log(`      Name: ${user.name}`);
          console.log(`      Role: ${user.role}`);
          console.log(`      Status: ${user.status}`);
          console.log(`      Created: ${user.created_at}`);
          console.log('   ' + '─'.repeat(66));
        });
      } else {
        console.log('   ⚠️  NO USERS FOUND IN DATABASE!');
      }
    } catch (err) {
      console.log(`   ⚠️  Users table error: ${err.message}`);
    }
    
    // Check ORDERS table
    console.log('\n4️⃣  Checking Other Tables...');
    try {
      const orderCount = await client.query('SELECT COUNT(*) as count FROM orders');
      console.log(`✅ Orders: ${orderCount.rows[0].count} records`);
    } catch (err) {
      console.log(`   ⚠️  Orders table error: ${err.message}`);
    }
    
    try {
      const taskCount = await client.query('SELECT COUNT(*) as count FROM tasks');
      console.log(`✅ Tasks: ${taskCount.rows[0].count} records`);
    } catch (err) {
      console.log(`   ⚠️  Tasks table error: ${err.message}`);
    }
    
    client.release();
    
    // Summary & Next Steps
    console.log('\n' + '━'.repeat(70));
    console.log('\n🎯 SUMMARY & NEXT STEPS:');
    console.log('\nTo login with test credentials, run:');
    console.log('   npm run seed-db');
    console.log('\nTest Credentials:');
    console.log('   Admin: admin@vbmstest.com / admin123');
    console.log('   Customer: customer@vbmstest.com / customer123');
    
  } catch (error) {
    console.error('\n❌ CONNECTION ERROR:');
    console.error(`   ${error.message}`);
    console.log('\n💡 This is expected - the database may not be accessible');
    console.log('   from your local machine without proper network access.');
  } finally {
    await pool.end();
    console.log('\n');
  }
}

checkProdDatabase();

