#!/bin/bash

echo "==============================================="
echo "🛠️ NautScan Frontend Fix Script 🛠️"
echo "==============================================="

echo "1️⃣ Creating .env.local file for frontend..."
cat > ./frontend/.env.local << 'EOF'
# Override API URL to use localhost instead of Docker service name
NEXT_PUBLIC_API_URL=http://localhost:8000/api
EOF

echo "2️⃣ Creating utility file for frontend..."
cat > ./frontend/src/utils/apiConfig.ts << 'EOF'
// API configuration utility
// This helps ensure consistent API URL usage throughout the application

// Get the API base URL from environment variable or use localhost as fallback
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Helper function to construct full API URLs
export const getApiUrl = (endpoint: string): string => {
  // Make sure endpoint doesn't start with a slash when we append it
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Log the configured API URL during app initialization
console.log('API is configured to use:', API_BASE_URL);
EOF

echo "3️⃣ Restarting the frontend container..."
docker restart webapp_nautscan-frontend-1

echo "4️⃣ Waiting for container to restart (10 seconds)..."
sleep 10

echo "5️⃣ Checking container status..."
docker ps | grep webapp_nautscan-frontend

echo "✅ Fix completed! The frontend should now connect to the backend properly."
echo "   Please refresh your browser and try the application again." 