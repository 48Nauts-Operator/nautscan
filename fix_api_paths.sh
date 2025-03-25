#!/bin/bash

echo "=== Fixing NautScan API path issues ==="

echo "1. Restarting backend service..."
docker restart webapp_nautscan-backend-1

echo "2. Checking if backend is running..."
docker ps | grep webapp_nautscan-backend

echo "3. Testing backend health endpoint..."
curl -v http://localhost:8000/health

echo "4. Restarting frontend service..."
docker restart webapp_nautscan-frontend-1

echo "5. Checking if frontend is running..."
docker ps | grep webapp_nautscan-frontend

echo "=== Fix completed ==="
echo "You can now access the application at http://localhost:3003"
echo "If you still encounter API issues, you may need to:"
echo "1. Check backend logs with: docker logs webapp_nautscan-backend-1"
echo "2. Check frontend logs with: docker logs webapp_nautscan-frontend-1"
echo "3. Try restarting all containers with: docker-compose down && docker-compose up -d" 