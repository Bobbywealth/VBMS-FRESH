const fs = require('fs');
const path = require('path');

console.log('🔧 VBMS Email Configuration Setup');
console.log('====================================');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

console.log(`📁 .env file ${envExists ? 'found' : 'not found'} at: ${envPath}`);

// Email configuration for business@wolfpaqmarketing.com
const emailConfig = `
# Email Configuration (GoDaddy Outlook Business)
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=587
SMTP_USER=business@wolfpaqmarketing.com
SMTP_PASS=YOUR_EMAIL_PASSWORD_HERE
ADMIN_EMAIL=business@wolfpaqmarketing.com

# Frontend URL (update with your actual domain)
FRONTEND_URL=http://localhost:5501
`;

if (!envExists) {
  // Create new .env file with email config
  const fullEnvContent = `# VBMS Environment Configuration
${emailConfig}
# MongoDB (required)
MONGO_URI=your-mongodb-connection-string

# JWT Secret (required)
JWT_SECRET=your-super-secure-jwt-secret-key-change-this

# Stripe (required for payments)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# OpenAI (for AI Agent)
OPENAI_API_KEY=your-openai-api-key

# Server Configuration
PORT=5050
`;

  fs.writeFileSync(envPath, fullEnvContent);
  console.log('✅ Created .env file with email configuration');
  console.log('');
  console.log('⚠️  IMPORTANT: You need to:');
  console.log('   1. Replace YOUR_EMAIL_PASSWORD_HERE with your actual email password');
  console.log('   2. Add your MongoDB connection string');
  console.log('   3. Add your other API keys');
  
} else {
  // Read existing .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Check if email config already exists
  if (envContent.includes('SMTP_HOST')) {
    console.log('✅ Email configuration already exists in .env file');
  } else {
    // Append email configuration
    envContent += emailConfig;
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Added email configuration to existing .env file');
    console.log('');
    console.log('⚠️  IMPORTANT: You need to replace YOUR_EMAIL_PASSWORD_HERE with your actual email password');
  }
}

console.log('');
console.log('📧 Email Settings for business@wolfpaqmarketing.com:');
console.log('   SMTP Host: smtpout.secureserver.net');
console.log('   SMTP Port: 587');
console.log('   Email: business@wolfpaqmarketing.com');
console.log('   Password: [You need to provide this]');
console.log('');
console.log('🔐 Security Notes:');
console.log('   - Use an App Password if 2FA is enabled');
console.log('   - Make sure "Less secure apps" is enabled in email settings');
console.log('   - If emails fail, try alternative SMTP host: relay-hosting.secureserver.net');
console.log('');
console.log('🚀 To complete setup:');
console.log('   1. Edit the .env file and add your email password');
console.log('   2. Restart your backend server: npm start');
console.log('   3. Test email sending through the Email Manager dashboard');
console.log('');
console.log('✨ Setup complete! Check the .env file and update your credentials.');

process.exit(0);