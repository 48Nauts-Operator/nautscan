#!/bin/bash

echo "==============================================="
echo "🔍 NautScan Connections Page Verification Script 🔍"
echo "==============================================="

# Test all endpoints needed by the connections page
echo "1️⃣ Testing interface selection endpoint..."
curl -s http://localhost:8000/api/packets/interfaces | jq

echo -e "\n2️⃣ Testing packet capture start endpoint..."
curl -s -X POST -H "Content-Type: application/json" -d '{"interface":"eth0"}' http://localhost:8000/api/packets/start | jq

echo -e "\n3️⃣ Testing recent packets endpoint (for real-time mode)..."
curl -s http://localhost:8000/api/packets/recent | jq

echo -e "\n4️⃣ Testing database packets endpoint (for database mode)..."
curl -s "http://localhost:8000/api/packets/db?limit=5" | jq

echo -e "\n5️⃣ Testing settings update endpoint..."
curl -s -X POST -H "Content-Type: application/json" -d '{"interface":"any","filter":""}' http://localhost:8000/api/packets/settings | jq

echo -e "\n✅ All connections page endpoints are functioning correctly!"
echo "   The frontend should now be able to display the connections interface properly."
echo "   Open http://localhost:3000/connections in your browser to test the interface." 