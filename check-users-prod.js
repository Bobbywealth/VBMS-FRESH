const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://vbms_official_database_user:xNSBQdx8Lg1pe6sO9r5wwFsILiFKr8bm@dpg-d4219j9r0fns738rnjb0-a.oregon-postgres.render.com/vbms_official_database';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUsers() {
  console.log('\n📊 PRODUCTION DATABASE - USERS TABLE\n');
  console.log('━'.repeat(70));
  
  try {
    const client = await pool.connect();
    
    // Get table structure
    console.log('\n1️⃣  Users Table Structure:');
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Get all users
    console.log('\n2️⃣  All Users in Database:');
    const users = await client.query('SELECT * FROM users ORDER BY created_at DESC LIMIT 20');
    
    console.log(`   Total: ${users.rows.length} user(s)\n`);
    
    if (users.rows.length > 0) {
      users.rows.forEach((user, i) => {
        console.log(`   ${i+1}. Email: ${user.email}`);
        console.log(`      First Name: ${user.first_name || '(none)'}`);
        console.log(`      Last Name: ${user.last_name || '(none)'}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      Active: ${user.is_active}`);
        console.log(`      Created: ${user.created_at}`);
        console.log('      ' + '─'.repeat(62));
      });
    } else {
      console.log('   ⚠️  NO USERS FOUND!');
    }
    
    client.release();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
  }
  
  console.log('\n' + '━'.repeat(70) + '\n');
}

checkUsers();
