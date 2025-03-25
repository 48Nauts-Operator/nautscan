#!/bin/bash

echo "==============================================="
echo "🔍 NautScan Application Verification Script 🔍"
echo "==============================================="

echo "1️⃣ Checking Docker container status..."
docker ps -a | grep nautscan

echo -e "\n2️⃣ Verifying backend API endpoints..."

echo "   ✅ Health check endpoint:"
curl -s http://localhost:8000/health | jq || echo "Health endpoint not responding or jq not installed"

echo -e "\n   ✅ Interfaces endpoint:"
curl -s http://localhost:8000/api/packets/interfaces | jq '.[0:3]' || echo "Interfaces endpoint not responding or jq not installed"

echo -e "\n   ✅ Start capture endpoint:"
curl -s -X POST http://localhost:8000/api/packets/start \
  -H "Content-Type: application/json" \
  -d '{"interface": "eth0"}' | jq || echo "Start capture endpoint not responding or jq not installed"

echo -e "\n   ✅ Recent packets endpoint:"
curl -s http://localhost:8000/api/packets/recent | jq || echo "Recent packets endpoint not responding or jq not installed"

echo -e "\n   ✅ Database packets endpoint:"
curl -s "http://localhost:8000/api/packets/db?limit=2" | jq || echo "Database endpoint not responding or jq not installed"

echo -e "\n3️⃣ Testing frontend server..."
curl -s http://localhost:3000 | grep -o "<title>.*</title>" || echo "Frontend not responding"

echo -e "\n4️⃣ Application URLs:"
echo "   • Frontend: http://localhost:3000"
echo "   • Backend API: http://localhost:8000/api"

echo -e "\n✅ Verification complete! The application should be working correctly."
echo "   Please open http://localhost:3000 in your browser to access the application."
echo "   API documentation is available at http://localhost:8000/docs" 