/**
 * Create sample emails for bobbyadmin@vbms.com to demonstrate the email system
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Email = require('./models/Email');
const User = require('./models/User');

async function createSampleEmails() {
  try {
    console.log('📧 Creating sample emails for bobbyadmin@vbms.com');
    console.log('=================================================');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the user
    const user = await User.findOne({ email: 'bobbyadmin@vbms.com' });
    if (!user) {
      console.log('❌ User bobbyadmin@vbms.com not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.name} (${user.email})`);
    
    // Sample emails that would typically come from your business inbox
    const sampleEmails = [
      // Inbox emails (received)
      {
        to: 'bobbyadmin@vbms.com',
        from: 'customer@example.com',
        subject: 'Question about VBMS pricing plans',
        content: {
          html: '<p>Hi Bobby,</p><p>I\'m interested in your VBMS service. Can you tell me more about the different pricing plans available?</p><p>Best regards,<br>John Customer</p>',
          text: 'Hi Bobby, I\'m interested in your VBMS service. Can you tell me more about the different pricing plans available? Best regards, John Customer'
        },
        status: 'delivered',
        type: 'support',
        category: 'inbox',
        recipient: {
          userId: user._id,
          name: user.name,
          role: user.role === 'client' ? 'customer' : user.role
        },
        metadata: {
          outlookSync: false,
          sampleEmail: true
        },
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        to: 'bobbyadmin@vbms.com',
        from: 'partner@restaurant.com',
        subject: 'Partnership Opportunity - Restaurant Chain',
        content: {
          html: '<p>Hello Bobby,</p><p>We represent a chain of 15 restaurants and are looking for a comprehensive business management solution. VBMS seems like it could be perfect for our needs.</p><p>Could we schedule a demo?</p><p>Thanks,<br>Sarah Martinez<br>Operations Manager</p>',
          text: 'Hello Bobby, We represent a chain of 15 restaurants and are looking for a comprehensive business management solution. VBMS seems like it could be perfect for our needs. Could we schedule a demo? Thanks, Sarah Martinez, Operations Manager'
        },
        status: 'delivered',
        type: 'marketing',
        category: 'inbox',
        recipient: {
          userId: user._id,
          name: user.name,
          role: user.role === 'client' ? 'customer' : user.role
        },
        metadata: {
          outlookSync: false,
          sampleEmail: true
        },
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        to: 'bobbyadmin@vbms.com',
        from: 'support@stripe.com',
        subject: 'Payment notification - $299.00 received',
        content: {
          html: '<p>Hi,</p><p>You\'ve received a payment of $299.00 for VBMS Premium Plan.</p><p>Customer: mike@business.com</p><p>Transaction ID: pi_1234567890</p>',
          text: 'Hi, You\'ve received a payment of $299.00 for VBMS Premium Plan. Customer: mike@business.com Transaction ID: pi_1234567890'
        },
        status: 'delivered',
        type: 'payment_confirmation',
        category: 'inbox',
        recipient: {
          userId: user._id,
          name: user.name,
          role: user.role === 'client' ? 'customer' : user.role
        },
        metadata: {
          outlookSync: false,
          sampleEmail: true
        },
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
      },
      
      // Sent emails
      {
        to: 'customer@example.com',
        from: 'bobbyadmin@vbms.com',
        subject: 'Re: Question about VBMS pricing plans',
        content: {
          html: '<p>Hi John,</p><p>Thanks for your interest in VBMS! Here are our current pricing plans:</p><ul><li><strong>Starter:</strong> $99/month - Perfect for small businesses</li><li><strong>Professional:</strong> $299/month - Great for growing companies</li><li><strong>Enterprise:</strong> $599/month - Full featured solution</li></ul><p>Would you like to schedule a demo?</p><p>Best regards,<br>Bobby Admin<br>VBMS Team</p>',
          text: 'Hi John, Thanks for your interest in VBMS! Here are our current pricing plans: Starter: $99/month - Perfect for small businesses, Professional: $299/month - Great for growing companies, Enterprise: $599/month - Full featured solution. Would you like to schedule a demo? Best regards, Bobby Admin, VBMS Team'
        },
        status: 'sent',
        type: 'support',
        category: 'sent',
        sender: {
          userId: user._id,
          name: user.name,
          role: user.role === 'client' ? 'customer' : user.role
        },
        metadata: {
          outlookSync: false,
          sampleEmail: true
        },
        createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000) // 1.5 days ago
      },
      {
        to: 'partner@restaurant.com',
        from: 'bobbyadmin@vbms.com',
        subject: 'Re: Partnership Opportunity - Restaurant Chain',
        content: {
          html: '<p>Hi Sarah,</p><p>Thank you for reaching out! I\'d be delighted to show you how VBMS can help streamline your restaurant operations.</p><p>VBMS offers:</p><ul><li>Order management and tracking</li><li>Inventory control</li><li>Staff scheduling</li><li>Financial reporting</li><li>Customer analytics</li></ul><p>How about we schedule a demo this Friday at 2 PM?</p><p>Looking forward to hearing from you!</p><p>Best regards,<br>Bobby Admin<br>Founder, VBMS</p>',
          text: 'Hi Sarah, Thank you for reaching out! I\'d be delighted to show you how VBMS can help streamline your restaurant operations. VBMS offers: Order management and tracking, Inventory control, Staff scheduling, Financial reporting, Customer analytics. How about we schedule a demo this Friday at 2 PM? Looking forward to hearing from you! Best regards, Bobby Admin, Founder, VBMS'
        },
        status: 'sent',
        type: 'marketing',
        category: 'sent',
        sender: {
          userId: user._id,
          name: user.name,
          role: user.role === 'client' ? 'customer' : user.role
        },
        metadata: {
          outlookSync: false,
          sampleEmail: true
        },
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
      },
      {
        to: 'team@vbms.com',
        from: 'bobbyadmin@vbms.com',
        subject: 'Weekly Business Update - Strong Growth!',
        content: {
          html: '<p>Team,</p><p>Great news! This week we achieved:</p><ul><li>15 new customer signups</li><li>$12,000 in new revenue</li><li>95% customer satisfaction rate</li><li>Zero critical bugs reported</li></ul><p>Keep up the excellent work!</p><p>Bobby</p>',
          text: 'Team, Great news! This week we achieved: 15 new customer signups, $12,000 in new revenue, 95% customer satisfaction rate, Zero critical bugs reported. Keep up the excellent work! Bobby'
        },
        status: 'sent',
        type: 'system',
        category: 'sent',
        sender: {
          userId: user._id,
          name: user.name,
          role: user.role === 'client' ? 'customer' : user.role
        },
        metadata: {
          outlookSync: false,
          sampleEmail: true
        },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      }
    ];
    
    console.log('\n📬 Creating sample emails...');
    let createdCount = 0;
    
    for (const emailData of sampleEmails) {
      try {
        const email = new Email(emailData);
        await email.save();
        createdCount++;
        console.log(`✅ Created: ${emailData.subject} (${emailData.category})`);
      } catch (error) {
        console.error(`❌ Failed to create email: ${emailData.subject}`, error.message);
      }
    }
    
    console.log('\n🎉 Sample Email Creation Complete!');
    console.log('=====================================');
    console.log(`✅ Created ${createdCount}/${sampleEmails.length} sample emails`);
    console.log(`📧 For user: ${user.email}`);
    console.log('\n📱 What you should now see in your email dashboard:');
    console.log('📥 INBOX: 3 emails (customer inquiries, partnership, payment notification)');
    console.log('📤 SENT: 3 emails (replies to customers, team update)');
    console.log('\n🔄 Refresh your email management page to see the emails!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

createSampleEmails();