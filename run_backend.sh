#!/bin/bash
echo "Starting backend directly..."
docker exec -i webapp_nautscan-backend-1 sh -c "cd /app && python -m uvicorn main:app --host 0.0.0.0 --port 8000"
