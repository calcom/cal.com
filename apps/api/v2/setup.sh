#!/bin/bash
# Cal.com API v2 - Quick Setup Script for EC2

set -e

echo "🚀 Cal.com API v2 - EC2 Setup Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should NOT be run as root${NC}"
   exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Install Docker if not installed
echo -e "\n${YELLOW}📦 Checking Docker installation...${NC}"
if ! command_exists docker; then
    echo "Installing Docker..."
    
    # Check if Amazon Linux
    if [ -f /etc/os-release ] && grep -q "Amazon Linux" /etc/os-release; then
        echo "Detected Amazon Linux - using dnf installation"
        sudo dnf install -y docker
        sudo systemctl start docker
        sudo systemctl enable docker
        sudo usermod -aG docker $USER
    else
        # Use Docker's install script for other distros
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
    fi
    
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# Step 2: Install Docker Compose if not installed
echo -e "\n${YELLOW}📦 Checking Docker Compose installation...${NC}"
if ! docker compose version >/dev/null 2>&1; then
    echo "Installing Docker Compose..."
    
    # Amazon Linux 2023 includes compose with docker package
    if [ -f /etc/os-release ] && grep -q "Amazon Linux" /etc/os-release; then
        echo "Amazon Linux detected - Docker Compose should be included with Docker"
        echo "If 'docker compose' still doesn't work, installing docker-buildx..."
        sudo dnf install -y docker-buildx 2>/dev/null || true
    elif command_exists apt; then
        sudo apt update
        sudo apt install -y docker-compose-plugin
    else
        # Manual install for other systems
        DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
        mkdir -p $DOCKER_CONFIG/cli-plugins
        curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o $DOCKER_CONFIG/cli-plugins/docker-compose
        chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose
    fi
    
    echo -e "${GREEN}✅ Docker Compose setup complete${NC}"
else
    echo -e "${GREEN}✅ Docker Compose already installed${NC}"
fi

# Ensure docker service is running
if ! sudo systemctl is-active --quiet docker; then
    echo "Starting Docker service..."
    sudo systemctl start docker
    sudo systemctl enable docker
fi

# Step 3: Generate environment file if it doesn't exist
echo -e "\n${YELLOW}🔧 Configuring environment...${NC}"
if [ ! -f .env ]; then
    echo "Creating .env from example..."
    cp .env.example .env
    
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    
    # Replace in file (cross-platform compatible)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your_secure_postgres_password_here/$DB_PASSWORD/" .env
        sed -i '' "s/your_secure_redis_password_here/$REDIS_PASSWORD/" .env
        sed -i '' "s/your_32_character_secret_here/$NEXTAUTH_SECRET/" .env
    else
        # Linux
        sed -i "s/your_secure_postgres_password_here/$DB_PASSWORD/" .env
        sed -i "s/your_secure_redis_password_here/$REDIS_PASSWORD/" .env
        sed -i "s/your_32_character_secret_here/$NEXTAUTH_SECRET/" .env
    fi
    
    echo -e "${GREEN}✅ Generated secure passwords${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env and update:${NC}"
    echo "   - API_URL (your domain)"
    echo "   - DOMAIN (for SSL certificate)"
    echo "   - EMAIL (for SSL certificate)"
    
    read -p "Press enter to open .env in nano editor..."
    nano .env
else
    echo -e "${GREEN}✅ .env already exists${NC}"
fi

# Step 4: Setup Cloudflare-friendly configuration
echo -e "\n${YELLOW}🌐 Setting up Cloudflare SSL configuration...${NC}"
echo "Cloudflare will handle SSL/TLS termination"
echo "This server will listen on HTTP (port 80) only"

# Enable Cloudflare configuration
mv nginx/conf.d/api-v2.conf nginx/conf.d/api-v2.conf.disabled 2>/dev/null || true
mv nginx/conf.d/api-v2-http-only.conf nginx/conf.d/api-v2-http-only.conf.disabled 2>/dev/null || true
mv nginx/conf.d/api-v2-cloudflare.conf.disabled nginx/conf.d/api-v2-cloudflare.conf 2>/dev/null || true

echo -e "${GREEN}✅ Cloudflare configuration active${NC}"
echo ""
echo -e "${YELLOW}📝 Cloudflare Setup Reminder:${NC}"
echo "1. In Cloudflare Dashboard → SSL/TLS:"
echo "   - Set mode to 'Flexible' (Cloudflare to origin via HTTP)"
echo "   - Or 'Full' if you add a self-signed cert later"
echo "2. Add your domain DNS record:"
echo "   - Type: A"
echo "   - Name: api"
echo "   - Content: Your EC2 Elastic IP"
echo "   - Proxy status: Proxied (orange cloud)"
echo ""

# Step 5: Build and start services
echo -e "\n${YELLOW}🏗️  Building and starting services...${NC}"
echo "This may take several minutes..."

docker compose -f docker-compose.production.yml up -d --build

# Step 6: Wait for services to be healthy
echo -e "\n${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 10

# Check service status
echo -e "\n${YELLOW}📊 Service Status:${NC}"
docker compose -f docker-compose.production.yml ps

# Step 7: Test the deployment
echo -e "\n${YELLOW}🧪 Testing deployment...${NC}"

# Get the IP address
IP=$(curl -s ifconfig.me)
DOMAIN=$(grep "^DOMAIN=" .env | cut -d'=' -f2)

echo "Testing health endpoint via IP: http://$IP/health"
sleep 5

if curl -f -s "http://$IP/health" >/dev/null; then
    echo -e "${GREEN}✅ API v2 is running!${NC}"
    echo -e "\n${GREEN}🎉 Deployment successful!${NC}"
    echo -e "\nDirect Access (for testing):"
    echo "  Health: http://$IP/health"
    echo "  API: http://$IP/api/v2"
    echo "  Docs: http://$IP/docs"
    echo -e "\nCloudflare Access (after DNS configured):"
    echo "  Health: https://$DOMAIN/health"
    echo "  API: https://$DOMAIN/api/v2"
    echo "  Docs: https://$DOMAIN/docs"
else
    echo -e "${YELLOW}⚠️  Health check failed. Checking logs...${NC}"
    docker compose -f docker-compose.production.yml logs --tail=50 api-v2
    echo -e "\n${YELLOW}Run 'docker compose -f docker-compose.production.yml logs -f' to see full logs${NC}"
fi

# Step 8: Show next steps
echo -e "\n${YELLOW}📝 Next Steps:${NC}"
echo "1. View logs: docker compose -f docker-compose.production.yml logs -f"
echo "2. Check status: docker compose -f docker-compose.production.yml ps"
echo "3. Restart: docker compose -f docker-compose.production.yml restart"
echo "4. Stop: docker compose -f docker-compose.production.yml down"
echo "5. Read full documentation: cat DEPLOYMENT.md"

echo -e "\n${GREEN}Setup complete!${NC}"

