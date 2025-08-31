/**
 * Check the actual role of bobbyadmin@vbms.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkUserRole() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const user = await User.findOne({ email: 'bobbyadmin@vbms.com' });
    
    if (user) {
      console.log('👤 User found:');
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: "${user.role}" (type: ${typeof user.role})`);
      console.log(`   Status: ${user.status}`);
      console.log(`   ID: ${user._id}`);
      
      console.log('\n📋 Valid role enum values:');
      console.log('   - main_admin');
      console.log('   - admin');
      console.log('   - support');
      console.log('   - customer');
      console.log('   - client');
      
      // Check if role needs to be fixed
      if (user.role === 'Admin') {
        console.log('\n🔧 Fixing role from "Admin" to "admin"...');
        user.role = 'admin';
        await user.save();
        console.log('✅ Role updated to "admin"');
      } else if (user.role === 'Main Admin') {
        console.log('\n🔧 Fixing role from "Main Admin" to "main_admin"...');
        user.role = 'main_admin';
        await user.save();
        console.log('✅ Role updated to "main_admin"');
      }
      
    } else {
      console.log('❌ User bobbyadmin@vbms.com not found');
      
      console.log('\n🔍 Looking for similar users...');
      const allUsers = await User.find({}).select('name email role');
      console.log(`Found ${allUsers.length} total users:`);
      allUsers.forEach(u => {
        console.log(`   - ${u.name} (${u.email}) - Role: "${u.role}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkUserRole();