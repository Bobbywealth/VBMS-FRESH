# 🚀 RENDER SERVICE CONFIGURATION INSTRUCTIONS

## Current Issue
Your Render service is configured as a **Static Site** but needs to be a **Web Service** to run the Node.js backend.

## 🔧 SOLUTION: Reconfigure Your Render Service

### Option 1: Update Existing Service (Recommended)
1. Go to your Render Dashboard: https://dashboard.render.com
2. Find your service: `vbms-fresh-offical-website-launch`
3. Click **Settings**
4. Change these settings:

```
Service Type: Web Service (not Static Site)
Environment: Node
Build Command: cd "07-04-2025/VBMS Website/VBMS Website/vbms-backend" && npm install
Start Command: cd "07-04-2025/VBMS Website/VBMS Website/vbms-backend" && node server.js
Root Directory: ./
```

### Option 2: Create New Web Service
1. Go to Render Dashboard
2. Click **New** → **Web Service**
3. Connect your GitHub repo: `VBMS-FRESH`
4. Configure:

```
Name: vbms-backend-api
Environment: Node
Build Command: cd "07-04-2025/VBMS Website/VBMS Website/vbms-backend" && npm install
Start Command: cd "07-04-2025/VBMS Website/VBMS Website/vbms-backend" && node server.js
Root Directory: ./
```

## 🔑 Environment Variables (Required)
Add these in Render Settings → Environment:

```
NODE_ENV = production
DATABASE_URL = postgresql://vbms_official_database_user:xNSBQdx8Lg1pe6sO9r5wwFsILiFKr8bm@dpg-d4219j9r0fns738rnjb0-a.oregon-postgres.render.com/vbms_official_database
JWT_SECRET = vbms_jwt_secret_2024_secure_key_production
PORT = 10000
CORS_ORIGIN = https://vbms-fresh-offical-website-launch.onrender.com
FRONTEND_URL = https://vbms-fresh-offical-website-launch.onrender.com
```

## ✅ After Configuration
1. Deploy the service
2. Wait for deployment to complete
3. Test login with these credentials:

### 🔑 LOGIN CREDENTIALS READY:
```
ADMIN:
Email: admin@vbmstest.com
Password: admin123

FOUNDER:
Email: BobbyAdmin@vbms.com
Password: Xrprich12$

TEST CUSTOMER:
Email: customer@vbmstest.com
Password: customer123

DESIGN CUSTOMER (NEW!):
Email: design@vbmstest.com
Password: design123
```

## 🔍 How to Verify It's Working
After deployment, these should work:
- https://your-service.onrender.com/health (should return JSON)
- https://your-service.onrender.com/api/health (should return JSON)
- Login page should work without "Invalid credentials" error

## 📁 Files Added/Updated
- ✅ `render.yaml` - Render configuration
- ✅ `package.json` - Root package.json for Render
- ✅ `server.js` - Updated to serve static files
- ✅ Database accounts created and ready
- ✅ CORS configuration updated

## 🆘 Need Help?
If you get stuck, let me know and I can help troubleshoot!
