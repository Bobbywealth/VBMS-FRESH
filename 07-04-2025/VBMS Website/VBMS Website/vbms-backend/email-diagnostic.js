/**
 * VBMS Email System Diagnostic Tool
 * Run this to diagnose email system problems
 */

require('dotenv').config();
const fetch = require('node-fetch');

console.log('🔍 VBMS EMAIL SYSTEM DIAGNOSTIC');
console.log('================================');

async function runDiagnostics() {
  const issues = [];
  const warnings = [];
  
  console.log('\n1️⃣ CHECKING ENVIRONMENT VARIABLES...');
  
  // Check required environment variables
  const requiredEnvVars = [
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 
    'ADMIN_EMAIL', 'MONGO_URI', 'JWT_SECRET'
  ];
  
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      issues.push(`❌ Missing environment variable: ${varName}`);
    } else {
      console.log(`✅ ${varName}: ${varName.includes('PASS') ? 'Set (hidden)' : process.env[varName]}`);
    }
  });
  
  console.log('\n2️⃣ CHECKING BACKEND SERVER...');
  
  try {
    const response = await fetch('http://localhost:5050/api/test');
    if (response.ok) {
      console.log('✅ Backend server is running and accessible');
    } else {
      issues.push(`❌ Backend server returned status: ${response.status}`);
    }
  } catch (error) {
    issues.push(`❌ Cannot connect to backend server: ${error.message}`);
    console.log('   Make sure to run: npm start in vbms-backend folder');
  }
  
  console.log('\n3️⃣ CHECKING EMAIL API ENDPOINTS...');
  
  const emailEndpoints = [
    '/api/email/inbox',
    '/api/email/sent', 
    '/api/email/stats/overview'
  ];
  
  for (const endpoint of emailEndpoints) {
    try {
      const response = await fetch(`http://localhost:5050${endpoint}`);
      if (response.status === 401) {
        console.log(`✅ ${endpoint}: Properly secured (requires auth)`);
      } else if (response.ok) {
        console.log(`✅ ${endpoint}: Accessible`);
      } else {
        warnings.push(`⚠️ ${endpoint}: Status ${response.status}`);
      }
    } catch (error) {
      issues.push(`❌ ${endpoint}: ${error.message}`);
    }
  }
  
  console.log('\n4️⃣ CHECKING SMTP CONFIGURATION...');
  
  // Basic SMTP config validation
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  
  if (smtpHost === 'smtpout.secureserver.net' && smtpPort === '465') {
    console.log('✅ SMTP configuration looks correct for GoDaddy');
  } else {
    warnings.push(`⚠️ SMTP config: ${smtpHost}:${smtpPort} - verify this is correct`);
  }
  
  console.log('\n5️⃣ CHECKING COMMON FILE PATHS...');
  
  const fs = require('fs');
  const path = require('path');
  
  const criticalFiles = [
    '../email-manager.js',
    '../admin-email-manager.html',
    './routes/email.js',
    './routes/notifications.js',
    './models/Email.js'
  ];
  
  criticalFiles.forEach(filePath => {
    if (fs.existsSync(path.join(__dirname, filePath))) {
      console.log(`✅ ${filePath}: Found`);
    } else {
      issues.push(`❌ Missing critical file: ${filePath}`);
    }
  });
  
  console.log('\n6️⃣ TESTING DATABASE CONNECTION...');
  
  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connection successful');
    
    // Test email model
    const Email = require('./models/Email');
    const emailCount = await Email.countDocuments();
    console.log(`📧 Found ${emailCount} emails in database`);
    
    if (emailCount === 0) {
      warnings.push('⚠️ No emails found in database - this might be why inbox appears empty');
    }
    
    mongoose.disconnect();
  } catch (error) {
    issues.push(`❌ Database error: ${error.message}`);
  }
  
  console.log('\n7️⃣ DIAGNOSTIC SUMMARY');
  console.log('====================');
  
  if (issues.length === 0) {
    console.log('🎉 NO CRITICAL ISSUES FOUND!');
    
    if (warnings.length > 0) {
      console.log('\n⚠️ WARNINGS TO CHECK:');
      warnings.forEach(warning => console.log(warning));
    }
    
    console.log('\n✨ NEXT STEPS IF EMAILS STILL NOT WORKING:');
    console.log('1. Check browser console for JavaScript errors');
    console.log('2. Verify you are logged in as admin');
    console.log('3. Check browser Network tab for failed API calls');
    console.log('4. Try sending a test email first');
    console.log('5. Check your GoDaddy email account settings');
    
  } else {
    console.log('❌ CRITICAL ISSUES FOUND:');
    issues.forEach(issue => console.log(issue));
    
    console.log('\n🔧 FIXES NEEDED:');
    console.log('1. Fix the issues listed above');
    console.log('2. Restart the backend server: npm start');
    console.log('3. Run this diagnostic again');
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️ WARNINGS:');
    warnings.forEach(warning => console.log(warning));
  }
  
  console.log('\n📞 COMMON EMAIL ISSUES & SOLUTIONS:');
  console.log('- Emails not loading: Check authentication token');
  console.log('- Emails not sending: Check SMTP credentials');
  console.log('- Empty inbox: No emails in database yet');
  console.log('- Slow loading: Database connection issues');
  console.log('- 401 errors: User not logged in as admin');
  console.log('- 500 errors: Backend server problems');
}

// Run diagnostics
runDiagnostics().then(() => {
  console.log('\n✅ Diagnostic complete!');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Diagnostic failed:', error);
  process.exit(1);
});