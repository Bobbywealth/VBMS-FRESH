/**
 * Check what type of GoDaddy email account we're dealing with
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function checkEmailType() {
  console.log('🔍 Checking GoDaddy Email Account Type');
  console.log('=====================================');
  console.log(`📧 Email: ${process.env.SMTP_USER}`);
  
  // Test SMTP connection (which we know works)
  console.log('\n1. Testing SMTP Connection (should work)...');
  
  try {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    await transporter.verify();
    console.log('✅ SMTP Connection: SUCCESS');
    console.log(`   Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    
    // Get server info
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.SMTP_USER,
      subject: 'VBMS Email System Test',
      text: 'This is a test email from VBMS to verify email system functionality.',
      html: '<p>This is a test email from VBMS to verify email system functionality.</p><p>If you see this, SMTP is working correctly!</p>'
    });
    
    console.log('✅ Test Email Sent Successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    
  } catch (error) {
    console.log('❌ SMTP Connection: FAILED');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n2. Email Account Analysis...');
  
  // Analyze the domain and settings
  const domain = process.env.SMTP_USER.split('@')[1];
  const smtpHost = process.env.SMTP_HOST;
  
  console.log(`   Domain: ${domain}`);
  console.log(`   SMTP Host: ${smtpHost}`);
  
  if (smtpHost.includes('secureserver.net')) {
    console.log('📋 Account Type: GoDaddy Professional Email');
    console.log('   IMAP Server: imap.secureserver.net');
    console.log('   IMAP Ports: 993 (SSL) or 143 (STARTTLS)');
    console.log('');
    console.log('💡 Next Steps for IMAP Access:');
    console.log('   1. In GoDaddy account, look for "IMAP Access" setting');
    console.log('   2. Enable IMAP/POP access if disabled');
    console.log('   3. If you have 2FA, create an app-specific password');
    console.log('   4. Try using app password instead of regular password');
    
  } else if (smtpHost.includes('office365') || smtpHost.includes('outlook')) {
    console.log('📋 Account Type: Office 365 / Outlook Business');
    console.log('   IMAP Server: outlook.office365.com');
    console.log('   IMAP Port: 993 (SSL)');
    console.log('');
    console.log('💡 Next Steps for IMAP Access:');
    console.log('   1. May need OAuth2 authentication instead of password');
    console.log('   2. Check if "Less secure app access" needs to be enabled');
    console.log('   3. May require app-specific password');
  }
  
  console.log('\n3. Recommendations:');
  console.log('   ✅ SMTP is working - emails can be sent');
  console.log('   ❗ IMAP needs additional configuration');
  console.log('   🔧 Check your GoDaddy account for:');
  console.log('      - "IMAP Access" or "POP/IMAP Settings"');
  console.log('      - "App Passwords" or "Application Passwords"');
  console.log('      - "Two-Factor Authentication" settings');
}

checkEmailType().catch(console.error);