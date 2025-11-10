const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('🧪 VBMS Email System Test');
console.log('========================');

// Test 1: Check Environment Variables
console.log('\n📋 Step 1: Checking Environment Variables...');
console.log('SMTP_HOST:', process.env.SMTP_HOST || '❌ Not set');
console.log('SMTP_PORT:', process.env.SMTP_PORT || '❌ Not set');
console.log('SMTP_USER:', process.env.SMTP_USER || '❌ Not set');
console.log('SMTP_PASS:', process.env.SMTP_PASS ? '✅ Set (hidden)' : '❌ Not set');
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL || '❌ Not set');

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.log('\n❌ ERROR: Missing required email environment variables!');
  console.log('Make sure your .env file contains:');
  console.log('SMTP_HOST=smtpout.secureserver.net');
  console.log('SMTP_PORT=587');
  console.log('SMTP_USER=business@wolfpaqmarketing.com');
  console.log('SMTP_PASS=YOUR_EMAIL_PASSWORD_HERE');
  console.log('ADMIN_EMAIL=business@wolfpaqmarketing.com');
  process.exit(1);
}

// Test 2: Create SMTP Connection
console.log('\n🔗 Step 2: Testing SMTP Connection...');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  debug: true, // Enable debug output
  logger: true // Log to console
});

// Test 3: Verify SMTP Connection
console.log('\n🔍 Step 3: Verifying SMTP Connection...');

async function testEmailSystem() {
  try {
    // Verify connection configuration
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    
    // Test 4: Send Test Email
    console.log('\n📧 Step 4: Sending test email...');
    
    const testEmail = {
      from: `"VBMS Test" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL, // Send to yourself
      subject: '🧪 VBMS Email System Test - ' + new Date().toLocaleString(),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #f0b90b; text-align: center;">✅ VBMS Email Test Successful!</h2>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>📊 Test Results:</h3>
            <ul>
              <li>✅ SMTP Connection: Working</li>
              <li>✅ Authentication: Successful</li>
              <li>✅ Email Delivery: Successful</li>
              <li>✅ HTML Formatting: Working</li>
            </ul>
          </div>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>🔧 Configuration Details:</h3>
            <p><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</p>
            <p><strong>Port:</strong> ${process.env.SMTP_PORT}</p>
            <p><strong>From Email:</strong> ${process.env.SMTP_USER}</p>
            <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #22c55e; font-weight: bold;">🎉 Your VBMS email system is working perfectly!</p>
            <p style="color: #6c757d; font-size: 12px;">This email was sent automatically by the VBMS test system.</p>
          </div>
        </div>
      `,
      text: `
VBMS Email System Test - SUCCESS!

Your email system is working correctly:
✅ SMTP Connection: Working
✅ Authentication: Successful  
✅ Email Delivery: Successful

Configuration:
- SMTP Host: ${process.env.SMTP_HOST}
- Port: ${process.env.SMTP_PORT}
- From Email: ${process.env.SMTP_USER}
- Test Time: ${new Date().toLocaleString()}

Your VBMS email system is ready to use!
      `
    };
    
    const info = await transporter.sendMail(testEmail);
    
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📬 Check your inbox:', process.env.ADMIN_EMAIL);
    
    // Test 5: Database Connection Test
    console.log('\n💾 Step 5: Testing Database Connection...');
    
    try {
      const mongoose = require('mongoose');
      
      if (process.env.MONGO_URI) {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connection successful!');
        
        // Test email model
        const Email = require('./models/Email');
        console.log('✅ Email model loaded successfully!');
        
        mongoose.disconnect();
      } else {
        console.log('⚠️  MongoDB URI not found in .env - skipping database test');
      }
    } catch (dbError) {
      console.log('❌ Database connection error:', dbError.message);
    }
    
    console.log('\n🎉 EMAIL SYSTEM TEST COMPLETE!');
    console.log('=====================================');
    console.log('✅ SMTP Configuration: Working');
    console.log('✅ Email Sending: Working'); 
    console.log('✅ Authentication: Working');
    console.log('📧 Test email sent to:', process.env.ADMIN_EMAIL);
    console.log('');
    console.log('🚀 Your email system is ready! You can now:');
    console.log('   1. Send emails through the Email Manager dashboard');
    console.log('   2. Receive automated welcome/payment emails');
    console.log('   3. Send bulk email campaigns');
    console.log('   4. Track email analytics and engagement');
    console.log('');
    console.log('📱 Next steps:');
    console.log('   - Start your backend server: npm start');
    console.log('   - Go to admin-email-manager.html');
    console.log('   - Test sending emails through the interface');
    
  } catch (error) {
    console.log('\n❌ EMAIL SYSTEM TEST FAILED!');
    console.log('===============================');
    console.error('Error details:', error.message);
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('1. Check your email credentials are correct');
    console.log('2. Verify your GoDaddy email settings allow SMTP');
    console.log('3. Try alternative SMTP settings:');
    console.log('   SMTP_HOST=relay-hosting.secureserver.net');
    console.log('   SMTP_PORT=25');
    console.log('4. Check if 2FA is enabled (use app password)');
    console.log('5. Ensure "Less secure apps" is enabled');
    
    if (error.code === 'EAUTH') {
      console.log('');
      console.log('⚠️  AUTHENTICATION ERROR:');
      console.log('   - Double-check your email password');
      console.log('   - If 2FA is enabled, use an app-specific password');
      console.log('   - Verify the email account exists and is active');
    }
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('⚠️  CONNECTION ERROR:');
      console.log('   - Check your internet connection');
      console.log('   - Try different SMTP host: relay-hosting.secureserver.net');
      console.log('   - Try different port: 25 or 465');
    }
  }
}

// Run the test
testEmailSystem().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test script error:', error);
  process.exit(1);
});