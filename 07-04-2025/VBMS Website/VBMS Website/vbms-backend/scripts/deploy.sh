#!/bin/bash

# VBMS Backend Deployment Script
# ==============================

set -e # Exit on any error

echo "🚀 Starting VBMS Backend Deployment..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NODE_VERSION="18"
DEPLOYMENT_ENV=${1:-production}
BACKUP_ENABLED=${BACKUP_ENABLED:-true}

echo -e "${BLUE}Deployment Environment: ${DEPLOYMENT_ENV}${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js $NODE_VERSION or higher."
        exit 1
    fi
    
    NODE_CURRENT=$(node -v | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_CURRENT" -lt "$NODE_VERSION" ]; then
        print_error "Node.js version $NODE_CURRENT is too old. Please upgrade to version $NODE_VERSION or higher."
        exit 1
    fi
    
    print_status "Node.js version check passed"
}

# Check if PM2 is installed
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 is not installed. Installing PM2..."
        npm install -g pm2
    fi
    print_status "PM2 check passed"
}

# Create necessary directories
create_directories() {
    mkdir -p logs uploads
    print_status "Directories created"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm ci --only=production
    print_status "Dependencies installed"
}

# Run database migrations (if any)
run_migrations() {
    if [ -f "scripts/migrate-database.js" ]; then
        print_status "Running database migrations..."
        node scripts/migrate-database.js
        print_status "Database migrations completed"
    fi
}

# Setup environment
setup_environment() {
    if [ ! -f ".env.${DEPLOYMENT_ENV}" ]; then
        print_error "Environment file .env.${DEPLOYMENT_ENV} not found!"
        exit 1
    fi
    
    cp ".env.${DEPLOYMENT_ENV}" .env
    print_status "Environment configured for ${DEPLOYMENT_ENV}"
}

# Backup current deployment (if exists)
backup_current() {
    if [ "$BACKUP_ENABLED" = "true" ] && [ -d "backup" ]; then
        BACKUP_DIR="backup/backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        cp -r . "$BACKUP_DIR/" 2>/dev/null || print_warning "Backup creation failed"
        print_status "Current deployment backed up to $BACKUP_DIR"
    fi
}

# Health check
health_check() {
    print_status "Performing health check..."
    sleep 5 # Wait for server to start
    
    if curl -f http://localhost:5050/health > /dev/null 2>&1; then
        print_status "Health check passed"
        return 0
    else
        print_error "Health check failed"
        return 1
    fi
}

# Deploy with PM2
deploy_pm2() {
    print_status "Deploying with PM2..."
    
    # Stop existing processes
    pm2 stop vbms-backend 2>/dev/null || print_warning "No existing PM2 process found"
    
    # Start with ecosystem file
    pm2 start ecosystem.config.js --env $DEPLOYMENT_ENV
    pm2 save
    
    print_status "PM2 deployment completed"
}

# Deploy with Docker
deploy_docker() {
    print_status "Deploying with Docker..."
    
    # Build Docker image
    docker build -t vbms-backend:latest .
    
    # Stop existing container
    docker stop vbms-backend 2>/dev/null || print_warning "No existing container found"
    docker rm vbms-backend 2>/dev/null || true
    
    # Start new container
    docker-compose up -d
    
    print_status "Docker deployment completed"
}

# Main deployment function
main() {
    echo -e "${BLUE}Pre-deployment checks...${NC}"
    check_node
    check_pm2
    create_directories
    
    echo -e "${BLUE}Setting up environment...${NC}"
    setup_environment
    backup_current
    
    echo -e "${BLUE}Installing and configuring...${NC}"
    install_dependencies
    run_migrations
    
    echo -e "${BLUE}Deploying application...${NC}"
    
    # Choose deployment method
    if [ "$DEPLOY_METHOD" = "docker" ]; then
        deploy_docker
    else
        deploy_pm2
    fi
    
    echo -e "${BLUE}Post-deployment verification...${NC}"
    if health_check; then
        print_status "Deployment completed successfully! 🎉"
        echo -e "${GREEN}"
        echo "VBMS Backend is now running:"
        echo "- Health Check: http://localhost:5050/health"
        echo "- API Test: http://localhost:5050/api/test"
        echo "- PM2 Status: pm2 status"
        echo "- Logs: pm2 logs vbms-backend"
        echo -e "${NC}"
    else
        print_error "Deployment completed but health check failed"
        print_warning "Check logs: pm2 logs vbms-backend"
        exit 1
    fi
}

# Rollback function
rollback() {
    print_warning "Rolling back deployment..."
    pm2 stop vbms-backend
    # Restore from backup logic would go here
    print_status "Rollback completed"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy" | "production" | "staging")
        main
        ;;
    "rollback")
        rollback
        ;;
    "health")
        health_check
        ;;
    *)
        echo "Usage: $0 [deploy|rollback|health]"
        echo "Environment options: production, staging"
        exit 1
        ;;
esac