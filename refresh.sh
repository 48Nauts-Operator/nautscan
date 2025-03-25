#!/bin/bash

# Stop the running containers
echo "Stopping containers..."
docker compose down

# Rebuild the containers
echo "Rebuilding containers..."
docker compose build frontend backend

# Start the containers
echo "Starting containers..."
docker compose up -d

# Wait a moment for containers to initialize
echo "Waiting for containers to start..."
sleep 5

# Show running containers
echo "Running containers:"
docker ps

echo "Frontend is available at http://localhost:3003"
echo "Backend API is available at http://localhost:8000" 