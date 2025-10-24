# Cal.com API v2 Deployment Guide

## Prerequisites

- AWS CLI configured with ECR access
- Docker with buildx support
- Access to EC2 instance running the API

## Building and Deploying a New Version

### Step 1: Build and Push to ECR

From the repository root:

```bash
# Authenticate with ECR
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 194266086878.dkr.ecr.us-east-2.amazonaws.com

# Build and push directly to ECR (with --push flag)
docker buildx build -f apps/api/v2/Dockerfile \
  --platform linux/amd64 \
  --build-arg DATABASE_URL="postgresql://calcom:placeholder@postgres:5432/calcom" \
  --build-arg DATABASE_DIRECT_URL="postgresql://calcom:placeholder@postgres:5432/calcom" \
  -t 194266086878.dkr.ecr.us-east-2.amazonaws.com/collegecontact/calcom-api-v2:latest \
  --push \
  .
```

**If `--push` fails**, build locally then push:

```bash
# Build without --push
docker buildx build -f apps/api/v2/Dockerfile \
  --platform linux/amd64 \
  --build-arg DATABASE_URL="postgresql://calcom:placeholder@postgres:5432/calcom" \
  --build-arg DATABASE_DIRECT_URL="postgresql://calcom:placeholder@postgres:5432/calcom" \
  -t 194266086878.dkr.ecr.us-east-2.amazonaws.com/collegecontact/calcom-api-v2:latest \
  --load \
  .

# Push manually
docker push 194266086878.dkr.ecr.us-east-2.amazonaws.com/collegecontact/calcom-api-v2:latest
```

### Step 2: Deploy on EC2 Instance

SSH into your EC2 instance and run:

```bash
# Navigate to the repository root
cd /path/to/cal.com

# Authenticate with ECR
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 194266086878.dkr.ecr.us-east-2.amazonaws.com

# Pull the latest image
docker-compose -f apps/api/v2/docker-compose.production.yml pull api-v2

# Restart the service with the new image
docker-compose -f apps/api/v2/docker-compose.production.yml up -d api-v2

# Verify deployment
docker-compose -f apps/api/v2/docker-compose.production.yml ps
docker-compose -f apps/api/v2/docker-compose.production.yml logs -f api-v2
```

### Step 3: Verify Health

```bash
# Check health endpoint
curl http://localhost/health

# Monitor logs for errors
docker-compose -f docker-compose.production.yml logs -f api-v2
```

## Rollback

If something goes wrong, rollback to a previous version:

```bash
# Pull and deploy a specific version
docker pull 194266086878.dkr.ecr.us-east-2.amazonaws.com/collegecontact/calcom-api-v2:previous-tag
docker tag 194266086878.dkr.ecr.us-east-2.amazonaws.com/collegecontact/calcom-api-v2:previous-tag \
  194266086878.dkr.ecr.us-east-2.amazonaws.com/collegecontact/calcom-api-v2:latest
docker-compose -f apps/api/v2/docker-compose.production.yml up -d api-v2
```

## Deployment Checklist

- [ ] Build completes without errors
- [ ] Image pushed to ECR successfully
- [ ] EC2 instance can pull from ECR
- [ ] All environment variables configured in `.env`
- [ ] Database migrations run (if needed)
- [ ] Health check passes
- [ ] API responds to test requests
- [ ] Logs show no critical errors

## Troubleshooting

### Build Fails

- Ensure you're in the repository root
- Check Docker has enough memory (4GB+ recommended)
- Verify all dependencies are available

### ECR Authentication Fails

```bash
# Re-authenticate
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 194266086878.dkr.ecr.us-east-2.amazonaws.com
```

### Container Won't Start

```bash
# Check logs
docker-compose -f apps/api/v2/docker-compose.production.yml logs api-v2

# Check environment variables
docker-compose -f apps/api/v2/docker-compose.production.yml config

# Verify database connectivity
docker-compose -f apps/api/v2/docker-compose.production.yml exec api-v2 sh
# Inside container:
nc -zv postgres 5432
```

## Next Steps: Automation

### Option 1: GitHub Actions CI/CD

Create `.github/workflows/deploy-api-v2.yml`:

```yaml
name: Deploy API v2

on:
  push:
    branches:
      - main
    paths:
      - 'apps/api/v2/**'
      - 'packages/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-2
      
      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v1
      
      - name: Build and push
        run: |
          docker buildx build -f apps/api/v2/Dockerfile \
            --platform linux/amd64 \
            --build-arg DATABASE_URL="postgresql://calcom:placeholder@postgres:5432/calcom" \
            --build-arg DATABASE_DIRECT_URL="postgresql://calcom:placeholder@postgres:5432/calcom" \
            -t 194266086878.dkr.ecr.us-east-2.amazonaws.com/collegecontact/calcom-api-v2:latest \
            -t 194266086878.dkr.ecr.us-east-2.amazonaws.com/collegecontact/calcom-api-v2:${{ github.sha }} \
            --push \
            .
      
      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USER }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /path/to/cal.com
            aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 194266086878.dkr.ecr.us-east-2.amazonaws.com
            docker-compose -f apps/api/v2/docker-compose.production.yml pull api-v2
            docker-compose -f apps/api/v2/docker-compose.production.yml up -d api-v2
```

### Option 2: Watchtower (Auto-Update on New Images)

Add Watchtower to `docker-compose.production.yml`:

```yaml
  watchtower:
    image: containrrr/watchtower
    container_name: calcom-api-v2-watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ~/.docker/config.json:/config.json:ro
    environment:
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_POLL_INTERVAL=300  # Check every 5 minutes
      - WATCHTOWER_INCLUDE_STOPPED=true
      - WATCHTOWER_REVIVE_STOPPED=false
    command: calcom-api-v2
    networks:
      - calcom-network
```

Then on EC2, ensure Docker is authenticated with ECR and Watchtower will automatically pull and restart when a new `latest` image is pushed.

### Option 3: AWS ECS/Fargate

Migrate to AWS ECS for managed container orchestration with built-in auto-deployment on new ECR images.

### Option 4: Simple Cron Job

On EC2, add to crontab:

```bash
# Edit crontab
crontab -e

# Add (checks every 5 minutes)
*/5 * * * * cd /path/to/cal.com && docker-compose -f apps/api/v2/docker-compose.production.yml pull -q api-v2 && docker-compose -f apps/api/v2/docker-compose.production.yml up -d api-v2 >> /var/log/api-deploy.log 2>&1
```

## Recommended: Versioned Tags

Instead of only using `latest`, use semantic versioning:

```bash
# Build with version tag
VERSION="v2.1.0"
docker buildx build -f apps/api/v2/Dockerfile \
  --platform linux/amd64 \
  --build-arg DATABASE_URL="postgresql://calcom:placeholder@postgres:5432/calcom" \
  --build-arg DATABASE_DIRECT_URL="postgresql://calcom:placeholder@postgres:5432/calcom" \
  -t 194266086878.dkr.ecr.us-east-2.amazonaws.com/collegecontact/calcom-api-v2:latest \
  -t 194266086878.dkr.ecr.us-east-2.amazonaws.com/collegecontact/calcom-api-v2:${VERSION} \
  --push \
  .
```

This allows easy rollbacks to specific versions.

