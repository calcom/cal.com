# Cal.com API v2 - Self-Contained EC2 Deployment Guide

This guide helps you deploy Cal.com API v2 on a single EC2 instance with PostgreSQL, Redis, and Nginx with SSL.

## 📋 Prerequisites

- AWS EC2 instance (t3.medium or larger recommended)
- Ubuntu 22.04 LTS or similar
- Domain name pointed to your EC2 instance
- Docker and Docker Compose installed

## 🚀 Quick Start

### 1. Install Docker & Docker Compose on EC2

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 2. Clone Your Repository

```bash
git clone <your-repo-url> calcom
cd calcom/apps/api/v2
```

### 3. Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Generate secure passwords
export DB_PASSWORD=$(openssl rand -base64 32)
export REDIS_PASSWORD=$(openssl rand -base64 32)
export NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Update .env with your values
nano .env
```

**Important variables to set:**
- `DB_PASSWORD` - PostgreSQL password
- `REDIS_PASSWORD` - Redis password
- `NEXTAUTH_SECRET` - Auth secret (32+ characters)
- `API_URL` - Your domain (e.g., https://api.yourdomain.com)
- `DOMAIN` - Your domain without https
- `EMAIL` - Your email for SSL certificates

### 4. Initial Deployment (HTTP Only - Testing)

Start with HTTP to test everything works:

```bash
# Use HTTP-only nginx config for initial testing
mv nginx/conf.d/api-v2.conf nginx/conf.d/api-v2.conf.disabled
mv nginx/conf.d/api-v2-http-only.conf.disabled nginx/conf.d/api-v2-http-only.conf

# Build and start services
docker compose -f docker-compose.production.yml --env-file .env up -d --build

# Check logs
docker compose -f docker-compose.production.yml logs -f
```

Test the API:
```bash
curl http://your-ec2-ip/health
# Should return: {"status":"ok"}
```

### 5. Setup SSL with Let's Encrypt

Once HTTP works, setup SSL:

```bash
# Stop services
docker compose -f docker-compose.production.yml down

# Get SSL certificate
docker compose -f docker-compose.production.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d api.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos \
  --no-eff-email

# Update nginx config with your domain
sed -i 's/api.yourdomain.com/your-actual-domain.com/g' nginx/conf.d/api-v2.conf

# Switch to HTTPS config
mv nginx/conf.d/api-v2-http-only.conf nginx/conf.d/api-v2-http-only.conf.disabled
mv nginx/conf.d/api-v2.conf.disabled nginx/conf.d/api-v2.conf

# Restart with HTTPS
docker compose -f docker-compose.production.yml up -d
```

### 6. Verify Deployment

```bash
# Check all services are running
docker compose -f docker-compose.production.yml ps

# Test HTTPS endpoint
curl https://api.yourdomain.com/health

# Check API docs
curl https://api.yourdomain.com/docs
```

## 🔧 Management Commands

### View Logs
```bash
# All services
docker compose -f docker-compose.production.yml logs -f

# Specific service
docker compose -f docker-compose.production.yml logs -f api-v2
docker compose -f docker-compose.production.yml logs -f postgres
docker compose -f docker-compose.production.yml logs -f redis
```

### Restart Services
```bash
# Restart all
docker compose -f docker-compose.production.yml restart

# Restart specific service
docker compose -f docker-compose.production.yml restart api-v2
```

### Update Deployment
```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose -f docker-compose.production.yml up -d --build

# Or rebuild specific service
docker compose -f docker-compose.production.yml up -d --build api-v2
```

### Database Management
```bash
# Access PostgreSQL
docker compose -f docker-compose.production.yml exec postgres psql -U calcom -d calcom

# Backup database
docker compose -f docker-compose.production.yml exec postgres pg_dump -U calcom calcom > backup.sql

# Restore database
cat backup.sql | docker compose -f docker-compose.production.yml exec -T postgres psql -U calcom calcom
```

### Redis Management
```bash
# Access Redis CLI
docker compose -f docker-compose.production.yml exec redis redis-cli -a your_redis_password

# Monitor Redis
docker compose -f docker-compose.production.yml exec redis redis-cli -a your_redis_password monitor

# Flush Redis cache
docker compose -f docker-compose.production.yml exec redis redis-cli -a your_redis_password FLUSHALL
```

## 🔒 Security Checklist

- [ ] Change all default passwords in `.env`
- [ ] Setup SSL certificates with Let's Encrypt
- [ ] Configure firewall (UFW):
  ```bash
  sudo ufw allow 22/tcp    # SSH
  sudo ufw allow 80/tcp    # HTTP
  sudo ufw allow 443/tcp   # HTTPS
  sudo ufw enable
  ```
- [ ] Setup automatic security updates:
  ```bash
  sudo apt install unattended-upgrades
  sudo dpkg-reconfigure --priority=low unattended-upgrades
  ```
- [ ] Enable Docker logging limits (add to `/etc/docker/daemon.json`):
  ```json
  {
    "log-driver": "json-file",
    "log-opts": {
      "max-size": "10m",
      "max-file": "3"
    }
  }
  ```

## 📊 Monitoring

### Health Checks
```bash
# API v2 health
curl https://api.yourdomain.com/health

# Docker health status
docker compose -f docker-compose.production.yml ps
```

### Resource Usage
```bash
# Docker stats
docker stats

# Disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

## 🆘 Troubleshooting

### API v2 won't start
```bash
# Check logs
docker compose -f docker-compose.production.yml logs api-v2

# Check if database is ready
docker compose -f docker-compose.production.yml exec postgres pg_isready -U calcom

# Restart API v2
docker compose -f docker-compose.production.yml restart api-v2
```

### SSL Certificate Issues
```bash
# Test certificate renewal
docker compose -f docker-compose.production.yml run --rm certbot renew --dry-run

# Force certificate renewal
docker compose -f docker-compose.production.yml run --rm certbot renew --force-renewal
```

### Database Connection Issues
```bash
# Check database logs
docker compose -f docker-compose.production.yml logs postgres

# Verify connection string
docker compose -f docker-compose.production.yml exec api-v2 env | grep DATABASE_URL
```

### High Memory Usage
```bash
# Check memory usage
docker stats

# Restart services to free memory
docker compose -f docker-compose.production.yml restart

# Add swap if needed (4GB example)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 🔄 Automatic SSL Renewal

The certbot container automatically renews certificates. To verify:

```bash
# Check certbot logs
docker compose -f docker-compose.production.yml logs certbot

# Manual renewal test
docker compose -f docker-compose.production.yml run --rm certbot renew --dry-run
```

## 📈 Scaling Considerations

This single-instance setup is good for:
- Development/staging environments
- Small to medium production loads (<100 req/s)
- Organizations with <1000 users

For larger deployments, consider:
- Separate database server (RDS/managed PostgreSQL)
- Redis cluster or managed Redis (ElastiCache)
- Multiple API v2 instances behind a load balancer
- CDN for static assets

## 🔗 Useful Links

- [Cal.com Documentation](https://cal.com/docs)
- [API v2 Documentation](https://api.cal.com/docs)
- [Docker Documentation](https://docs.docker.com)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)

