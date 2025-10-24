# 🚀 Complete AWS EC2 Setup Guide for Cal.com API v2

**Step-by-step guide to launch an EC2 instance, configure DNS, and deploy Cal.com API v2 with HTTPS.**

Domain: `api.collegecontactcalendar.com`  
Email: `admin@collegecontactcalendar.com`

---

## 📋 Prerequisites

- AWS Account with billing enabled
- Domain name `collegecontactcalendar.com` (registered anywhere - GoDaddy, Namecheap, Route53, etc.)
- Access to domain's DNS settings
- SSH client installed on your computer

---

## Part 1: Launch EC2 Instance

### Step 1: Login to AWS Console

1. Go to [AWS Console](https://console.aws.amazon.com)
2. Login with your credentials
3. Select a region (e.g., `us-east-1` - N. Virginia)
   - **Important:** Remember this region, you'll need it later

### Step 2: Launch EC2 Instance

1. Navigate to **EC2 Dashboard**
   - Search for "EC2" in the top search bar
   - Click "EC2" under Services

2. Click **"Launch Instance"** button

3. **Configure Instance:**

   **Name and tags:**
   - Name: `cal-api-v2-production`

   **Application and OS Images (Amazon Machine Image):**
   - Select: **Amazon Linux 2023 AMI**
   - Architecture: **64-bit (x86)**

   **Instance type:**
   - Select: **t3.medium** (recommended minimum)
     - 2 vCPU, 4 GB RAM
     - Upgrade to `t3.large` for better performance

   **Key pair (login):**
   - Click "Create new key pair"
   - Key pair name: `cal-api-v2-key`
   - Key pair type: **RSA**
   - Private key file format: **`.pem`**
   - Click "Create key pair"
   - **IMPORTANT:** Save this file! You can't download it again
   - Move it to a safe location:
     ```bash
     # On Mac/Linux
     mv ~/Downloads/cal-api-v2-key.pem ~/.ssh/
     chmod 400 ~/.ssh/cal-api-v2-key.pem
     ```

   **Network settings:**
   - Click "Edit"
   - Auto-assign public IP: **Enable**
   - Firewall (security groups): **Create security group**
   - Security group name: `cal-api-v2-sg`
   - Description: `Security group for Cal.com API v2`
   
   **Security group rules (AWS manages the firewall):**
   - ✅ **SSH (port 22)** - Source: **My IP** (restricts SSH to your current IP for security)
   - Click "Add security group rule"
     - Type: **HTTP**
     - Port: **80**
     - Source: **Anywhere (0.0.0.0/0, ::/0)** - Needed for Let's Encrypt SSL validation
   - Click "Add security group rule"
     - Type: **HTTPS**
     - Port: **443**
     - Source: **Anywhere (0.0.0.0/0, ::/0)** - Public API access
   
   > **Note:** We use AWS Security Groups instead of OS-level firewalls (like UFW) as this is the AWS best practice. Security Groups are stateful and managed at the network level.

   **Configure storage:**
   - Size: **50 GB** (minimum)
   - Volume type: **gp3** (General Purpose SSD)
   - Delete on termination: **Checked** ✅

   **Advanced details:**
   - Leave as defaults

4. **Review Summary** on the right panel
   - Verify: Amazon Linux 2023, t3.medium, 50GB storage

5. Click **"Launch instance"**

6. Wait for instance to start (Status: Running)

### Step 3: Allocate Elastic IP (Static IP)

**Why?** By default, EC2 instances get a new IP every time they restart. We need a permanent IP for our DNS.

1. In EC2 Dashboard, click **"Elastic IPs"** (left sidebar under "Network & Security")

2. Click **"Allocate Elastic IP address"**
   - Region: Make sure it matches your EC2 region
   - Click "Allocate"

3. **Associate Elastic IP with your instance:**
   - Select the newly allocated IP
   - Click **"Actions"** → **"Associate Elastic IP address"**
   - Instance: Select `cal-api-v2-production`
   - Click "Associate"

4. **Copy your Elastic IP address** - you'll need it for DNS
   - Example: `54.123.45.67`

---

## Part 2: Configure DNS (Point Domain to EC2)

### Option A: Using AWS Route 53

If your domain is registered with AWS Route 53:

1. Go to **Route 53** in AWS Console

2. Click **"Hosted zones"**

3. Click on **`collegecontactcalendar.com`**

4. Click **"Create record"**

5. Configure record:
   - Record name: `api`
   - Record type: **A - Routes traffic to an IPv4 address**
   - Value: **Your Elastic IP** (e.g., `54.123.45.67`)
   - TTL: `300` (5 minutes)
   - Routing policy: **Simple routing**
   - Click "Create records"

### Option B: Using External DNS Provider (GoDaddy, Namecheap, Cloudflare, etc.)

1. **Login to your DNS provider** where you registered `collegecontactcalendar.com`

2. **Find DNS Management/DNS Settings**
   - GoDaddy: Domain Settings → DNS
   - Namecheap: Domain List → Manage → Advanced DNS
   - Cloudflare: DNS → Records

3. **Create A Record:**
   - Type: **A**
   - Name/Host: `api`
   - Value/Points to: **Your Elastic IP** (e.g., `54.123.45.67`)
   - TTL: `300` or `Auto`
   - Click "Save" or "Add Record"

4. **Verify DNS Propagation** (can take 5-60 minutes):
   ```bash
   # On your local computer
   dig api.collegecontactcalendar.com
   
   # Should show your Elastic IP in the ANSWER section
   # Example output:
   # api.collegecontactcalendar.com. 300 IN A 54.123.45.67
   ```

   Or use online tools:
   - https://dnschecker.org
   - Enter: `api.collegecontactcalendar.com`

---

## Part 3: Connect to EC2 Instance

### Mac/Linux:

```bash
# Navigate to where you saved the key
cd ~/.ssh

# Connect to EC2 (Amazon Linux uses 'ec2-user' instead of 'ubuntu')
ssh -i cal-api-v2-key.pem ec2-user@3.138.150.165

# If you get "connection refused", wait a minute - instance might still be starting
```

## Part 4: Prepare EC2 Instance

Once connected via SSH:

```bash
# Update system packages (Amazon Linux uses dnf)
sudo dnf update -y

# Install basic tools
sudo dnf install -y git curl wget nano htop

# Note: We DO NOT configure a firewall (UFW/iptables) on AWS EC2
# AWS Security Groups handle firewall rules at the network level (best practice)
# This is more secure and manageable than OS-level firewalls

# Set timezone (optional)
sudo timedatectl set-timezone America/New_York  # Change to your timezone

# Increase file limits (recommended for production)
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Amazon Linux 2023 already has optimized swap, but you can add more if needed
# Check current swap
free -h

# Add additional swap if needed (optional for t3.medium)
sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify swap
free -h
```

---

## Part 5: Clone Repository and Configure

```bash
# Clone your Cal.com repository
git clone https://github.com/yourcollegecontact/cal.com.git calcom
cd calcom/apps/api/v2

# Or use the official repository:
# git clone https://github.com/calcom/cal.com.git calcom
# cd calcom/apps/api/v2

# Copy environment file
cp env.production.example .env

# Edit environment file
nano .env
```

### Configure .env:

The file should already have your domain, but verify:

```bash
# Database Configuration
DB_PASSWORD=your_secure_postgres_password_here  # CHANGE THIS!

# Redis Configuration
REDIS_PASSWORD=your_secure_redis_password_here  # CHANGE THIS!

# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your_32_character_secret_here  # CHANGE THIS!

# API Configuration
API_URL=https://api.collegecontactcalendar.com
API_KEY_PREFIX=cal_

# Web App URL (if you have the main Cal.com app)
WEB_APP_URL=https://app.collegecontactcalendar.com

# Cal.com License Key (optional for self-hosted)
CALCOM_LICENSE_KEY=

# Stripe (optional, only if using billing features)
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_TEAM_MONTHLY_PRICE_ID=

# Sentry (optional, for error tracking)
SENTRY_DSN=

# Domain for SSL certificate
DOMAIN=api.collegecontactcalendar.com
EMAIL=admin@collegecontactcalendar.com
```

**Generate secure passwords:**
```bash
# Generate database password
openssl rand -base64 32

# Generate Redis password
openssl rand -base64 32

# Generate NextAuth secret
openssl rand -base64 32
```

Copy each generated password into the appropriate field in `.env`.

**Save and exit:**
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

---

## Part 6: Deploy Cal.com API v2

### Option 1: Automated Setup (Recommended)

```bash
# Make setup script executable
chmod +x setup.sh

# Run automated setup
./setup.sh
```

The script will:
1. ✅ Install Docker & Docker Compose
2. ✅ Verify `.env` configuration
3. ✅ Ask about HTTP or HTTPS deployment
4. ✅ Obtain SSL certificate from Let's Encrypt
5. ✅ Build and start all services
6. ✅ Test the deployment

**Follow the prompts:**
- When asked about deployment mode, choose: `2` (HTTPS with Let's Encrypt)
- Confirm domain: `api.collegecontactcalendar.com`
- Confirm email: `admin@collegecontactcalendar.com`

### Option 2: Manual Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version

# Start services temporarily for SSL
docker compose -f docker-compose.production.yml up -d nginx

# Wait for nginx to start
sleep 10

# Obtain SSL certificate
docker compose -f docker-compose.production.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d api.collegecontactcalendar.com \
  --email admin@collegecontactcalendar.com \
  --agree-tos \
  --no-eff-email

# Update nginx config with domain
sed -i 's/api.yourdomain.com/api.collegecontactcalendar.com/g' nginx/conf.d/api-v2.conf

# Enable HTTPS configuration
mv nginx/conf.d/api-v2-http-only.conf nginx/conf.d/api-v2-http-only.conf.disabled 2>/dev/null || true
mv nginx/conf.d/api-v2.conf.disabled nginx/conf.d/api-v2.conf 2>/dev/null || true

# Stop nginx
docker compose -f docker-compose.production.yml down

# Build and start all services
docker compose -f docker-compose.production.yml up -d --build
```

---

## Part 7: Verify Deployment

### Check Service Status

```bash
# View all running containers
docker compose -f docker-compose.production.yml ps

# Should show:
# - calcom-api-v2-postgres (healthy)
# - calcom-api-v2-redis (healthy)
# - calcom-api-v2 (healthy)
# - calcom-api-v2-nginx (healthy)
# - calcom-api-v2-certbot (running)
```

### View Logs

```bash
# View all logs
docker compose -f docker-compose.production.yml logs -f

# View specific service logs
docker compose -f docker-compose.production.yml logs -f api-v2
docker compose -f docker-compose.production.yml logs -f nginx
```

Press `Ctrl + C` to stop viewing logs.

### Test Endpoints

**From your EC2 instance:**
```bash
# Test health endpoint (local)
curl http://localhost/health

# Test HTTPS (via domain)
curl https://api.collegecontactcalendar.com/health

# Should return: {"status":"ok"}
```

**From your local computer:**
```bash
# Test HTTP redirect
curl -I http://api.collegecontactcalendar.com
# Should return: 301 Moved Permanently (redirects to HTTPS)

# Test HTTPS
curl https://api.collegecontactcalendar.com/health
# Should return: {"status":"ok"}

# Test API docs
curl https://api.collegecontactcalendar.com/docs
# Should return HTML for API documentation
```

**In your browser:**
1. Visit: https://api.collegecontactcalendar.com/health
   - Should show: `{"status":"ok"}`
   - Browser should show 🔒 (secure HTTPS)

2. Visit: https://api.collegecontactcalendar.com/docs
   - Should show: API documentation page

---

## Part 8: Ongoing Maintenance

### Update Application

```bash
# SSH to EC2
ssh -i ~/.ssh/cal-api-v2-key.pem ec2-user@3.138.150.165

# Navigate to project
cd calcom/apps/api/v2

# Pull latest changes
git pull

# Rebuild and restart
docker compose -f docker-compose.production.yml up -d --build
```

### Backup Database

```bash
# Create backup
docker compose -f docker-compose.production.yml exec postgres \
  pg_dump -U calcom calcom > backup-$(date +%Y%m%d-%H%M%S).sql

# Download backup to local computer (from your local terminal)
scp -i ~/.ssh/cal-api-v2-key.pem \
  ec2-user@3.138.150.165:~/calcom/apps/api/v2/backup-*.sql \
  ~/backups/
```

### Monitor Logs

```bash
# Real-time logs
docker compose -f docker-compose.production.yml logs -f

# Last 100 lines
docker compose -f docker-compose.production.yml logs --tail=100

# Specific service
docker compose -f docker-compose.production.yml logs -f api-v2
```

### Restart Services

```bash
# Restart all services
docker compose -f docker-compose.production.yml restart

# Restart specific service
docker compose -f docker-compose.production.yml restart api-v2
```

### Check SSL Certificate Renewal

```bash
# Test renewal (dry run)
docker compose -f docker-compose.production.yml run --rm certbot renew --dry-run

# Force renewal (if needed)
docker compose -f docker-compose.production.yml run --rm certbot renew --force-renewal

# Reload nginx to use new certificate
docker compose -f docker-compose.production.yml exec nginx nginx -s reload
```

Certificates auto-renew every 12 hours via the certbot container.

---

## 🎯 Quick Reference

### Important URLs

- **API Health:** https://api.collegecontactcalendar.com/health
- **API Docs:** https://api.collegecontactcalendar.com/docs
- **API Base:** https://api.collegecontactcalendar.com/api/v2

### SSH Connection

```bash
ssh -i ~/.ssh/cal-api-v2-key.pem ec2-user@3.138.150.165
```

### Common Commands

```bash
# View status
docker compose -f docker-compose.production.yml ps

# View logs
docker compose -f docker-compose.production.yml logs -f

# Restart
docker compose -f docker-compose.production.yml restart

# Stop all
docker compose -f docker-compose.production.yml down

# Start all
docker compose -f docker-compose.production.yml up -d
```

### Environment File Location

```
/home/ec2-user/calcom/apps/api/v2/.env
```

---

## 🆘 Troubleshooting

### Issue: Can't SSH to EC2

**Check:**
1. Security group allows SSH (port 22) from your IP
2. Using correct username: `ec2-user` (not ubuntu)
3. Using correct Elastic IP address: `3.138.150.165`
4. Key file has correct permissions: `chmod 400 cal-api-v2-key.pem`
5. Instance is in "Running" state in AWS Console

**Correct SSH command:**
```bash
ssh -i ~/.ssh/cal-api-v2-key.pem ec2-user@3.138.150.165
```

### Issue: Domain doesn't resolve

**Check:**
1. DNS A record points to Elastic IP: `dig api.collegecontactcalendar.com`
2. Wait up to 1 hour for DNS propagation (usually 5-15 minutes)
3. Verify DNS resolves to your Elastic IP (3.138.150.165):
   ```bash
   dig api.collegecontactcalendar.com +short
   # Should return: 3.138.150.165
   ```
4. Clear your DNS cache if needed:
   ```bash
   # Mac
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
   
   # Windows
   ipconfig /flushdns
   ```

### Issue: SSL certificate failed

**Check:**
1. DNS is fully propagated: `dig api.collegecontactcalendar.com`
2. Port 80 is open in security group
3. Nginx is running: `docker compose -f docker-compose.production.yml ps`
4. Check certbot logs: `docker compose -f docker-compose.production.yml logs certbot`

**Try again:**
```bash
docker compose -f docker-compose.production.yml run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d api.collegecontactcalendar.com \
  --email admin@collegecontactcalendar.com \
  --agree-tos --no-eff-email
```

### Issue: Services won't start

**Check logs:**
```bash
docker compose -f docker-compose.production.yml logs
```

**Common fixes:**
```bash
# Rebuild everything
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d --build

# Check disk space
df -h

# Clean up Docker
docker system prune -a
```

### Issue: Out of memory

```bash
# Check memory
free -h

# Add more swap
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Or upgrade instance type to t3.large
```

---

## 💰 Cost Summary

**Monthly AWS Costs:**
- EC2 t3.medium (on-demand): ~$30.37
- 50GB EBS gp3 storage: ~$4.00
- Elastic IP (while instance running): $0.00
- Data transfer (estimated): ~$5.00
- **Total: ~$40/month**

**To reduce costs:**
- Use Reserved Instance (1 year): ~$18/month
- Use Spot Instance: ~$9/month (but can be terminated)

---

## ✅ Security Checklist

- [x] SSH key-based authentication (password auth disabled by default)
- [x] AWS Security Groups configured (network-level firewall - AWS best practice)
  - [x] Port 22 (SSH) - Restricted to your IP
  - [x] Port 80 (HTTP) - Open for SSL validation
  - [x] Port 443 (HTTPS) - Open for API access
- [x] No OS-level firewall needed (Security Groups handle it)
- [x] HTTPS enabled with valid SSL certificate
- [x] All services use strong passwords
- [x] Database & Redis not exposed to internet (only localhost)
- [x] Automatic security updates (Amazon Linux default)

---

## 📚 Additional Resources

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Cal.com Documentation](https://cal.com/docs)

---

**OS:** Amazon Linux 2023  
**Domain:** `api.collegecontactcalendar.com`  
**Elastic IP:** `3.138.150.165`  
**Status:** Production Ready ✅

