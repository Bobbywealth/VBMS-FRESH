const fetch = require('node-fetch');
require('dotenv').config();

console.log('🧪 VBMS Email API Test');
console.log('======================');

const API_BASE = 'http://localhost:5050';

async function testEmailAPI() {
  try {
    console.log('\n🔍 Step 1: Testing server connection...');
    
    // Test server health
    const healthResponse = await fetch(`${API_BASE}/api/test`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Server is running:', healthData.message);
    } else {
      throw new Error('Server not responding - make sure backend is running on port 5050');
    }
    
    console.log('\n📧 Step 2: Testing email routes...');
    
    // Test email stats endpoint (requires authentication)
    try {
      const statsResponse = await fetch(`${API_BASE}/api/email/stats/overview`);
      console.log('📊 Email stats endpoint status:', statsResponse.status);
      
      if (statsResponse.status === 401) {
        console.log('✅ Email API is secured (requires authentication) - This is correct!');
      } else if (statsResponse.ok) {
        console.log('✅ Email stats endpoint accessible');
      }
    } catch (error) {
      console.log('⚠️  Email stats endpoint error:', error.message);
    }
    
    // Test notifications endpoint
    try {
      const notificationsResponse = await fetch(`${API_BASE}/api/notifications/count`);
      console.log('🔔 Notifications endpoint status:', notificationsResponse.status);
      
      if (notificationsResponse.status === 401) {
        console.log('✅ Notifications API is secured (requires authentication) - This is correct!');
      } else if (notificationsResponse.ok) {
        console.log('✅ Notifications endpoint accessible');
      }
    } catch (error) {
      console.log('⚠️  Notifications endpoint error:', error.message);
    }
    
    console.log('\n📋 Step 3: Checking required models...');
    
    // Check if models exist
    const fs = require('fs');
    const path = require('path');
    
    const emailModelPath = path.join(__dirname, 'models', 'Email.js');
    const notificationModelPath = path.join(__dirname, 'models', 'Notification.js');
    
    console.log('📧 Email model:', fs.existsSync(emailModelPath) ? '✅ Found' : '❌ Missing');
    console.log('🔔 Notification model:', fs.existsSync(notificationModelPath) ? '✅ Found' : '❌ Missing');
    
    console.log('\n📡 Step 4: Checking route files...');
    
    const emailRoutePath = path.join(__dirname, 'routes', 'email.js');
    const notificationRoutePath = path.join(__dirname, 'routes', 'notifications.js');
    
    console.log('📧 Email routes:', fs.existsSync(emailRoutePath) ? '✅ Found' : '❌ Missing');
    console.log('🔔 Notification routes:', fs.existsSync(notificationRoutePath) ? '✅ Found' : '❌ Missing');
    
    console.log('\n🎉 API TEST COMPLETE!');
    console.log('=====================');
    console.log('');
    console.log('✨ To test the full email system:');
    console.log('1. Make sure your backend server is running: npm start');
    console.log('2. Open your browser and go to: http://localhost:5501');
    console.log('3. Login as admin and go to Email Management');
    console.log('4. Try sending a test email');
    console.log('');
    console.log('🔧 If inbox emails are not loading:');
    console.log('1. Check browser console for JavaScript errors');
    console.log('2. Check Network tab for failed API calls');
    console.log('3. Verify you are logged in as admin');
    console.log('4. Check backend server logs for errors');
    
  } catch (error) {
    console.log('\n❌ API TEST FAILED!');
    console.log('==================');
    console.error('Error:', error.message);
    console.log('');
    console.log('🔧 Make sure:');
    console.log('1. Backend server is running on port 5050');
    console.log('2. Run: npm start in the vbms-backend folder');
    console.log('3. Check server logs for any startup errors');
  }
}

// Run the test
testEmailAPI().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test script error:', error);
  process.exit(1);
});