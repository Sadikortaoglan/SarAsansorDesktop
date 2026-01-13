#!/bin/bash

# Production Deployment Script
# Usage: ./deploy.sh

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Are you in the project root?${NC}"
    exit 1
fi

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
git pull origin main || echo "Warning: git pull failed"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Build for production
echo -e "${YELLOW}🔨 Building for production...${NC}"
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo -e "${RED}Error: Build failed - dist folder not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully!${NC}"

# Restart Nginx (if running)
if systemctl is-active --quiet nginx; then
    echo -e "${YELLOW}🔄 Restarting Nginx...${NC}"
    sudo systemctl restart nginx
    echo -e "${GREEN}✅ Nginx restarted${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx is not running. Start it manually with: sudo systemctl start nginx${NC}"
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"

