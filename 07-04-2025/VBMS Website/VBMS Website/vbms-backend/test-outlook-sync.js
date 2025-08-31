/**
 * Test Outlook Email Sync System
 */

require('dotenv').config();
const outlookSyncService = require('./services/outlookSyncService');

async function testOutlookSync() {
  try {
    console.log('🧪 Testing Outlook Email Sync System');
    console.log('=====================================');
    
    // Test 1: Connection Test
    console.log('\n1. Testing IMAP Connection...');
    const connectionTest = await outlookSyncService.testConnection();
    
    if (!connectionTest) {
      console.log('❌ Connection test failed - cannot proceed with sync test');
      return;
    }
    
    // Test 2: Sync Test (for bobbyadmin@vbms.com)
    console.log('\n2. Testing Email Sync...');
    const userEmail = 'bobbyadmin@vbms.com';
    const syncResults = await outlookSyncService.syncEmailsForUser(userEmail, 10); // Just 10 emails for testing
    
    console.log('\n🎉 Sync Test Results:');
    console.log('=====================');
    console.log('📥 Inbox:', syncResults.inbox);
    console.log('📤 Sent:', syncResults.sent);
    console.log('📊 Total:', syncResults.total);
    
    console.log('\n✅ Outlook sync system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
  }
}

// Run the test
testOutlookSync();