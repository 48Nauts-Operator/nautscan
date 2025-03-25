#!/bin/bash
cd /app
echo "Starting NautScan backend API..."
if [[ -f venv/bin/activate ]]; then
  source venv/bin/activate
fi
echo "Starting API server..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
