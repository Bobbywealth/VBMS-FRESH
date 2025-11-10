# GoDaddy Outlook Business Email Setup for VBMS

## Required Settings for your .env file:

```bash
# Email Configuration (GoDaddy Outlook Business)
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=587
SMTP_USER=your-email@yourdomain.com
SMTP_PASS=your-email-password
ADMIN_EMAIL=your-email@yourdomain.com

# Alternative SMTP settings if the above doesn't work
# SMTP_HOST=relay-hosting.secureserver.net
# SMTP_PORT=25
```

## Steps to Configure:

1. **Add to your .env file** in `/vbms-backend/` directory:
   - Replace `your-email@yourdomain.com` with your actual GoDaddy business email
   - Replace `your-email-password` with your email password

2. **GoDaddy SMTP Settings:**
   - **Incoming Mail Server (IMAP):** imap.secureserver.net
   - **Incoming Port:** 993 (SSL) or 143 (TLS)
   - **Outgoing Mail Server (SMTP):** smtpout.secureserver.net
   - **Outgoing Port:** 587 (TLS) or 465 (SSL)

3. **Security Notes:**
   - Use an App Password if you have 2FA enabled
   - Make sure "Allow less secure apps" is enabled in your email settings
   - You may need to whitelist your server IP in GoDaddy

4. **Testing:**
   - Restart your backend server after adding the settings
   - Send a test email through the Email Management dashboard
   - Check the server logs for any SMTP connection errors

## Troubleshooting:

If emails aren't sending:
1. Try the alternative SMTP host: `relay-hosting.secureserver.net`
2. Try different ports: 25, 465, or 587
3. Check your GoDaddy email account settings
4. Verify your email credentials are correct
5. Check if your hosting provider blocks SMTP ports

## Email Features Enabled:
- Welcome emails for new customers
- Payment confirmations
- Password reset emails
- Admin notifications
- Custom email campaigns through Email Manager
- Real-time email tracking and analytics