# VBMS Backend - Production Dockerfile
# =====================================

# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install PM2 globally for production process management
RUN npm install -g pm2

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --only=production && npm cache clean --force

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S vbms -u 1001

# Create necessary directories
RUN mkdir -p logs uploads && \
    chown -R vbms:nodejs /app

# Copy application files
COPY --chown=vbms:nodejs . .

# Remove development files
RUN rm -f .env.example .env.development

# Set user
USER vbms

# Expose port
EXPOSE 5050

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('https://vbms-fresh-offical-website-launch.onrender.com/api/test', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start application with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]

# Labels for better organization
LABEL maintainer="VBMS Team"
LABEL version="1.0.0"
LABEL description="VBMS Backend API Server"