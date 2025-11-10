/**
 * Debug GoDaddy IMAP Connection - Try Different Settings
 */

require('dotenv').config();
const Imap = require('imap');

const testConfigs = [
  {
    name: 'GoDaddy IMAP Standard',
    config: {
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASS,
      host: 'imap.secureserver.net',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    }
  },
  {
    name: 'GoDaddy IMAP Alt Port',
    config: {
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASS,
      host: 'imap.secureserver.net',
      port: 143,
      tls: false
    }
  },
  {
    name: 'GoDaddy IMAP with STARTTLS',
    config: {
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASS,
      host: 'imap.secureserver.net',
      port: 143,
      tls: false,
      autotls: 'required'
    }
  },
  {
    name: 'Outlook.com IMAP (fallback)',
    config: {
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASS,
      host: 'outlook.office365.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    }
  }
];

async function testImapConfig(configInfo) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Testing: ${configInfo.name}`);
    console.log(`   Host: ${configInfo.config.host}:${configInfo.config.port}`);
    console.log(`   TLS: ${configInfo.config.tls}`);
    
    const imap = new Imap(configInfo.config);
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log('   ⏰ Connection timeout');
        try { imap.end(); } catch (e) {}
        resolve(false);
      }
    }, 15000);
    
    imap.once('ready', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log('   ✅ Connection successful!');
        imap.end();
        resolve(true);
      }
    });
    
    imap.once('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log(`   ❌ Connection failed: ${err.message}`);
        if (err.textCode) {
          console.log(`   📋 Error code: ${err.textCode}`);
        }
        resolve(false);
      }
    });
    
    try {
      imap.connect();
    } catch (err) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log(`   ❌ Connect error: ${err.message}`);
        resolve(false);
      }
    }
  });
}

async function debugGoDaddyImap() {
  console.log('🔍 GoDaddy IMAP Configuration Debug');
  console.log('===================================');
  console.log(`📧 Email: ${process.env.SMTP_USER}`);
  console.log(`🔐 Password: ${process.env.SMTP_PASS ? '[SET]' : '[NOT SET]'}`);
  
  let successCount = 0;
  
  for (const configInfo of testConfigs) {
    const success = await testImapConfig(configInfo);
    if (success) {
      successCount++;
      console.log(`\n🎉 WORKING CONFIGURATION FOUND: ${configInfo.name}`);
      console.log('Configuration details:', JSON.stringify(configInfo.config, null, 2));
    }
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Successful configurations: ${successCount}/${testConfigs.length}`);
  
  if (successCount === 0) {
    console.log('\n❗ No IMAP configurations worked. Possible issues:');
    console.log('   1. GoDaddy account may require app-specific passwords');
    console.log('   2. IMAP may be disabled on the account');
    console.log('   3. Two-factor authentication may be blocking access');
    console.log('   4. Account may be using different server settings');
    console.log('\n💡 Solutions to try:');
    console.log('   1. Check GoDaddy email settings in your account');
    console.log('   2. Enable IMAP access if disabled');
    console.log('   3. Generate an app-specific password if 2FA is enabled');
    console.log('   4. Contact GoDaddy support for correct IMAP settings');
  }
}

debugGoDaddyImap().catch(console.error);