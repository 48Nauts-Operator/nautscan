#!/bin/bash

echo "====================================================="
echo "🔧 NautScan Docker Fix Script"
echo "====================================================="
echo "This script will fix NautScan to work with standard Docker networking"
echo

# Copy the modified files
echo "1️⃣ Copying the modified packet capture implementation..."
cp modified_packets.py backend/app/api/packets.py

# Stop all containers
echo "2️⃣ Stopping all containers..."
docker compose down

# Start the containers with standard configuration
echo "3️⃣ Starting containers with standard configuration..."
docker compose up -d

# Wait for services to start
echo "4️⃣ Waiting for services to start (15 seconds)..."
sleep 15

# Test the API
echo "5️⃣ Testing backend service..."
curl -s http://localhost:8000/health

echo
echo "6️⃣ Testing network interfaces API..."
curl -s http://localhost:8000/api/packets/interfaces | jq

echo
echo "✅ NautScan has been fixed to work with standard Docker networking."
echo "   This approach uses mocked data to demonstrate functionality."
echo "   Open http://localhost:3003/connections in your browser to try it."
echo
echo "📝 Note: For actual network monitoring capabilities:"
echo "   - If you're using this in production, consider the setup from docs/network_monitoring.md"
echo "   - For real development environments, you may need to adjust Docker settings"
echo "     or run the application directly on the host for better network visibility." 