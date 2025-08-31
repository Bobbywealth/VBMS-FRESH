/**
 * Create test emails for specific user: bobbyadmin@vbms.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Email = require('./models/Email');
const User = require('./models/User');

console.log('📧 Creating emails for bobbyadmin@vbms.com');
console.log('==========================================');

async function createEmailsForUser() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the user bobbyadmin@vbms.com
    const user = await User.findOne({ email: 'bobbyadmin@vbms.com' });
    
    if (!user) {
      console.log('❌ User bobbyadmin@vbms.com not found');
      console.log('Creating user...');
      
      const newUser = new User({
        name: 'Bobby Admin',
        email: 'bobbyadmin@vbms.com',
        password: 'hashedpassword',
        role: 'master_admin',
        isActive: true,
        emailVerified: true
      });
      
      await newUser.save();
      console.log('✅ Created user bobbyadmin@vbms.com');
      user = newUser;
    } else {
      console.log(`✅ Found user: ${user.name} (${user.email})`);
    }
    
    // Create a sent email
    console.log('\n📤 Creating sent email...');
    const sentEmail = new Email({
      to: 'business@wolfpaqmarketing.com',
      from: 'bobbyadmin@vbms.com',
      subject: 'Welcome Email - Sent by Bobby Admin',
      content: {
        html: '<h1>Welcome!</h1><p>This is a test email sent by Bobby Admin.</p>',
        text: 'Welcome! This is a test email sent by Bobby Admin.'
      },
      status: 'sent',
      type: 'welcome',
      priority: 'normal',
      sender: {
        userId: user._id,
        name: user.name,
        role: user.role
      },
      category: 'sent',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await sentEmail.save();
    console.log('✅ Sent email created');
    
    // Create an inbox email (someone sent email TO bobbyadmin)
    console.log('\n📥 Creating inbox email...');
    const inboxEmail = new Email({
      to: 'bobbyadmin@vbms.com',
      from: 'customer@example.com',
      subject: 'Customer Inquiry - Received by Bobby Admin',
      content: {
        html: '<p>Hello Bobby Admin, I have a question about VBMS...</p>',
        text: 'Hello Bobby Admin, I have a question about VBMS...'
      },
      status: 'delivered',
      type: 'support',
      priority: 'normal',
      recipient: {
        userId: user._id,
        name: user.name,
        role: user.role
      },
      category: 'inbox',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await inboxEmail.save();
    console.log('✅ Inbox email created');
    
    // Create another sent email
    console.log('\n📤 Creating another sent email...');
    const sentEmail2 = new Email({
      to: 'team@company.com',
      from: 'bobbyadmin@vbms.com',
      subject: 'Monthly Report - From Bobby Admin',
      content: {
        html: '<h2>Monthly Report</h2><p>Here is the monthly business report...</p>',
        text: 'Monthly Report: Here is the monthly business report...'
      },
      status: 'delivered',
      type: 'system',
      priority: 'high',
      sender: {
        userId: user._id,
        name: user.name,
        role: user.role
      },
      category: 'sent',
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      updatedAt: new Date(Date.now() - 86400000)
    });
    
    await sentEmail2.save();
    console.log('✅ Second sent email created');
    
    // Verify emails were created
    console.log('\n🔍 Verifying emails for bobbyadmin@vbms.com...');
    
    const sentEmails = await Email.find({
      $or: [
        { from: 'bobbyadmin@vbms.com' },
        { 'sender.userId': user._id }
      ]
    }).sort({ createdAt: -1 });
    
    const inboxEmails = await Email.find({
      $or: [
        { to: 'bobbyadmin@vbms.com' },
        { 'recipient.userId': user._id }
      ]
    }).sort({ createdAt: -1 });
    
    console.log(`📤 Sent emails: ${sentEmails.length}`);
    sentEmails.forEach((email, index) => {
      console.log(`   ${index + 1}. ${email.subject} → ${email.to} (${email.status})`);
    });
    
    console.log(`📥 Inbox emails: ${inboxEmails.length}`);
    inboxEmails.forEach((email, index) => {
      console.log(`   ${index + 1}. ${email.subject} ← ${email.from} (${email.status})`);
    });
    
    console.log('\n🎉 SUCCESS!');
    console.log('===========');
    console.log('✅ Created emails for bobbyadmin@vbms.com');
    console.log('✅ Now refresh your email management page');
    console.log('✅ You should see emails in both Inbox and Sent tabs');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

createEmailsForUser();