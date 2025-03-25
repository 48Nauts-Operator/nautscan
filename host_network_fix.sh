#!/bin/bash

echo "====================================================="
echo "🔧 NautScan Host Network Access Fix"
echo "====================================================="
echo "This script will reconfigure NautScan to access your real network interfaces"
echo

# Stop all containers
echo "1️⃣ Stopping all containers..."
docker compose down --remove-orphans

# Copy the updated packet capture implementation
echo "2️⃣ Updating the packet capture implementation..."
cp temp_packets_capture.py backend/app/api/packets.py

# Start the containers with the new configuration
echo "3️⃣ Rebuilding and starting containers with host network access..."
docker compose up -d

# Wait for services to start
echo "4️⃣ Waiting for services to start (30 seconds)..."
sleep 30

# Test the API
echo "5️⃣ Testing network interfaces API..."
curl -s http://localhost:8000/api/packets/interfaces | jq

echo
echo "6️⃣ Testing packet capture start API..."
curl -s -X POST -H "Content-Type: application/json" -d '{"interface":"any","promiscuous":true}' http://localhost:8000/api/packets/start | jq

echo
echo "✅ NautScan has been reconfigured to access your real network interfaces."
echo "   You should now be able to see and capture traffic from your actual network."
echo "   Open http://localhost:3003/connections in your browser to try it."
echo
echo "📝 Note: If you still don't see your physical interfaces, you may need to:"
echo "   - Run Docker with --privileged flag"
echo "   - Enable promiscuous mode on your network interfaces manually"
echo "   - If using a virtual machine, enable promiscuous mode in your VM settings" 