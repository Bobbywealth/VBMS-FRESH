# 🔍 Email System Troubleshooting Guide

## ✅ Current Status
- **Backend Server**: ✅ Running on port 5050
- **Database**: ✅ Connected with 1 test email
- **SMTP**: ✅ Configured for GoDaddy
- **API Endpoints**: ✅ All working and secured
- **Email Storage**: ✅ Database saving works correctly

## 🚨 Main Issue: Emails Not Appearing in Frontend

### Root Cause Analysis

**The problem**: Emails are being sent via SMTP but not appearing in the inbox/sent folders in the web interface.

**Most likely causes**:

1. **User Mismatch**: You're logged in as a different user than the one the emails are associated with
2. **Frontend Authentication**: JWT token issues or wrong user permissions
3. **Email Association**: Emails are saved but associated with wrong user IDs
4. **Frontend JavaScript Errors**: Email manager not loading properly

## 🔧 Step-by-Step Debugging

### Step 1: Check Which User You're Logged In As

**In Browser Console (F12 → Console tab):**
```javascript
// Check current user
console.log('Current user:', localStorage.getItem('vbms_token'));

// Decode the JWT token to see user info
const token = localStorage.getItem('vbms_token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('User ID:', payload.id);
  console.log('User Email:', payload.email);
  console.log('User Role:', payload.role);
}
```

### Step 2: Check If Emails Exist for Your User

**Expected user emails in database:**
- Test user: `admin@vbms.com` (has 1 sent email)
- Your user: Check what email you're logged in with

### Step 3: Test Email Sending with Debugging

**In Browser Console:**
```javascript
// Test sending an email with full debugging
async function testEmailSend() {
  const token = localStorage.getItem('vbms_token');
  console.log('Sending test email...');
  
  const response = await fetch('/api/email/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: 'business@wolfpaqmarketing.com',
      subject: 'Frontend Test Email',
      content: 'This is a test from the frontend',
      type: 'custom',
      priority: 'normal'
    })
  });
  
  const result = await response.json();
  console.log('Response:', result);
  
  if (!response.ok) {
    console.error('Email send failed:', result);
  } else {
    console.log('Email sent successfully!');
  }
}

// Run the test
testEmailSend();
```

### Step 4: Check API Responses

**In Browser Network Tab (F12 → Network):**
1. Refresh the email management page
2. Look for these API calls:
   - `/api/email/inbox` 
   - `/api/email/sent`
   - `/api/email/stats/overview`
3. Check if they return 200 OK or error codes
4. Click on each request to see the response data

### Step 5: Common Frontend Issues

**JavaScript Console Errors:**
- Look for red error messages in console
- Check if `vbmsEmailManager` is loaded
- Verify authentication token exists

**Authentication Issues:**
- 401 errors = Not logged in or token expired
- 403 errors = Wrong permissions
- 500 errors = Backend server problems

## 🎯 Quick Fixes

### Fix 1: Re-login as Admin
1. Logout completely
2. Login as admin with email: `admin@vbms.com`
3. Go to email management page
4. You should see the test email in sent folder

### Fix 2: Clear Browser Storage
```javascript
// Clear all stored data
localStorage.clear();
sessionStorage.clear();
// Then login again
```

### Fix 3: Create Email for Your User
Run this in the backend:
```bash
cd vbms-backend
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const Email = require('./models/Email');
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const email = new Email({
    to: 'business@wolfpaqmarketing.com',
    from: 'YOUR_EMAIL_HERE',  // Replace with your login email
    subject: 'Test for My User',
    content: { html: 'Test', text: 'Test' },
    status: 'sent',
    type: 'custom',
    category: 'sent'
  });
  await email.save();
  console.log('Email created for your user');
  process.exit();
});
"
```

## 📞 Still Not Working?

### Check These:

1. **Backend Logs**:
   ```bash
   cd vbms-backend
   tail -f server.log
   ```

2. **Email Service Status**:
   ```bash
   cd vbms-backend
   node test-email-system.js
   ```

3. **Database Query**:
   ```bash
   cd vbms-backend
   node test-email-database.js
   ```

### Contact Information
If none of these steps work, the issue might be:
- Complex authentication flow problems
- Database connection issues during runtime
- Frontend/backend API mismatches
- CORS or network issues

Run the diagnostics and check browser console for specific error messages.