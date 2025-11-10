#!/bin/bash

# VBMS Deployment Script
# This script ensures we're always in the correct directory and repository

set -e  # Exit on any error

echo "🚀 VBMS Deployment Script Starting..."

# Define the correct repository path
CORRECT_REPO="/Users/bobbyc/Downloads/VBMS-FRESH"
WRONG_REPO="/Users/bobbyc/Downloads/VBMS-EDIT-OFFICIAL-600"

# Function to check if we're in the correct directory
check_directory() {
    CURRENT_DIR=$(pwd)
    echo "📍 Current directory: $CURRENT_DIR"
    
    if [[ "$CURRENT_DIR" == *"VBMS-EDIT-OFFICIAL-600"* ]]; then
        echo "❌ ERROR: You're in the WRONG repository!"
        echo "❌ Current: $CURRENT_DIR"
        echo "✅ Should be: $CORRECT_REPO"
        echo ""
        echo "🔧 Switching to correct repository..."
        cd "$CORRECT_REPO"
        echo "✅ Now in: $(pwd)"
    elif [[ "$CURRENT_DIR" == *"VBMS-FRESH"* ]]; then
        echo "✅ Correct repository confirmed!"
    else
        echo "⚠️  Unknown directory. Switching to correct repository..."
        cd "$CORRECT_REPO"
        echo "✅ Now in: $(pwd)"
    fi
}

# Function to verify git remote
check_git_remote() {
    echo ""
    echo "🔍 Checking git remote..."
    REMOTE_URL=$(git remote get-url origin)
    echo "📡 Remote URL: $REMOTE_URL"
    
    if [[ "$REMOTE_URL" == *"VBMS-FRESH"* ]]; then
        echo "✅ Correct git remote confirmed!"
    else
        echo "❌ ERROR: Wrong git remote!"
        echo "❌ Current: $REMOTE_URL"
        echo "✅ Should contain: VBMS-FRESH"
        exit 1
    fi
}

# Function to show git status
show_status() {
    echo ""
    echo "📊 Git Status:"
    git status --short
    echo ""
    echo "🌿 Current branch: $(git branch --show-current)"
}

# Function to deploy changes
deploy_changes() {
    echo ""
    echo "🚀 Starting deployment..."
    
    # Check for changes
    if [[ -z $(git status --porcelain) ]]; then
        echo "⚠️  No changes to deploy!"
        return 0
    fi
    
    # Show what will be committed
    echo "📝 Changes to be deployed:"
    git status --short
    echo ""
    
    # Get commit message
    if [[ -z "$1" ]]; then
        echo "💬 Enter commit message (or press Enter for default):"
        read -r COMMIT_MSG
        if [[ -z "$COMMIT_MSG" ]]; then
            COMMIT_MSG="🚀 Deploy changes - $(date '+%Y-%m-%d %H:%M')"
        fi
    else
        COMMIT_MSG="$1"
    fi
    
    # Deploy
    echo "📦 Adding files..."
    git add .
    
    echo "💾 Committing with message: $COMMIT_MSG"
    git commit -m "$COMMIT_MSG"
    
    echo "🌐 Pushing to GitHub..."
    git push origin main
    
    echo ""
    echo "🎉 Deployment completed successfully!"
    echo "⏱️  Check Render Events tab for deployment progress"
    echo "🔗 Site: https://vbms-fresh-offical-website-launch.onrender.com"
}

# Main execution
main() {
    echo "=================================="
    echo "🎯 VBMS Deployment Safety Check"
    echo "=================================="
    
    check_directory
    check_git_remote
    show_status
    
    echo ""
    echo "🤔 What would you like to do?"
    echo "1) Deploy changes"
    echo "2) Just check status"
    echo "3) Pull latest changes"
    echo "4) Exit"
    echo ""
    read -p "Choose option (1-4): " choice
    
    case $choice in
        1)
            deploy_changes "$2"
            ;;
        2)
            echo "✅ Status check completed!"
            ;;
        3)
            echo "⬇️  Pulling latest changes..."
            git pull origin main
            echo "✅ Pull completed!"
            ;;
        4)
            echo "👋 Goodbye!"
            ;;
        *)
            echo "❌ Invalid option!"
            ;;
    esac
}

# Run main function with all arguments
main "$@"
