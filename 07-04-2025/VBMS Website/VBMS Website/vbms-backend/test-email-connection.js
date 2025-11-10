require('dotenv').config();
const Imap = require('imap');
const nodemailer = require('nodemailer');

// Test email configuration (replace with your actual values)
const emailConfig = {
  email: 'business@wolfpaqmarketing.com',
  password: 'your-actual-password-here', // You'll need to replace this
  imapServer: 'outlook.office365.com',
  imapPort: 993,
  smtpServer: 'smtp.office365.com',
  smtpPort: 587
};

console.log('🧪 Testing Email Connection...');
console.log('Email:', emailConfig.email);
console.log('IMAP Server:', emailConfig.imapServer + ':' + emailConfig.imapPort);
console.log('SMTP Server:', emailConfig.smtpServer + ':' + emailConfig.smtpPort);

// Test IMAP connection
function testImap() {
  return new Promise((resolve, reject) => {
    console.log('\n📥 Testing IMAP connection...');
    
    const imap = new Imap({
      user: emailConfig.email,
      password: emailConfig.password,
      host: emailConfig.imapServer,
      port: emailConfig.imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });

    imap.once('ready', () => {
      console.log('✅ IMAP connection successful!');
      imap.end();
      resolve(true);
    });
    
    imap.once('error', (err) => {
      console.log('❌ IMAP connection failed:', err.message);
      reject(err);
    });
    
    imap.connect();
  });
}

// Test SMTP connection
function testSmtp() {
  return new Promise((resolve, reject) => {
    console.log('\n📤 Testing SMTP connection...');
    
    const transporter = nodemailer.createTransporter({
      host: emailConfig.smtpServer,
      port: emailConfig.smtpPort,
      secure: false,
      auth: {
        user: emailConfig.email,
        pass: emailConfig.password
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    transporter.verify((error, success) => {
      if (error) {
        console.log('❌ SMTP connection failed:', error.message);
        reject(error);
      } else {
        console.log('✅ SMTP connection successful!');
        resolve(success);
      }
    });
  });
}

// Run tests
async function runTests() {
  try {
    console.log('🚀 Starting email connection tests...\n');
    
    const [imapResult, smtpResult] = await Promise.all([
      testImap().catch(err => ({ error: err.message })),
      testSmtp().catch(err => ({ error: err.message }))
    ]);
    
    console.log('\n📊 Test Results:');
    console.log('IMAP:', imapResult === true ? '✅ Success' : `❌ Failed: ${imapResult.error}`);
    console.log('SMTP:', smtpResult === true ? '✅ Success' : `❌ Failed: ${smtpResult.error}`);
    
    if (imapResult === true && smtpResult === true) {
      console.log('\n🎉 All tests passed! Your email configuration is correct.');
    } else {
      console.log('\n⚠️  Some tests failed. Check your email configuration and password.');
    }
    
  } catch (error) {
    console.error('\n💥 Test error:', error.message);
  }
}

runTests();

