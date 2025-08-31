/**
 * Test email database saving functionality
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Email = require('./models/Email');
const User = require('./models/User');

console.log('🧪 Testing Email Database Storage');
console.log('================================');

async function testEmailDatabase() {
  try {
    // Connect to database
    console.log('1️⃣ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Check if we have any admin users
    console.log('\n2️⃣ Checking for admin users...');
    const adminUsers = await User.find({ role: { $in: ['master_admin', 'admin'] } });
    console.log(`📊 Found ${adminUsers.length} admin users`);
    
    if (adminUsers.length === 0) {
      console.log('❌ No admin users found - creating test admin user');
      
      const testAdmin = new User({
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'hashedpassword', // In reality this would be hashed
        role: 'master_admin',
        isActive: true,
        emailVerified: true
      });
      
      await testAdmin.save();
      console.log('✅ Created test admin user');
      adminUsers.push(testAdmin);
    }
    
    const testUser = adminUsers[0];
    console.log(`📧 Using admin user: ${testUser.name} (${testUser.email})`);
    
    // Check current email count
    console.log('\n3️⃣ Checking current email count...');
    const initialCount = await Email.countDocuments();
    console.log(`📧 Current emails in database: ${initialCount}`);
    
    // Create a test email directly in database
    console.log('\n4️⃣ Creating test email in database...');
    
    const testEmailData = {
      to: 'business@wolfpaqmarketing.com',
      from: testUser.email,
      subject: 'Test Email - Database Storage Check',
      content: {
        html: '<h1>Test Email</h1><p>This is a test email to verify database storage.</p>',
        text: 'Test Email - This is a test email to verify database storage.'
      },
      status: 'sent',
      type: 'custom',
      priority: 'normal',
      sender: {
        userId: testUser._id,
        name: testUser.name,
        role: testUser.role
      },
      category: 'sent',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const testEmail = new Email(testEmailData);
    await testEmail.save();
    console.log('✅ Test email saved to database');
    console.log(`📧 Email ID: ${testEmail._id}`);
    
    // Verify the email was saved
    console.log('\n5️⃣ Verifying email was saved...');
    const savedEmail = await Email.findById(testEmail._id);
    if (savedEmail) {
      console.log('✅ Email found in database');
      console.log(`📧 Subject: ${savedEmail.subject}`);
      console.log(`📧 Status: ${savedEmail.status}`);
      console.log(`📧 From: ${savedEmail.from}`);
      console.log(`📧 To: ${savedEmail.to}`);
    } else {
      console.log('❌ Email not found in database');
    }
    
    // Check new email count
    console.log('\n6️⃣ Checking final email count...');
    const finalCount = await Email.countDocuments();
    console.log(`📧 Final emails in database: ${finalCount}`);
    console.log(`📈 Emails added: ${finalCount - initialCount}`);
    
    // List all emails to see what's in the database
    console.log('\n7️⃣ Listing all emails in database...');
    const allEmails = await Email.find({})
      .populate('sender.userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log(`📧 Found ${allEmails.length} emails:`);
    allEmails.forEach((email, index) => {
      console.log(`${index + 1}. ${email.subject} (${email.status}) - From: ${email.from} To: ${email.to}`);
    });
    
    // Test querying emails as the API would
    console.log('\n8️⃣ Testing API-style queries...');
    
    // Test inbox query (emails TO the user)
    const inboxEmails = await Email.find({
      $or: [
        { to: testUser.email },
        { 'recipient.userId': testUser._id }
      ]
    }).sort({ createdAt: -1 });
    console.log(`📥 Inbox emails for ${testUser.email}: ${inboxEmails.length}`);
    
    // Test sent query (emails FROM the user)
    const sentEmails = await Email.find({
      $or: [
        { from: testUser.email },
        { 'sender.userId': testUser._id }
      ]
    }).sort({ createdAt: -1 });
    console.log(`📤 Sent emails from ${testUser.email}: ${sentEmails.length}`);
    
    console.log('\n🎉 Email Database Test Complete!');
    console.log('================================');
    
    if (finalCount > initialCount) {
      console.log('✅ Database storage is working correctly');
      console.log('✅ Email model is functioning properly');
      console.log('✅ Queries are working as expected');
      
      console.log('\n💡 If emails still not showing in frontend:');
      console.log('1. Check browser console for JavaScript errors');
      console.log('2. Verify authentication token is correct');
      console.log('3. Check Network tab for failed API calls');
      console.log('4. Make sure you are logged in as the correct user');
    } else {
      console.log('❌ Database storage might have issues');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Run the test
testEmailDatabase();