#!/bin/bash

echo "==============================================="
echo "🚀 NautScan Complete Rebuild and Setup Script 🚀"
echo "==============================================="

# Stop and remove all containers
echo "1️⃣ Stopping all containers..."
docker compose down

# Remove any orphaned containers
echo "2️⃣ Removing any orphaned containers..."
docker compose down --remove-orphans

# Clean the build cache (optional but thorough)
echo "3️⃣ Clearing Docker build cache..."
docker builder prune -f

# Rebuild the images from scratch
echo "4️⃣ Rebuilding Docker images..."
docker compose build --no-cache

# Start the containers
echo "5️⃣ Starting containers..."
docker compose up -d

# Wait for services to start
echo "6️⃣ Waiting for services to start up (30 seconds)..."
sleep 30

# Check if services are running
echo "7️⃣ Checking service status..."
docker compose ps

# Test backend health endpoint
echo "8️⃣ Testing backend health endpoint..."
curl -v http://localhost:8000/health

echo ""
echo "9️⃣ Testing backend API endpoints..."
echo "- Testing /api/packets/interfaces endpoint:"
curl -v http://localhost:8000/api/packets/interfaces

echo ""
echo "✅ Rebuild completed!"
echo ""
echo "You can now access the application at http://localhost:3003"
echo ""
echo "If you encounter any issues, check the logs with:"
echo "docker logs webapp_nautscan-backend-1"
echo "docker logs webapp_nautscan-frontend-1" 