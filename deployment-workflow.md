# VBMS Deployment Workflow

## 🎯 **CRITICAL: Always Work in VBMS-FRESH Repository**

### **✅ Correct Repository:**
- **Path**: `/Users/bobbyc/Downloads/VBMS-FRESH`
- **GitHub**: `https://github.com/Bobbywealth/VBMS-FRESH.git`
- **Render Connection**: ✅ Connected to this repo

### **❌ Avoid This Repository:**
- **Path**: `/Users/bobbyc/Downloads/VBMS-EDIT-OFFICIAL-600`
- **Status**: ❌ NOT connected to Render
- **Use**: Reference only, do NOT deploy from here

## 🚀 **Pre-Deployment Checklist**

### **Step 1: Verify Working Directory**
```bash
pwd
# Should show: /Users/bobbyc/Downloads/VBMS-FRESH
```

### **Step 2: Confirm Git Remote**
```bash
git remote -v
# Should show: origin https://github.com/Bobbywealth/VBMS-FRESH.git
```

### **Step 3: Check Branch**
```bash
git branch
# Should show: * main
```

### **Step 4: Test Changes Locally**
- Make changes
- Test functionality
- Verify no console errors

### **Step 5: Deploy**
```bash
git add .
git commit -m "Clear description of changes"
git push origin main
```

### **Step 6: Verify Deployment**
- Check Render Events tab
- Wait for deployment completion
- Test live site

## 🔍 **Directory Structure Reference**

```
/Users/bobbyc/Downloads/
├── VBMS-FRESH/                    ← ✅ WORK HERE
│   ├── 07-04-2025/
│   │   └── VBMS Website/
│   │       └── VBMS Website/      ← Frontend files
│   └── .git/                      ← Connected to Render
└── VBMS-EDIT-OFFICIAL-600/        ← ❌ Reference only
    └── 07-04-2025/
        └── VBMS Website/
            └── VBMS Website/
```

## 🛡️ **Safety Measures**

### **Always Start With:**
```bash
cd /Users/bobbyc/Downloads/VBMS-FRESH
pwd  # Confirm location
git status  # Check repo status
```

### **Before Any Changes:**
```bash
git pull origin main  # Get latest changes
```

### **Emergency Recovery:**
If changes made in wrong directory:
```bash
# Copy from VBMS-EDIT-OFFICIAL-600 to VBMS-FRESH
cp -r "/path/to/wrong/files" "/Users/bobbyc/Downloads/VBMS-FRESH/target/"
cd /Users/bobbyc/Downloads/VBMS-FRESH
git add .
git commit -m "Fix: Copy changes to correct repository"
git push origin main
```

## 🎯 **Quick Commands**

### **Navigate to Correct Directory:**
```bash
alias vbms="cd /Users/bobbyc/Downloads/VBMS-FRESH"
```

### **Check Repository Status:**
```bash
alias vbms-check="pwd && git remote -v && git branch"
```

### **Deploy Changes:**
```bash
alias vbms-deploy="git add . && git commit -m 'Deploy changes' && git push origin main"
```
