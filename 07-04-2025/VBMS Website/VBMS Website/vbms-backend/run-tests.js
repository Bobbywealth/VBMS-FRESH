require('dotenv').config();
const VBMSTestSuite = require('./tests/test-suite');

async function runTests() {
  console.log('🚀 Starting VBMS Test Suite');
  console.log('Please ensure the server is running on https://vbms-fresh-offical-website-launch.onrender.com');
  console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...\n');

  // Wait 5 seconds to allow user to cancel
  await new Promise(resolve => setTimeout(resolve, 5000));

  const testSuite = new VBMSTestSuite();
  
  try {
    const results = await testSuite.runAllTests();
    
    // Exit with appropriate code
    if (results.summary.failed > 0) {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  }
}

runTests();