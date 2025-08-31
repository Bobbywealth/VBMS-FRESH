/**
 * Email System Debug Script
 * Run this in the browser console to test email functionality
 */

console.log('🧪 VBMS Email System Debug');
console.log('==========================');

// Test 1: Check if required scripts are loaded
console.log('\n📋 Step 1: Checking loaded scripts...');

const requiredGlobals = [
  { name: 'vbmsAuth', obj: window.vbmsAuth },
  { name: 'vbmsEmailManager', obj: window.vbmsEmailManager },
  { name: 'vbmsNotifications', obj: window.vbmsNotifications }
];

requiredGlobals.forEach(item => {
  console.log(`${item.name}:`, item.obj ? '✅ Loaded' : '❌ Missing');
});

// Test 2: Check authentication
console.log('\n🔐 Step 2: Checking authentication...');

const token = localStorage.getItem('vbms_token');
console.log('Auth token:', token ? '✅ Found' : '❌ Missing');

if (window.vbmsAuth) {
  console.log('Is authenticated:', vbmsAuth.isAuthenticated() ? '✅ Yes' : '❌ No');
  console.log('Current role:', vbmsAuth.getCurrentRole());
  console.log('Is admin:', vbmsAuth.isAdmin() ? '✅ Yes' : '❌ No');
  console.log('Is main admin:', vbmsAuth.isMainAdmin() ? '✅ Yes' : '❌ No');
} else {
  console.log('❌ vbmsAuth not available');
}

// Test 3: Check API endpoints
console.log('\n📡 Step 3: Testing API endpoints...');

async function testEmailEndpoints() {
  if (!token) {
    console.log('❌ Cannot test API - no auth token found');
    return;
  }
  
  const endpoints = [
    '/api/email/stats/overview',
    '/api/email/sent',
    '/api/email/inbox',
    '/api/email/drafts',
    '/api/notifications/count'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`${endpoint}: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Response data:', data);
      } else {
        const errorText = await response.text();
        console.log('❌ Error response:', errorText);
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint} failed:`, error.message);
    }
  }
}

// Test 4: Check DOM elements
console.log('\n🏗️  Step 4: Checking DOM elements...');

const requiredElements = [
  'emailTableBody',
  'emailsSent',
  'emailsDelivered',
  'emailsOpened',
  'emailsClicked',
  'emailsFailed',
  'emailsDrafts'
];

requiredElements.forEach(id => {
  const element = document.getElementById(id);
  console.log(`#${id}:`, element ? '✅ Found' : '❌ Missing');
});

// Test 5: Manual email loading test
console.log('\n📧 Step 5: Testing email loading...');

async function testEmailLoading() {
  if (window.vbmsEmailManager) {
    console.log('🔄 Attempting to load emails...');
    try {
      await vbmsEmailManager.loadEmails();
      console.log('✅ Email loading completed');
    } catch (error) {
      console.log('❌ Email loading failed:', error);
    }
    
    console.log('🔄 Attempting to load email stats...');
    try {
      await vbmsEmailManager.loadEmailStats();
      console.log('✅ Email stats loading completed');
    } catch (error) {
      console.log('❌ Email stats loading failed:', error);
    }
  } else {
    console.log('❌ vbmsEmailManager not available - email manager script not loaded');
  }
}

// Test 6: Check browser console for errors
console.log('\n⚠️  Step 6: Check for JavaScript errors...');
console.log('Look in the browser console for any red error messages');
console.log('Common issues:');
console.log('- 404 errors: Script files not found');
console.log('- CORS errors: Backend not running or wrong port');
console.log('- 401 errors: Authentication problems');
console.log('- 500 errors: Backend server errors');

// Test 7: Network tab check
console.log('\n🌐 Step 7: Network tab recommendations...');
console.log('1. Open Developer Tools (F12)');
console.log('2. Go to Network tab');
console.log('3. Refresh the page');
console.log('4. Look for failed requests (red entries)');
console.log('5. Check if email API calls are being made');

// Auto-run tests
console.log('\n🚀 Running automatic tests...');

// Run API tests
testEmailEndpoints().then(() => {
  console.log('\n📊 API tests completed');
}).catch(error => {
  console.log('❌ API tests failed:', error);
});

// Run email loading tests
testEmailLoading().then(() => {
  console.log('\n📧 Email loading tests completed');
}).catch(error => {
  console.log('❌ Email loading tests failed:', error);
});

console.log('\n✨ Debug script completed!');
console.log('========================');
console.log('Copy and paste this entire script into your browser console');
console.log('while on the email management page to diagnose issues.');

// Export functions for manual testing
window.emailDebug = {
  testEndpoints: testEmailEndpoints,
  testEmailLoading: testEmailLoading,
  checkAuth: () => {
    console.log('Token:', localStorage.getItem('vbms_token') ? 'Found' : 'Missing');
    console.log('Authenticated:', window.vbmsAuth ? vbmsAuth.isAuthenticated() : 'Auth not loaded');
  },
  checkElements: () => {
    requiredElements.forEach(id => {
      const element = document.getElementById(id);
      console.log(`#${id}:`, element ? 'Found' : 'Missing');
    });
  }
};