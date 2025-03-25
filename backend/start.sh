#!/bin/sh
cd /app
echo "Starting NautScan backend API..."
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
