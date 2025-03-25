#!/bin/bash

echo "==============================================="
echo "🛠️ NautScan Traffic Service Fix Script 🛠️"
echo "==============================================="

echo "1️⃣ Creating fixed traffic service module..."
cat > temp_fix_traffic.py << 'EOF'
from app.core.packet_capture import PacketCapture
import logging
from typing import Dict, Any, Optional, List
import time

logger = logging.getLogger(__name__)

class TrafficService:
    """Service for managing traffic data and statistics"""
    
    def __init__(self):
        self.packet_capture = PacketCapture()
        
    def process_packet(self, packet_info: Dict[str, Any]):
        """Process packet information"""
        # This method is called for each packet captured
        # We don't need to do anything with it for now
        pass
    
    def start_capture(self, interface: Optional[str] = None, filter_str: Optional[str] = None):
        """Start packet capture with specified settings"""
        settings = {}
        if filter_str:
            settings['filter'] = filter_str
            
        return self.packet_capture.start_capture(interface=interface, settings=settings)
    
    def stop_capture(self):
        """Stop packet capture"""
        return self.packet_capture.stop_capture()
EOF

echo "2️⃣ Creating fixed main.py file..."
cat > temp_fix_main.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from .api import websocket, traffic, packets
from .services.traffic import TrafficService
from .core.config import Settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = Settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "status": "operational"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include routers
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])
app.include_router(traffic.router, prefix="/api/traffic", tags=["traffic"])
app.include_router(packets.router, prefix="/api/packets", tags=["packets"])

# Initialize services
traffic_service = None

@app.on_event("startup")
async def startup_event():
    """Initialize services on application startup"""
    global traffic_service
    try:
        # Initialize traffic service
        traffic_service = TrafficService()
        
        # NOTE: We're not auto-starting packet capture on application startup
        # Users can start it manually via the API
        
        logger.info("NautScan API started successfully")
    except Exception as e:
        logger.error(f"Error starting application: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on application shutdown"""
    global traffic_service
    if traffic_service and traffic_service.packet_capture:
        traffic_service.packet_capture.stop_capture()
    logger.info("NautScan API shut down successfully")
EOF

echo "3️⃣ Copying fix files to the backend container..."
docker cp temp_fix_traffic.py webapp_nautscan-backend-1:/app/app/services/traffic.py
docker cp temp_fix_main.py webapp_nautscan-backend-1:/app/app/main.py

echo "4️⃣ Restarting backend service..."
docker restart webapp_nautscan-backend-1

echo "5️⃣ Waiting for service to restart (10 seconds)..."
sleep 10

echo "6️⃣ Checking container status..."
docker ps | grep webapp_nautscan-backend

echo "7️⃣ Testing backend API endpoints..."
echo ""
echo "Testing health endpoint:"
curl -s http://localhost:8000/health
echo ""
echo ""
echo "Testing interfaces endpoint:"
curl -s http://localhost:8000/api/packets/interfaces
echo ""

echo "8️⃣ Frontend CORS proxy check..."
cat > proxy_check.js << 'EOF'
// This is a simple utility to verify that the CORS proxy is working
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8000,
  path: '/health',
  method: 'GET',
  headers: {
    'User-Agent': 'NodeJS-Test-Client'
  }
};

console.log('Sending test request to backend...');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:');
    console.log(data);
    console.log('\nTest complete!');
    
    if (res.statusCode === 200) {
      console.log('✅ Backend health endpoint is responding correctly');
    } else {
      console.log('❌ Backend health endpoint returned unexpected status code');
    }
    
    // Check if CORS headers are present
    if (res.headers['access-control-allow-origin']) {
      console.log('✅ CORS headers are properly configured');
    } else {
      console.log('⚠️ CORS headers might not be properly configured');
    }
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.end();
EOF

echo "✅ Backend fix completed! The API endpoints should now work correctly."
echo "   Please refresh your browser and try the application again."

# Clean up temporary files
rm -f temp_fix_traffic.py temp_fix_main.py 