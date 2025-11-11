require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkDatabase() {
  console.log('\n📊 VBMS DATABASE DIAGNOSTIC REPORT\n');
  console.log('━'.repeat(60));
  
  try {
    // Test connection
    console.log('\n1️⃣  Testing Database Connection...');
    const testClient = await pool.connect();
    const result = await testClient.query('SELECT NOW()');
    testClient.release();
    console.log('✅ Database Connected Successfully');
    console.log(`   Current Time: ${result.rows[0].now}`);
    
    // Get all tables
    console.log('\n2️⃣  Checking Tables...');
    const client = await pool.connect();
    
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
      const userRows = await client.query('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC');
      
      console.log(`✅ Users Table Found`);
      console.log(`   Total Users: ${userCount.rows[0].count}`);
      
      if (userRows.rows.length > 0) {
        console.log('\n   📋 All Users in Database:');
        console.log('   ' + '─'.repeat(56));
        userRows.rows.forEach((user, i) => {
          console.log(`   ${i+1}. Email: ${user.email}`);
          console.log(`      Name: ${user.name}`);
          console.log(`      Role: ${user.role}`);
          console.log(`      Status: ${user.status}`);
          console.log(`      Created: ${user.created_at}`);
          console.log('   ' + '─'.repeat(56));
        });
      } else {
        console.log('   ⚠️  NO USERS FOUND IN DATABASE!');
      }
    } catch (err) {
      console.log(`   ⚠️  Users table error: ${err.message}`);
    }
    
    // Check ORDERS table
    console.log('\n4️⃣  Checking ORDERS Table...');
    try {
      const orderCount = await client.query('SELECT COUNT(*) as count FROM orders');
      console.log(`✅ Orders Table Found`);
      console.log(`   Total Orders: ${orderCount.rows[0].count}`);
    } catch (err) {
      console.log(`   ⚠️  Orders table error: ${err.message}`);
    }
    
    // Check TASKS table
    console.log('\n5️⃣  Checking TASKS Table...');
    try {
      const taskCount = await client.query('SELECT COUNT(*) as count FROM tasks');
      console.log(`✅ Tasks Table Found`);
      console.log(`   Total Tasks: ${taskCount.rows[0].count}`);
    } catch (err) {
      console.log(`   ⚠️  Tasks table error: ${err.message}`);
    }
    
    client.release();
    
    // Summary
    console.log('\n' + '━'.repeat(60));
    console.log('\n✨ DATABASE SUMMARY:');
    console.log(`   Status: ✅ CONNECTED`);
    console.log(`   Database URL: ${process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`   Node Environment: ${process.env.NODE_ENV || 'development'}`);
    
  } catch (error) {
    console.error('\n❌ DATABASE CONNECTION ERROR:');
    console.error(`   ${error.message}`);
    console.log('\n💡 TROUBLESHOOTING:');
    console.log('   1. Check if DATABASE_URL is set in .env');
    console.log('   2. Verify PostgreSQL server is running');
    console.log('   3. Check credentials in DATABASE_URL');
  } finally {
    await pool.end();
    console.log('\n');
  }
}

checkDatabase();

