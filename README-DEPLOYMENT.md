# 🚨 CRITICAL: VBMS Deployment Instructions

## ⚠️ **ALWAYS WORK IN THIS DIRECTORY**
```
/Users/bobbyc/Downloads/VBMS-FRESH
```

## ❌ **NEVER DEPLOY FROM HERE**
```
/Users/bobbyc/Downloads/VBMS-EDIT-OFFICIAL-600
```

---

## 🎯 **Quick Start Guide**

### **1. Navigate to Correct Directory**
```bash
cd /Users/bobbyc/Downloads/VBMS-FRESH
```

### **2. Verify You're in the Right Place**
```bash
pwd
# Should show: /Users/bobbyc/Downloads/VBMS-FRESH

git remote -v
# Should show: origin https://github.com/Bobbywealth/VBMS-FRESH.git
```

### **3. Make Your Changes**
- Edit files in: `07-04-2025/VBMS Website/VBMS Website/`
- Test locally if possible

### **4. Deploy Safely**
```bash
./deploy-vbms.sh
```
OR manually:
```bash
git add .
git commit -m "Description of changes"
git push origin main
```

### **5. Verify Deployment**
- Check Render Events: https://dashboard.render.com
- Test live site: https://vbms-fresh-offical-website-launch.onrender.com

---

## 🛠️ **Setup Tools (Run Once)**

### **Install Aliases:**
```bash
./setup-aliases.sh
source ~/.zshrc
```

### **Then Use:**
- `vbms` - Navigate to correct directory
- `vbms-check` - Verify repository status
- `vbms-deploy` - Safe deployment
- `vbms-urls` - Show important URLs

---

## 🚨 **Emergency Recovery**

If you accidentally worked in the wrong directory:

```bash
# Copy files from wrong location
vbms-emergency-copy

# Navigate to correct directory
vbms

# Deploy the copied files
vbms-deploy
```

---

## 📊 **Repository Status**

### **✅ CORRECT (Connected to Render):**
- **Path**: `/Users/bobbyc/Downloads/VBMS-FRESH`
- **GitHub**: `https://github.com/Bobbywealth/VBMS-FRESH.git`
- **Render**: ✅ Auto-deploys from this repo

### **❌ WRONG (Reference Only):**
- **Path**: `/Users/bobbyc/Downloads/VBMS-EDIT-OFFICIAL-600`
- **Status**: Not connected to Render
- **Use**: Reference/backup only

---

## 🎯 **Key Files to Edit**

All files are in: `07-04-2025/VBMS Website/VBMS Website/`

### **Frontend:**
- `index.html` - Homepage
- `login.html` - Login page
- `admin-main-dashboard.html` - Admin dashboard
- `config.js` - API configuration
- `auth.js` - Authentication logic

### **Backend:**
- `vbms-backend/server.js` - Main server
- `vbms-backend/models/` - Database models
- `vbms-backend/routes/` - API routes

---

## 🔗 **Important URLs**

- **Live Site**: https://vbms-fresh-offical-website-launch.onrender.com
- **Render Dashboard**: https://dashboard.render.com
- **GitHub Repo**: https://github.com/Bobbywealth/VBMS-FRESH
- **Database**: PostgreSQL on Render

---

## 📞 **Admin Credentials**

- **Main Admin**: `admin@vbmstest.com` / `admin123`
- **Regular Admin**: `admin2@vbmstest.com` / `admin123`
- **Founder**: `BobbyAdmin@vbms.com` / `Xrprich12$`
- **Test Customer**: `customer@vbmstest.com` / `customer123`
