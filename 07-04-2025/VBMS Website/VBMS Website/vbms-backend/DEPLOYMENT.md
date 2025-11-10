# VBMS Backend Deployment Guide

This guide covers multiple deployment options for the VBMS Backend API.

## Prerequisites

- Node.js 18+ 
- MongoDB Atlas account (or local MongoDB)
- Stripe Live API keys
- Domain name (for production)
- SSL certificates (for production)

## Environment Configuration

### 1. Configure Production Environment

Copy `.env.production` and update with your production values:

```bash
cp .env.production .env
```

**Critical values to update:**
- `MONGO_URI` - Your MongoDB connection string
- `STRIPE_SECRET_KEY` - Your live Stripe secret key
- `JWT_SECRET` - Strong secret for JWT tokens
- `SMTP_USER` & `SMTP_PASS` - Email service credentials
- `AWS_*` - AWS S3 credentials for file storage
- `FRONTEND_URL` - Your frontend domain
- `PRODUCTION_URL` - Your API domain

## Deployment Options

### Option 1: PM2 (Recommended for VPS)

**Install PM2:**
```bash
npm install -g pm2
```

**Deploy:**
```bash
npm run pm2-start
```

**Management Commands:**
```bash
pm2 status                 # Check status
pm2 logs vbms-backend      # View logs
pm2 restart vbms-backend   # Restart app
pm2 stop vbms-backend      # Stop app
pm2 save                   # Save current processes
pm2 startup                # Auto-start on boot
```

### Option 2: Docker

**Build and run:**
```bash
docker-compose up -d
```

**Management Commands:**
```bash
docker-compose logs -f     # View logs
docker-compose restart     # Restart services
docker-compose down        # Stop all services
```

### Option 3: Vercel (Serverless)

**Install Vercel CLI:**
```bash
npm install -g vercel
```

**Deploy:**
```bash
vercel --prod
```

**Notes:**
- File uploads limited to 5MB
- Cold starts may affect performance
- Set environment variables in Vercel dashboard

### Option 4: Railway

**Deploy via Git:**
1. Push code to GitHub
2. Connect repository to Railway
3. Set environment variables
4. Deploy automatically on push

### Option 5: Custom Deployment Script

**Run deployment script:**
```bash
./scripts/deploy.sh production
```

**Script features:**
- Automated health checks
- Backup creation
- Environment validation
- PM2 process management

## SSL & Domain Setup

### 1. Domain Configuration

Point your domain's DNS to your server:
```
A record: api.yourdomain.com → YOUR_SERVER_IP
```

### 2. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Nginx Configuration

Create `/etc/nginx/sites-available/vbms-backend`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/vbms-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Health Monitoring

### Health Check Endpoints

- **Basic Health:** `GET /health`
- **Detailed Health:** `GET /health/detailed`
- **Readiness:** `GET /health/ready`
- **Liveness:** `GET /health/live`
- **Metrics:** `GET /health/metrics`
- **Database Stats:** `GET /health/db-stats`

### Example Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "services": {
    "database": { "status": "healthy", "latency": 45 },
    "stripe": { "status": "healthy", "latency": 120 },
    "email": { "status": "healthy" },
    "storage": { "status": "healthy" }
  }
}
```

## Performance Optimization

### 1. PM2 Cluster Mode

PM2 automatically uses all CPU cores:
```javascript
// ecosystem.config.js
instances: 'max',
exec_mode: 'cluster'
```

### 2. Database Optimization

- Enable MongoDB connection pooling
- Add database indexes for frequent queries
- Use MongoDB Atlas for automatic scaling

### 3. Caching

Add Redis for session storage and caching:
```bash
# Install Redis
sudo apt-get install redis-server

# Configure in your app
npm install redis connect-redis
```

### 4. CDN for Static Files

Configure AWS CloudFront or similar CDN for:
- File uploads (`/uploads/*`)
- Static assets

## Security Checklist

✅ **Environment Variables**
- All sensitive data in environment variables
- No secrets in code or config files

✅ **HTTPS/SSL**
- SSL certificate installed and configured
- HTTP redirects to HTTPS
- HSTS headers enabled

✅ **Firewall**
- Only necessary ports open (80, 443, 22)
- Database not exposed to internet
- VPS firewall configured

✅ **Authentication**
- Strong JWT secrets
- Rate limiting enabled
- Input validation on all endpoints

✅ **Monitoring**
- Health checks configured
- Error logging enabled
- Performance monitoring active

## Troubleshooting

### Common Issues

**MongoDB Connection Failed:**
```bash
# Check connection string
echo $MONGO_URI

# Test connection
node -e "require('mongoose').connect(process.env.MONGO_URI).then(() => console.log('Connected')).catch(console.error)"
```

**Stripe Webhook Issues:**
```bash
# Check webhook secret
echo $STRIPE_WEBHOOK_SECRET

# Test webhook endpoint
curl -X POST http://localhost:5050/webhook -H "Content-Type: application/json" -d '{}'
```

**PM2 Process Issues:**
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs vbms-backend --lines 50

# Restart process
pm2 restart vbms-backend
```

**Port Already in Use:**
```bash
# Find process using port 5050
sudo lsof -i :5050

# Kill process
sudo kill -9 <PID>
```

### Log Locations

- **PM2 Logs:** `~/.pm2/logs/`
- **Application Logs:** `./logs/`
- **System Logs:** `/var/log/`
- **Nginx Logs:** `/var/log/nginx/`

## Backup Strategy

### Database Backup

```bash
# Manual backup
mongodump --uri="your-mongodb-uri" --out=./backup/$(date +%Y%m%d)

# Automated backup (add to crontab)
0 2 * * * /path/to/backup-script.sh
```

### Application Backup

```bash
# Create backup
tar -czf vbms-backup-$(date +%Y%m%d).tar.gz ./ --exclude=node_modules --exclude=.git

# Restore backup
tar -xzf vbms-backup-20250115.tar.gz
```

## Production Checklist

Before going live:

- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] Database connection tested
- [ ] Stripe webhooks configured
- [ ] Email service tested
- [ ] File upload tested
- [ ] Health checks passing
- [ ] Domain DNS configured
- [ ] Firewall configured
- [ ] Backup strategy implemented
- [ ] Monitoring setup
- [ ] Load testing completed

---

## Support

For deployment issues:
- Check health endpoints: `/health/detailed`
- Review application logs: `pm2 logs vbms-backend`
- Monitor system resources
- Verify all environment variables are set

**Need help?** Create an issue in the repository with:
- Deployment method used
- Error messages
- Health check results
- System information