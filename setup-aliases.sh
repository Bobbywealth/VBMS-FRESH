#!/bin/bash

# VBMS Terminal Aliases Setup
# Run this once to set up helpful aliases

echo "🔧 Setting up VBMS deployment aliases..."

# Add aliases to .zshrc (since you're using zsh)
cat >> ~/.zshrc << 'EOF'

# ========================================
# VBMS Deployment Aliases
# ========================================

# Navigate to correct VBMS repository
alias vbms="cd /Users/bobbyc/Downloads/VBMS-FRESH && pwd"

# Check repository status and location
alias vbms-check="echo '📍 Current Directory:' && pwd && echo '📡 Git Remote:' && git remote -v && echo '🌿 Current Branch:' && git branch --show-current && echo '📊 Git Status:' && git status --short"

# Quick deployment (with safety checks)
alias vbms-deploy="/Users/bobbyc/Downloads/VBMS-FRESH/deploy-vbms.sh"

# Pull latest changes
alias vbms-pull="cd /Users/bobbyc/Downloads/VBMS-FRESH && git pull origin main"

# Show VBMS URLs
alias vbms-urls="echo '🌐 Live Site: https://vbms-fresh-offical-website-launch.onrender.com' && echo '📊 Render Dashboard: https://dashboard.render.com' && echo '📁 GitHub Repo: https://github.com/Bobbywealth/VBMS-FRESH'"

# Emergency: Copy from wrong directory to correct one
alias vbms-emergency-copy="echo '🚨 Emergency: Copying from VBMS-EDIT-OFFICIAL-600 to VBMS-FRESH' && cp -r '/Users/bobbyc/Downloads/VBMS-EDIT-OFFICIAL-600/07-04-2025/VBMS Website/VBMS Website/'* '/Users/bobbyc/Downloads/VBMS-FRESH/07-04-2025/VBMS Website/VBMS Website/' && echo '✅ Files copied. Now run: vbms && vbms-deploy'"

EOF

echo "✅ Aliases added to ~/.zshrc"
echo ""
echo "🔄 To activate aliases, run:"
echo "   source ~/.zshrc"
echo ""
echo "📋 Available aliases:"
echo "   vbms           - Navigate to correct repository"
echo "   vbms-check     - Check repository status"
echo "   vbms-deploy    - Safe deployment with checks"
echo "   vbms-pull      - Pull latest changes"
echo "   vbms-urls      - Show important URLs"
echo "   vbms-emergency-copy - Copy files from wrong directory"
echo ""
echo "🎯 Usage example:"
echo "   vbms"
echo "   vbms-check"
echo "   # Make your changes"
echo "   vbms-deploy"
