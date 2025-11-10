/**
 * Create emails involving business@wolfpaqmarketing.com that bobbyadmin@vbms.com can see
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Email = require('./models/Email');
const User = require('./models/User');

async function createBusinessEmails() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get both users
    const bobbyAdmin = await User.findOne({ email: 'bobbyadmin@vbms.com' });
    const businessUser = await User.findOne({ email: 'business@wolfpaqmarketing.com' });
    
    console.log('👤 Bobby Admin:', bobbyAdmin ? 'Found' : 'Not found');
    console.log('👤 Business User:', businessUser ? 'Found' : 'Not found');
    
    if (!bobbyAdmin || !businessUser) {
      console.log('❌ Required users not found');
      return;
    }
    
    console.log('\n📧 Creating emails involving both accounts...');
    
    // Email 1: Bobby Admin sends TO business@wolfpaqmarketing.com
    const emailToBusiness = new Email({
      to: 'business@wolfpaqmarketing.com',
      from: 'bobbyadmin@vbms.com',
      subject: 'Welcome to VBMS - Account Setup Complete',
      content: {
        html: '<h1>Welcome!</h1><p>Your VBMS account has been set up successfully.</p>',
        text: 'Welcome! Your VBMS account has been set up successfully.'
      },
      status: 'delivered',
      type: 'welcome',
      priority: 'normal',
      sender: {
        userId: bobbyAdmin._id,
        name: bobbyAdmin.name,
        role: bobbyAdmin.role
      },
      recipient: {
        userId: businessUser._id,
        name: businessUser.name,
        role: 'customer'  // Use valid enum value instead of 'client'
      },
      category: 'sent'
    });
    
    await emailToBusiness.save();
    console.log('✅ Email created: Bobby Admin → Business (will show in Bobby\'s SENT)');
    
    // EMAIL 2: Business sends TO Bobby Admin  
    const emailFromBusiness = new Email({
      to: 'bobbyadmin@vbms.com',
      from: 'business@wolfpaqmarketing.com',
      subject: 'Question about VBMS Features',
      content: {
        html: '<p>Hi Bobby, I have some questions about the VBMS platform features...</p>',
        text: 'Hi Bobby, I have some questions about the VBMS platform features...'
      },
      status: 'delivered',
      type: 'support',
      priority: 'normal',
      sender: {
        userId: businessUser._id,
        name: businessUser.name,
        role: 'customer'  // Use valid enum value instead of 'client'
      },
      recipient: {
        userId: bobbyAdmin._id,
        name: bobbyAdmin.name,
        role: bobbyAdmin.role
      },
      category: 'inbox'
    });
    
    await emailFromBusiness.save();
    console.log('✅ Email created: Business → Bobby Admin (will show in Bobby\'s INBOX)');
    
    // EMAIL 3: Bobby Admin replies back
    const emailReply = new Email({
      to: 'business@wolfpaqmarketing.com',
      from: 'bobbyadmin@vbms.com',
      subject: 'Re: Question about VBMS Features',
      content: {
        html: '<p>Hi Sandra, Thanks for your question! Here are the details about VBMS features...</p>',
        text: 'Hi Sandra, Thanks for your question! Here are the details about VBMS features...'
      },
      status: 'sent',
      type: 'support',
      priority: 'normal',
      sender: {
        userId: bobbyAdmin._id,
        name: bobbyAdmin.name,
        role: bobbyAdmin.role
      },
      recipient: {
        userId: businessUser._id,
        name: businessUser.name,
        role: 'customer'  // Use valid enum value instead of 'client'
      },
      category: 'sent'
    });
    
    await emailReply.save();
    console.log('✅ Email created: Bobby Admin → Business (reply, will show in Bobby\'s SENT)');
    
    console.log('\n🔍 Verifying emails for bobbyadmin@vbms.com...');
    
    const bobbyInbox = await Email.find({
      $or: [
        { to: 'bobbyadmin@vbms.com' },
        { 'recipient.userId': bobbyAdmin._id }
      ]
    }).sort({ createdAt: -1 });
    
    const bobbySent = await Email.find({
      $or: [
        { from: 'bobbyadmin@vbms.com' },
        { 'sender.userId': bobbyAdmin._id }
      ]
    }).sort({ createdAt: -1 });
    
    console.log(`📥 Bobby's Inbox: ${bobbyInbox.length} emails`);
    bobbyInbox.forEach((email, index) => {
      console.log(`   ${index + 1}. ${email.subject} ← ${email.from}`);
    });
    
    console.log(`📤 Bobby's Sent: ${bobbySent.length} emails`);
    bobbySent.forEach((email, index) => {
      console.log(`   ${index + 1}. ${email.subject} → ${email.to}`);
    });
    
    console.log('\n🎉 SUCCESS!');
    console.log('===========');
    console.log('✅ Created email conversation between Bobby Admin and Business');
    console.log('✅ As bobbyadmin@vbms.com, you should now see:');
    console.log('   📥 INBOX: Email FROM business@wolfpaqmarketing.com');
    console.log('   📤 SENT: Emails TO business@wolfpaqmarketing.com');
    console.log('✅ Refresh your email management page to see them!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

createBusinessEmails();