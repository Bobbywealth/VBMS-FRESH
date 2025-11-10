/**
 * Create realistic business emails that would typically be in your inbox
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Email = require('./models/Email');
const User = require('./models/User');

async function createRealisticEmails() {
  try {
    console.log('📧 Creating realistic business emails for bobbyadmin@vbms.com');
    console.log('============================================================');
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the user
    const user = await User.findOne({ email: 'bobbyadmin@vbms.com' });
    if (!user) {
      console.log('❌ User bobbyadmin@vbms.com not found');
      return;
    }
    
    console.log(`✅ Found user: ${user.name} (${user.email})`);
    
    // Clear existing sample emails first
    await Email.deleteMany({ 'metadata.sampleEmail': true });
    console.log('🗑️ Cleared existing sample emails');
    
    // Create realistic business emails that would be in your actual inbox
    const realisticEmails = [
      // === INBOX EMAILS (Received) ===
      {
        to: 'business@wolfpaqmarketing.com',
        from: 'mike.johnson@restaurant-group.com',
        subject: 'Interested in VBMS for our restaurant chain',
        content: {
          html: `<p>Hi,</p>
                 <p>I found your VBMS platform online and I'm very interested. We operate 8 restaurants across Texas and need better management software.</p>
                 <p>Current challenges:</p>
                 <ul>
                   <li>Inventory tracking across locations</li>
                   <li>Staff scheduling</li>
                   <li>Order management</li>
                   <li>Financial reporting</li>
                 </ul>
                 <p>Can we schedule a demo this week?</p>
                 <p>Best regards,<br>Mike Johnson<br>Operations Manager<br>Texas Restaurant Group</p>`,
          text: 'Hi, I found your VBMS platform online and I\'m very interested. We operate 8 restaurants across Texas and need better management software...'
        },
        status: 'delivered',
        type: 'marketing',
        category: 'inbox',
        recipient: {
          userId: user._id,
          name: user.name,
          role: user.role === 'client' ? 'customer' : user.role
        },
        metadata: { sampleEmail: true },
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
      },
      
      {
        to: 'business@wolfpaqmarketing.com',
        from: 'sarah.chen@techstartup.co',
        subject: 'VBMS Integration Question',
        content: {
          html: `<p>Hello,</p>
                 <p>We're currently using Shopify for our e-commerce business and looking at VBMS for operations management.</p>
                 <p>Questions:</p>
                 <ol>
                   <li>Does VBMS integrate with Shopify?</li>
                   <li>Can it handle 50,000+ orders per month?</li>
                   <li>What's the pricing for the enterprise plan?</li>
                 </ol>
                 <p>Looking forward to your response.</p>
                 <p>Sarah Chen<br>CTO, TechStartup Co.</p>`,
          text: 'Hello, We\'re currently using Shopify for our e-commerce business and looking at VBMS for operations management...'
        },
        status: 'delivered',
        type: 'support',
        category: 'inbox',
        recipient: {
          userId: user._id,
          name: user.name,
          role: user.role === 'client' ? 'customer' : user.role
        },
        metadata: { sampleEmail: true },
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
      },
      
      {
        to: 'business@wolfpaqmarketing.com',
        from: 'billing@stripe.com',
        subject: 'Payment succeeded for $599.00',
        content: {
          html: `<p>Hi business@wolfpaqmarketing.com,</p>
                 <p>A payment of <strong>$599.00</strong> has succeeded.</p>
                 <p><strong>Payment details:</strong></p>
                 <ul>
                   <li>Amount: $599.00 USD</li>
                   <li>Customer: premium-customer@business.com</li>
                   <li>Description: VBMS Enterprise Plan - Monthly</li>
                   <li>Payment ID: pi_3N8x2KLkdIwHu7ix1234567890</li>
                 </ul>
                 <p>Thanks,<br>The Stripe team</p>`,
          text: 'Hi business@wolfpaqmarketing.com, A payment of $599.00 has succeeded...'
        },
        status: 'delivered',
        type: 'payment_confirmation',
        category: 'inbox',
        recipient: {
          userId: user._id,
          name: user.name,
          role: user.role === 'client' ? 'customer' : user.role
        },
        metadata: { sampleEmail: true },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      
      {
        to: 'business@wolfpaqmarketing.com',
        from: 'jennifer.martinez@consulting.com',
        subject: 'Partnership Proposal - Business Consulting',
        content: {
          html: `<p>Dear VBMS Team,</p>
                 <p>I represent a business consulting firm with 200+ clients who could benefit from your platform.</p>
                 <p>We'd like to explore a partnership where:</p>
                 <ul>
                   <li>We refer clients to VBMS</li>
                   <li>Receive a commission on successful signups</li>
                   <li>Provide implementation consulting</li>
                 </ul>
                 <p>Are you interested in discussing this opportunity?</p>
                 <p>Best regards,<br>Jennifer Martinez<br>Partner, Business Solutions Consulting</p>`,
          text: 'Dear VBMS Team, I represent a business consulting firm with 200+ clients who could benefit from your platform...'
        },
        status: 'delivered',
        type: 'marketing',
        category: 'inbox',
        recipient: {
          userId: user._id,
          name: user.name,
          role: user.role === 'client' ? 'customer' : user.role
        },
        metadata: { sampleEmail: true },
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      
      {
        to: 'business@wolfpaqmarketing.com',
        from: 'support-request@vbms-customer.com',
        subject: 'Urgent: Login Issues',
        content: {
          html: `<p>Hi Support,</p>
                 <p>I'm having trouble logging into my VBMS account. Getting "Invalid credentials" error.</p>
                 <p>Account email: customer@restaurant-chain.com</p>
                 <p>This is urgent as we need to process today's orders.</p>
                 <p>Please help ASAP!</p>
                 <p>Thanks,<br>David Kim</p>`,
          text: 'Hi Support, I\'m having trouble logging into my VBMS account. Getting "Invalid credentials" error...'
        },
        status: 'delivered',
        type: 'support',
        category: 'inbox',
        recipient: {
          userId: user._id,
          name: user.name,
          role: user.role === 'client' ? 'customer' : user.role
        },
        metadata: { sampleEmail: true },
        createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      },
      
      // === SENT EMAILS (Replies and outbound) ===
      {
        to: 'mike.johnson@restaurant-group.com',
        from: 'business@wolfpaqmarketing.com',
        subject: 'Re: Interested in VBMS for our restaurant chain',
        content: {
          html: `<p>Hi Mike,</p>
                 <p>Thank you for your interest in VBMS! I'd be delighted to show you how we can help streamline your restaurant operations.</p>
                 <p>For your 8 locations, VBMS offers:</p>
                 <ul>
                   <li><strong>Multi-location Inventory:</strong> Real-time tracking across all restaurants</li>
                   <li><strong>Smart Scheduling:</strong> AI-powered staff scheduling with labor cost optimization</li>
                   <li><strong>Order Management:</strong> Unified dashboard for all order channels</li>
                   <li><strong>Financial Reporting:</strong> Detailed P&L reports per location</li>
                 </ul>
                 <p>I have availability for a demo this Thursday or Friday. What works better for you?</p>
                 <p>Looking forward to hearing from you!</p>
                 <p>Best regards,<br>Bobby Craig<br>Founder & CEO<br>VBMS</p>`,
          text: 'Hi Mike, Thank you for your interest in VBMS! I\'d be delighted to show you how we can help streamline your restaurant operations...'
        },
        status: 'sent',
        type: 'marketing',
        category: 'sent',
        sender: {
          userId: user._id,
          name: user.name,
          role: user.role === 'client' ? 'customer' : user.role
        },
        metadata: { sampleEmail: true },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      },
      
      {
        to: 'sarah.chen@techstartup.co',
        from: 'business@wolfpaqmarketing.com',
        subject: 'Re: VBMS Integration Question',
        content: {
          html: `<p>Hi Sarah,</p>
                 <p>Great questions! Here are the answers:</p>
                 <p><strong>1. Shopify Integration:</strong> Yes! VBMS has native Shopify integration. Orders sync automatically and you can manage inventory, fulfillment, and analytics all in one place.</p>
                 <p><strong>2. High Volume Handling:</strong> Absolutely. Our Enterprise plan is designed for high-volume businesses. We currently support clients processing 100,000+ orders monthly with 99.9% uptime.</p>
                 <p><strong>3. Enterprise Pricing:</strong> $599/month for unlimited orders, advanced reporting, priority support, and custom integrations.</p>
                 <p>Would you like to see a demo with your Shopify store connected? I can show you the order sync in real-time.</p>
                 <p>Best regards,<br>Bobby Craig<br>VBMS</p>`,
          text: 'Hi Sarah, Great questions! Here are the answers: 1. Shopify Integration: Yes! VBMS has native Shopify integration...'
        },
        status: 'sent',
        type: 'support',
        category: 'sent',
        sender: {
          userId: user._id,
          name: user.name,
          role: user.role === 'client' ? 'customer' : user.role
        },
        metadata: { sampleEmail: true },
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
      },
      
      {
        to: 'support-request@vbms-customer.com',
        from: 'business@wolfpaqmarketing.com',
        subject: 'Re: Urgent: Login Issues - RESOLVED',
        content: {
          html: `<p>Hi David,</p>
                 <p>I've reset your account password and you should now be able to log in.</p>
                 <p><strong>Next steps:</strong></p>
                 <ol>
                   <li>Go to the VBMS login page</li>
                   <li>Use your email: customer@restaurant-chain.com</li>
                   <li>Click "Forgot Password" and check your email</li>
                   <li>Set a new secure password</li>
                 </ol>
                 <p>If you still have issues, please call our priority support line: 1-800-VBMS-NOW</p>
                 <p>Sorry for the inconvenience!</p>
                 <p>Best regards,<br>Bobby Craig<br>VBMS Support Team</p>`,
          text: 'Hi David, I\'ve reset your account password and you should now be able to log in...'
        },
        status: 'sent',
        type: 'support',
        category: 'sent',
        sender: {
          userId: user._id,
          name: user.name,
          role: user.role === 'client' ? 'customer' : user.role
        },
        metadata: { sampleEmail: true },
        createdAt: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
      },
      
      {
        to: 'team@vbms.com',
        from: 'business@wolfpaqmarketing.com',
        subject: 'Weekly Update: December Revenue Milestone Hit! 🎉',
        content: {
          html: `<p>Team,</p>
                 <p>Fantastic news! We've hit our December revenue milestone of $50K ARR! 🎉</p>
                 <p><strong>This Week's Wins:</strong></p>
                 <ul>
                   <li>🆕 12 new enterprise signups</li>
                   <li>💰 $8,200 in new MRR</li>
                   <li>⭐ 4.9/5 customer satisfaction score</li>
                   <li>🚀 Zero downtime this week</li>
                   <li>📈 45% increase in demo requests</li>
                 </ul>
                 <p><strong>Focus for Next Week:</strong></p>
                 <ul>
                   <li>Launch the new inventory analytics feature</li>
                   <li>Complete Shopify integration improvements</li>
                   <li>Finalize Q1 2024 roadmap</li>
                 </ul>
                 <p>Keep up the amazing work everyone! 💪</p>
                 <p>Bobby</p>`,
          text: 'Team, Fantastic news! We\'ve hit our December revenue milestone of $50K ARR! 🎉 This Week\'s Wins: 12 new enterprise signups, $8,200 in new MRR...'
        },
        status: 'sent',
        type: 'system',
        category: 'sent',
        sender: {
          userId: user._id,
          name: user.name,
          role: user.role === 'client' ? 'customer' : user.role
        },
        metadata: { sampleEmail: true },
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      }
    ];
    
    console.log('\n📬 Creating realistic business emails...');
    let createdCount = 0;
    
    for (const emailData of realisticEmails) {
      try {
        const email = new Email(emailData);
        await email.save();
        createdCount++;
        console.log(`✅ Created: ${emailData.subject} (${emailData.category})`);
      } catch (error) {
        console.error(`❌ Failed to create email: ${emailData.subject}`, error.message);
      }
    }
    
    console.log('\n🎉 Realistic Email Creation Complete!');
    console.log('=====================================');
    console.log(`✅ Created ${createdCount}/${realisticEmails.length} realistic business emails`);
    console.log(`📧 For user: ${user.email}`);
    console.log('\n📱 What you should now see in your email dashboard:');
    console.log('📥 INBOX: 5 emails (leads, support requests, payment notifications)');
    console.log('📤 SENT: 4 emails (replies to customers, team updates)');
    console.log('\n🔄 Refresh your email management page to see these realistic business emails!');
    console.log('\n💡 These represent the types of emails you\'d typically see in business@wolfpaqmarketing.com');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

createRealisticEmails();