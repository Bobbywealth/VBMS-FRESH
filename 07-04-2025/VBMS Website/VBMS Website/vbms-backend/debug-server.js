// Debug version of server.js to catch startup errors
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('🚀 Starting VBMS server debug...');

try {
  require('./server.js');
} catch (error) {
  console.error('❌ Failed to require server.js:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}