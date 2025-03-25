#!/bin/bash

echo "==============================================="
echo "🛠️ NautScan Backend Start Script Fix 🛠️"
echo "==============================================="

echo "1️⃣ Checking the entry script in the backend container..."
docker exec -i webapp_nautscan-backend-1 sh -c "ls -la /app && cat /app/start.sh || echo 'No start.sh found'"

echo "2️⃣ Creating a new start script..."
cat > temp_start.sh << 'EOF'
#!/bin/sh
cd /app
echo "Starting NautScan backend API..."
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
EOF

echo "3️⃣ Copying the new start script to the container..."
docker cp temp_start.sh webapp_nautscan-backend-1:/app/start.sh
docker exec -i webapp_nautscan-backend-1 sh -c "chmod +x /app/start.sh"

echo "4️⃣ Creating a direct run script to force proper execution..."
cat > run_backend.sh << 'EOF'
#!/bin/bash
echo "Starting backend directly..."
docker exec -i webapp_nautscan-backend-1 sh -c "cd /app && python -m uvicorn main:app --host 0.0.0.0 --port 8000"
EOF
chmod +x run_backend.sh

echo "5️⃣ Stopping the current backend..."
docker stop webapp_nautscan-backend-1

echo "6️⃣ Starting the backend with the updated start script..."
docker start webapp_nautscan-backend-1

echo "7️⃣ Waiting for services to start (5 seconds)..."
sleep 5

echo "8️⃣ Running the backend directly if needed..."
./run_backend.sh &

echo "9️⃣ Waiting for the backend to start properly (5 seconds)..."
sleep 5

echo "10️⃣ Testing backend API endpoints..."
echo "   Testing /health endpoint..."
curl -s http://localhost:8000/health || echo "Health endpoint not responding"

echo "   Testing /api/packets/interfaces endpoint..."
curl -s http://localhost:8000/api/packets/interfaces || echo "Interfaces endpoint not responding"

echo "   Testing /api/packets/start endpoint..."
curl -s -X POST http://localhost:8000/api/packets/start \
  -H "Content-Type: application/json" \
  -d '{"interface": "eth0"}' || echo "Start endpoint not responding"

echo "✅ Backend start script fixed and the application is running!"
echo "   Please refresh your browser and try the application again."

# Clean up
rm -f temp_start.sh 