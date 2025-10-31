// Simple proxy server to redirect to the actual backend
const path = require('path');

// Change to the backend directory and require the actual server
process.chdir(path.join(__dirname, '07-04-2025/VBMS Website/VBMS Website/vbms-backend'));
require('./server.js');
