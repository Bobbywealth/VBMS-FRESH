# GoDaddy Email IMAP Setup Guide

## How to Enable IMAP on GoDaddy Business Email

### Method 1: Through GoDaddy Account Dashboard
1. **Log into GoDaddy Account**
   - Go to https://account.godaddy.com
   - Sign in with your credentials

2. **Navigate to Email Settings**
   - Click "Email & Marketing" or "Professional Email"
   - Find your business@wolfpaqmarketing.com email
   - Look for "Manage" or "Settings"

3. **Look for these sections:**
   - "Email Client Setup" or "Mail Client Settings"
   - "IMAP/POP Settings" 
   - "Third-party email client access"
   - "App passwords" or "Security settings"

### Method 2: Through Webmail Interface
1. **Access Webmail**
   - Go to https://email.secureserver.net
   - Or try https://webmail.secureserver.net
   - Login with business@wolfpaqmarketing.com

2. **Check Settings**
   - Look for "Settings", "Options", or gear icon
   - Find "Mail forwarding", "POP/IMAP", or "External access"

### Method 3: Check Email Client Settings Page
1. **GoDaddy Help Page**
   - Go to https://www.godaddy.com/help
   - Search for "IMAP settings" or "email client setup"
   - Look for your specific email plan type

## Common GoDaddy IMAP Settings

### Workspace Email (Office 365)
- **IMAP Server:** outlook.office365.com
- **Port:** 993
- **Encryption:** SSL/TLS

### Professional Email (GoDaddy)
- **IMAP Server:** imap.secureserver.net
- **Port:** 993 or 143
- **Encryption:** SSL/TLS or STARTTLS

## If IMAP Access is Restricted

### Create App-Specific Password
1. In your GoDaddy account, look for:
   - "Security Settings"
   - "Two-Factor Authentication" 
   - "App Passwords"
   - "Third-party app access"

2. Generate a new app password specifically for VBMS

### Contact GoDaddy Support
- **Phone:** 1-480-505-8877
- **Chat:** Available in your GoDaddy account
- **Ask specifically:** "How do I enable IMAP access for third-party applications on my business email account?"

## Alternative: Microsoft Outlook Web API
If IMAP is completely blocked, we can potentially use Microsoft Graph API if your GoDaddy email is powered by Office 365.

## Test Your Settings
Once you have the correct settings, we can update the VBMS configuration and test the connection.