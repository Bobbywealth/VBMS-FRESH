# 🚀 Social Media Management (SMM) Setup Guide

## 📋 Overview
This guide will help you connect your social media accounts to VBMS for live data integration.

## 🔑 Step 1: Get API Credentials

### Instagram Business API Setup
1. **Go to Facebook Developers**: https://developers.facebook.com/
2. **Create a new app** or use existing one
3. **Add Instagram Basic Display** product
4. **Configure OAuth Redirect URIs**:
   - Add: `https://your-domain.com/api/smm/oauth/instagram/callback`
5. **Get credentials**:
   - App ID
   - App Secret
   - Access Token (with `instagram_basic` and `pages_read_engagement` permissions)

### Facebook Graph API Setup
1. **Same Facebook App** as Instagram
2. **Add Facebook Login** product
3. **Configure OAuth**:
   - Add: `https://your-domain.com/api/smm/oauth/facebook/callback`
4. **Get Page Access Token**:
   - Go to Graph API Explorer
   - Select your page
   - Get token with permissions: `pages_read_engagement`, `pages_manage_posts`

### Twitter API v2 Setup
1. **Go to Twitter Developer Portal**: https://developer.twitter.com/
2. **Create a new app**
3. **Apply for Elevated access** (for posting capabilities)
4. **Get credentials**:
   - API Key
   - API Secret
   - Access Token
   - Access Token Secret

### Google My Business API Setup
1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project**
3. **Enable Google My Business API**
4. **Create credentials**:
   - API Key
   - Service Account (for server-to-server auth)
5. **Get Business Account ID** from Google My Business dashboard

## ⚙️ Step 2: Environment Configuration

Add these variables to your `.env` file:

```bash
# Instagram Basic Display API
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token_here
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id_here

# Facebook Graph API
FACEBOOK_ACCESS_TOKEN=your_facebook_page_access_token_here
FACEBOOK_PAGE_ID=your_facebook_page_id_here
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here

# Twitter API v2
TWITTER_API_KEY=your_twitter_api_key_here
TWITTER_API_SECRET=your_twitter_api_secret_here
TWITTER_ACCESS_TOKEN=your_twitter_access_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret_here

# Google My Business API
GOOGLE_BUSINESS_ID=your_google_business_id_here
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_ACCOUNT_ID=your_google_account_id_here
```

## 🔗 Step 3: Connect Accounts via UI

### Method 1: Admin Dashboard Connection
1. **Login** to VBMS admin dashboard
2. **Go to** Social Media Management
3. **Click** "Connect Account" for each platform
4. **Follow OAuth flow** for each platform
5. **Verify connection** status

### Method 2: API Endpoint Connection
Use these endpoints to connect accounts:

```bash
# Connect Instagram
POST /api/smm/accounts/connect
{
  "platform": "Instagram",
  "accessToken": "your_token",
  "accountId": "your_business_account_id",
  "username": "your_instagram_username"
}

# Connect Facebook
POST /api/smm/accounts/connect
{
  "platform": "Facebook",
  "accessToken": "your_page_token",
  "accountId": "your_page_id",
  "username": "your_page_username"
}

# Connect Twitter
POST /api/smm/accounts/connect
{
  "platform": "Twitter",
  "accessToken": "your_access_token",
  "accountId": "your_user_id",
  "username": "your_twitter_username"
}
```

## 📊 Step 4: Verify Live Data

### Check API Endpoints
Test these endpoints to verify live data:

```bash
# Get Instagram stats
GET /api/smm/instagram/stats

# Get Facebook stats
GET /api/smm/facebook/stats

# Get Twitter stats
GET /api/smm/twitter/stats

# Get Google reviews
GET /api/smm/google/reviews

# Get comprehensive analytics
GET /api/smm/dashboard
```

### Expected Response Format
```json
{
  "success": true,
  "data": {
    "instagram": {
      "followers": 12543,
      "engagement": 78,
      "growth": 2.3
    },
    "facebook": {
      "followers": 8234,
      "engagement": 65,
      "growth": 1.8
    },
    "twitter": {
      "followers": 5678,
      "engagement": 45,
      "growth": 0.5
    },
    "google": {
      "rating": 4.8,
      "reviews": 142
    }
  }
}
```

## 🔄 Step 5: Set Up Webhooks (Optional)

For real-time updates, configure webhooks:

### Facebook/Instagram Webhook
1. **Go to** Facebook App Dashboard
2. **Add Webhook** product
3. **Set callback URL**: `https://your-domain.com/api/smm/webhook/facebook`
4. **Subscribe to events**:
   - `page_feed`
   - `instagram_basic`
   - `page_mentions`

### Twitter Webhook
1. **Go to** Twitter Developer Portal
2. **Set up webhook**: `https://your-domain.com/api/smm/webhook/twitter`
3. **Subscribe to events**:
   - `tweets`
   - `mentions`
   - `follows`

## 🚨 Troubleshooting

### Common Issues:

1. **"Invalid access token"**
   - Check token permissions
   - Verify token hasn't expired
   - Regenerate token if needed

2. **"Rate limit exceeded"**
   - Implement rate limiting in your app
   - Use batch requests where possible
   - Cache responses

3. **"Account not found"**
   - Verify account IDs are correct
   - Check if account is public/business
   - Ensure proper permissions

4. **"Webhook verification failed"**
   - Verify callback URLs are correct
   - Check SSL certificate
   - Ensure proper response format

### Debug Endpoints:
```bash
# Check account status
GET /api/smm/accounts

# Test API connectivity
GET /api/smm/health

# View error logs
GET /api/smm/debug/errors
```

## 📈 Step 6: Monitor Performance

### Key Metrics to Track:
- **API Response Times**: Should be < 2 seconds
- **Data Freshness**: Updates every 5-15 minutes
- **Error Rates**: Should be < 1%
- **Rate Limit Usage**: Stay under 80% of limits

### Monitoring Dashboard:
Access `/admin-smm-dashboard.html` to monitor:
- Connection status for each platform
- Real-time data updates
- Error logs and alerts
- Performance metrics

## 🎯 Next Steps

Once live data is flowing:

1. **Set up automated posting** schedules
2. **Configure analytics** alerts
3. **Enable cross-platform** campaigns
4. **Set up customer** access to their analytics
5. **Implement advanced** features like AI-powered content suggestions

## 📞 Support

If you encounter issues:
1. Check the **error logs** in admin dashboard
2. Verify **API credentials** are correct
3. Test **individual endpoints** for each platform
4. Contact **support** with specific error messages

---

**🎉 Congratulations!** Your VBMS platform now has live social media data integration!
