# 🚀 Cal.com API v2 - Single EC2 Instance Deployment

**Complete, self-contained deployment with PostgreSQL, Redis, and Nginx/SSL on one EC2 instance.**

## ✨ What's Included

- 🐘 **PostgreSQL 15** - Database
- 🔴 **Redis 7** - Cache & Queue
- 🌐 **Nginx** - Reverse Proxy with SSL
- 🔒 **Let's Encrypt** - Free SSL Certificates
- 📦 **Cal.com API v2** - The actual API

## ⚡ Quick Start (2 Commands!)

```bash
# 1. Run automated setup
./setup.sh

# 2. That's it! The script handles everything:
#    - Docker installation
#    - Password generation
#    - SSL setup (optional)
#    - Service deployment
```

## 📋 Manual Setup (If You Prefer)

### 1. Prerequisites

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y
```

### 2. Configuration

```bash
# Copy and edit environment file
cp env.production.example .env

# Generate secure passwords
echo "DB_PASSWORD=$(openssl rand -base64 32)" >> .env
echo "REDIS_PASSWORD=$(openssl rand -base64 32)" >> .env
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" >> .env

# Edit with your domain and settings
nano .env
```

### 3. Deploy

**Option A: HTTP Only (Testing)**
```bash
# Use HTTP-only nginx config
mv nginx/conf.d/api-v2.conf nginx/conf.d/api-v2.conf.disabled
mv nginx/conf.d/api-v2-http-only.conf.disabled nginx/conf.d/api-v2-http-only.conf

# Start services
docker compose -f docker-compose.production.yml up -d --build
```

**Option B: HTTPS with Let's Encrypt (Production)**
```bash
# Get SSL certificate
docker compose -f docker-compose.production.yml run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d api.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos

# Update nginx config with your domain
sed -i 's/api.yourdomain.com/your-domain.com/g' nginx/conf.d/api-v2.conf

# Enable HTTPS config
mv nginx/conf.d/api-v2-http-only.conf nginx/conf.d/api-v2-http-only.conf.disabled
mv nginx/conf.d/api-v2.conf.disabled nginx/conf.d/api-v2.conf

# Start services
docker compose -f docker-compose.production.yml up -d --build
```

## 🧪 Test Your Deployment

```bash
# Health check
curl https://api.yourdomain.com/health
# Expected: {"status":"ok"}

# View API docs
open https://api.yourdomain.com/docs

# Check all services
docker compose -f docker-compose.production.yml ps
```

## 📊 Daily Operations

### View Logs
```bash
# All services
docker compose -f docker-compose.production.yml logs -f

# Specific service
docker compose -f docker-compose.production.yml logs -f api-v2
```

### Restart Services
```bash
docker compose -f docker-compose.production.yml restart
```

### Update Code
```bash
git pull
docker compose -f docker-compose.production.yml up -d --build
```

### Backup Database
```bash
docker compose -f docker-compose.production.yml exec postgres \
  pg_dump -U calcom calcom > backup-$(date +%Y%m%d).sql
```

### Restore Database
```bash
cat backup.sql | docker compose -f docker-compose.production.yml exec -T postgres \
  psql -U calcom calcom
```

## 🔧 Common Issues

### Port Already in Use
```bash
# Check what's using port 80/443
sudo lsof -i :80
sudo lsof -i :443

# Stop conflicting service
sudo systemctl stop apache2  # or nginx, etc.
```

### SSL Certificate Failed
```bash
# Ensure DNS points to your EC2 IP
dig api.yourdomain.com

# Check port 80 is accessible
curl http://api.yourdomain.com/.well-known/acme-challenge/test

# Try certificate again
docker compose -f docker-compose.production.yml run --rm certbot renew --force-renewal
```

### API Won't Start
```bash
# Check database is ready
docker compose -f docker-compose.production.yml exec postgres pg_isready

# Check environment variables
docker compose -f docker-compose.production.yml exec api-v2 env | grep DATABASE

# View detailed logs
docker compose -f docker-compose.production.yml logs api-v2 --tail=100
```

### Out of Disk Space
```bash
# Check disk usage
df -h
docker system df

# Clean up
docker system prune -a --volumes
```

## 🔒 Security Checklist

- [ ] Changed all passwords in `.env`
- [ ] SSL certificate installed and working
- [ ] Firewall configured (UFW):
  ```bash
  sudo ufw allow 22/tcp   # SSH
  sudo ufw allow 80/tcp   # HTTP
  sudo ufw allow 443/tcp  # HTTPS
  sudo ufw enable
  ```
- [ ] Automatic security updates enabled
- [ ] SSH key authentication configured (disable password auth)
- [ ] Database not exposed to public internet (only localhost)
- [ ] Redis password protected

## 💰 Cost Estimate (AWS)

**Minimum Setup:**
- EC2 t3.medium: ~$30/month
- 30GB EBS storage: ~$3/month
- Data transfer: ~$5/month
- **Total: ~$38/month**

**Recommended Production:**
- EC2 t3.large: ~$60/month
- 100GB EBS storage: ~$10/month
- Data transfer: ~$10/month
- **Total: ~$80/month**

## 📈 Performance & Limits

This single-instance setup can handle:
- ✅ **~100-200 requests/second**
- ✅ **~1,000-5,000 concurrent users**
- ✅ **~100GB database size**
- ✅ **Development, staging, small production**

**Need more?** See `DEPLOYMENT.md` for scaling options.

## 🆘 Getting Help

1. Check logs: `docker compose -f docker-compose.production.yml logs -f`
2. View service status: `docker compose -f docker-compose.production.yml ps`
3. Read detailed guide: `cat DEPLOYMENT.md`
4. Cal.com Discord: https://cal.com/slack
5. GitHub Issues: https://github.com/calcom/cal.com/issues

## 📚 File Structure

```
apps/api/v2/
├── docker-compose.production.yml  # Main deployment config
├── Dockerfile                      # Existing Dockerfile
├── env.production.example          # Environment template
├── setup.sh                        # Automated setup script
├── DEPLOYMENT.md                   # Detailed deployment guide
├── README.EC2.md                   # This file
└── nginx/
    ├── nginx.conf                  # Main nginx config
    └── conf.d/
        ├── api-v2.conf             # HTTPS config
        └── api-v2-http-only.conf   # HTTP-only config
```

## 🎯 Next Steps

1. ✅ Deploy using `./setup.sh`
2. 📊 Test all endpoints
3. 🔒 Verify SSL is working
4. 📈 Monitor logs and performance
5. 🔄 Setup backups (automated)
6. 🚨 Configure monitoring/alerts

---

**Made with ❤️ for easy Cal.com API v2 deployment**

