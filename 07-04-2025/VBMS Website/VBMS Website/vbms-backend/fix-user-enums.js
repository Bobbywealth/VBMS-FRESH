/**
 * Fix enum validation issues for bobbyadmin@vbms.com
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function fixUserEnums() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Use direct MongoDB update to bypass mongoose validation
    const result = await mongoose.connection.db.collection('users').updateOne(
      { email: 'bobbyadmin@vbms.com' },
      {
        $set: {
          role: 'admin',      // Fix: Admin → admin
          status: 'active'    // Fix: Active → active
        }
      }
    );
    
    if (result.matchedCount > 0) {
      console.log('✅ User enum values fixed');
      console.log(`   - Role: Admin → admin`);
      console.log(`   - Status: Active → active`);
      
      // Verify the fix
      const user = await mongoose.connection.db.collection('users').findOne(
        { email: 'bobbyadmin@vbms.com' }
      );
      
      console.log('\n🔍 Verified user data:');
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: "${user.role}"`);
      console.log(`   Status: "${user.status}"`);
      
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

fixUserEnums();