#!/bin/bash
# USED TO SETUP EC2 INSTANCE for deployment pipeline
# Update package index
sudo apt-get update -y

# Install necessary prerequisites
sudo apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  software-properties-common \
  unzip \
  jq

# Install Docker if it's not already installed
if ! command -v docker &> /dev/null
then
    echo "Docker not found. Installing Docker..."
    
    # Install Docker
    sudo curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    
    # Add the current user to the Docker group
    sudo usermod -aG docker $USER
    
    # Enable and start Docker service
    sudo systemctl enable docker
    sudo systemctl start docker
    echo "Docker installed successfully!"
else
    echo "Docker is already installed."
fi

# Install AWS CLI if it's not already installed
if ! command -v aws &> /dev/null
then
    echo "AWS CLI not found. Installing AWS CLI..."
    
    # Install AWS CLI
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    
    # Verify installation
    aws --version
    echo "AWS CLI installed successfully!"
else
    echo "AWS CLI is already installed."
fi

# Install NGINX if it's not already installed
if ! command -v nginx &> /dev/null
then
    echo "Nginx not found. Installing Nginx..."
    
    # Install Nginx
    sudo apt-get install -y nginx
    echo "Nginx installed successfully!"
else
    echo "Nginx is already installed."
fi

# Install Certbot for SSL certificates if it's not already installed
if ! command -v certbot &> /dev/null
then
    echo "Certbot not found. Installing Certbot..."
    
    # Install Certbot
    # sudo apt-get install -y certbot python3-certbot-nginx
    sudo snap install --classic certbot
    sudo snap install certbot-dns-multi
    sudo snap set certbot trust-plugin-with-root=ok
    sudo snap connect certbot:plugin certbot-dns-multi
    sudo mkdir -p /etc/letsencrypt
    sudo wget https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem -O /etc/letsencrypt/ssl-dhparams.pem
    sudo wget https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf -O /etc/letsencrypt/options-ssl-nginx.conf
    echo "Certbot installed successfully!"
else
    echo "Certbot is already installed."
fi

# Install Docker Compose if it's not already installed
if ! command -v docker-compose &> /dev/null
then
    echo "Docker Compose not found. Installing Docker Compose..."
    
    # Install Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/download/$(curl -s https://api.github.com/repos/docker/compose/releases/latest | jq -r .tag_name)/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Verify installation
    docker-compose --version
    echo "Docker Compose installed successfully!"
else
    echo "Docker Compose is already installed."
fi

if ! command -v autossh &> /dev/null
then
    echo "AutoSSH not found. Installing..."
    sudo apt-get install -y autossh
    echo "AutoSSH installed successfully!"
else
    echo "AutoSSH is already installed."
fi

# Adding current user to the Docker group
sudo usermod -aG docker $USER
# Apply changes to groups
newgrp docker


echo "EC2 instance setup complete!"
