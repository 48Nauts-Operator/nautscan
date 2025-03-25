#!/bin/bash

echo "==============================================="
echo "🛠️ NautScan Frontend Complete Fix Script 🛠️"
echo "==============================================="

echo "1️⃣ Creating .env.local file for frontend..."
cat > ./frontend/.env.local << 'EOF'
# Override API URL to use localhost instead of Docker service name
NEXT_PUBLIC_API_URL=http://localhost:8000/api
EOF

echo "2️⃣ Modifying connections.tsx to fix API paths and error handling..."
cat > temp_fix_connections.tsx << 'EOF'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { useTrafficData } from '../hooks/useTrafficData'
import { Connection } from '../types/network'

// Network interface type definition
interface NetworkInterface {
  name: string;
  description: string;
  ip?: string;
  mac?: string;
  is_up?: boolean;
}

export default function Connections() {
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [dbMode, setDbMode] = useState(true)  // Default to using database
  
  // Interface selection state
  const [interfaces, setInterfaces] = useState<NetworkInterface[]>([])
  const [selectedInterface, setSelectedInterface] = useState('any')
  const [loadingInterfaces, setLoadingInterfaces] = useState(false)
  const [captureStarted, setCaptureStarted] = useState(false)
  const [captureSuccess, setCaptureSuccess] = useState('')
  const [captureError, setCaptureError] = useState('')

  // Database-specific state
  const [dbPackets, setDbPackets] = useState([])
  const [totalPackets, setTotalPackets] = useState(0)
  const [loadingDb, setLoadingDb] = useState(false)
  const [dbError, setDbError] = useState(null)
  
  // Use the real data from the API or database
  const { connections, loading: loadingLive, error: errorLive, refresh, usingMockData } = useTrafficData({
    refreshInterval: 15000, // Refresh every 15 seconds
    useWebsockets: false,  // Explicitly disable WebSockets
  })

  // Helper function for API calls
  const apiCall = async (endpoint, options = {}) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    console.log(`Making API call to: ${url}`);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || `API error: ${response.status} ${response.statusText}`;
        } catch (e) {
          errorMessage = `API error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API call to ${url} failed:`, error);
      throw error;
    }
  };
  
  // Fetch network interfaces
  const fetchInterfaces = useCallback(async () => {
    setLoadingInterfaces(true);
    try {
      console.log('Fetching network interfaces...');
      const data = await apiCall('/packets/interfaces');
      console.log('Available network interfaces:', data);
      
      if (data && data.length > 0) {
        setInterfaces(data);
        
        // If no interface is selected yet, select the first available one
        if (selectedInterface === 'any' || !data.some(iface => iface.name === selectedInterface)) {
          // Try to find an interface that's up
          const availableIfaces = data.filter(iface => iface.is_up !== false);
          if (availableIfaces.length > 0) {
            console.log('Setting selected interface to:', availableIfaces[0].name);
            setSelectedInterface(availableIfaces[0].name);
          } else if (data.length > 0) {
            // If no "up" interfaces, just use the first one
            setSelectedInterface(data[0].name);
          }
        }
      } else {
        console.warn('No interfaces returned from API');
        setCaptureError('No network interfaces found. Using default values.');
        setInterfaces([
          { name: 'any', description: 'Any Interface' },
          { name: 'eth0', description: 'Ethernet' },
          { name: 'lo', description: 'Loopback' }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch interfaces:', err);
      setCaptureError(`Failed to fetch network interfaces: ${err.message}`);
      
      // Use fallback interfaces
      setInterfaces([
        { name: 'any', description: 'Any Interface' },
        { name: 'eth0', description: 'Ethernet' },
        { name: 'lo', description: 'Loopback' }
      ]);
      
      setSelectedInterface('eth0');
    } finally {
      setLoadingInterfaces(false);
    }
  }, [selectedInterface]);

  // Load interfaces on component mount
  useEffect(() => {
    fetchInterfaces();
  }, [fetchInterfaces]);

  // Update capture settings when interface changes
  const updateCaptureInterface = useCallback(async (interfaceName) => {
    try {
      await apiCall('/packets/settings', {
        method: 'POST',
        body: JSON.stringify({
          interface: interfaceName
        })
      });
      
      // Refresh data after changing interface
      refresh();
    } catch (error) {
      console.error('Failed to update capture interface:', error);
    }
  }, [refresh]);

  // Start packet capture
  const startCapture = useCallback(async () => {
    try {
      console.log(`Attempting to start packet capture on interface: ${selectedInterface}`);
      
      // Create the request body
      const requestBody = {
        interface: selectedInterface
      };
      console.log('Request body:', requestBody);
      
      const responseData = await apiCall('/packets/start', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });
      
      console.log('Success response:', responseData);
      
      setCaptureStarted(true);
      setCaptureSuccess(`Started packet capture on interface: ${selectedInterface}`);
      // Switch to real-time mode to see the packets
      setDbMode(false);
      refresh();
      
    } catch (err) {
      console.error('Failed to start packet capture:', err);
      setCaptureError(err.message);
    }
  }, [selectedInterface, refresh]);

  // Handle interface change
  const handleInterfaceChange = (event) => {
    const newInterface = event.target.value;
    setSelectedInterface(newInterface);
    updateCaptureInterface(newInterface);
  };

  // Fetch data from the database API
  const fetchFromDatabase = useCallback(async () => {
    if (!dbMode) return;
    
    setLoadingDb(true);
    setDbError(null);
    
    try {
      // Calculate offset based on current page
      const offset = (page - 1) * pageSize;
      
      // Build query parameters
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: offset.toString()
      });
      
      if (filter) {
        // Add filter for source or destination IP
        params.append('source_ip', filter);
      }
      
      const data = await apiCall(`/packets/db?${params.toString()}`);
      setDbPackets(data.packets || []);
      setTotalPackets(data.total || 0);
    } catch (err) {
      console.error('Error fetching packets from database:', err);
      setDbError(err.message);
    } finally {
      setLoadingDb(false);
    }
  }, [dbMode, page, pageSize, filter]);
  
  // Rest of the component remains the same
  // ... (keep all the existing code below this point)
EOF

# Now append the rest of the original file
tail -n +200 frontend/src/pages/connections.tsx >> temp_fix_connections.tsx

echo "3️⃣ Updating the connections page with the fixed version..."
docker cp temp_fix_connections.tsx webapp_nautscan-frontend-1:/app/src/pages/connections.tsx

echo "4️⃣ Creating API utility file..."
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

# Copy API config to the frontend container
docker cp ./frontend/src/utils/apiConfig.ts webapp_nautscan-frontend-1:/app/src/utils/apiConfig.ts

echo "5️⃣ Creating a CORS middleware file for backend..."
cat > temp_fix_middleware.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class CORSFixMiddleware(BaseHTTPMiddleware):
    """Custom middleware to ensure CORS headers are correctly set"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add CORS headers to all responses
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Max-Age"] = "86400"  # 24 hours
        
        return response

def configure_cors(app: FastAPI):
    """Configure CORS settings for the FastAPI application"""
    
    # Standard CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add our custom middleware
    app.add_middleware(CORSFixMiddleware)
EOF

# Copy CORS middleware to backend container
docker cp temp_fix_middleware.py webapp_nautscan-backend-1:/app/app/core/middleware.py

echo "6️⃣ Updating main.py to use our new CORS middleware..."
cat > temp_fix_cors_main.py << 'EOF'
from fastapi import FastAPI
import logging
from .api import websocket, traffic, packets
from .services.traffic import TrafficService
from .core.config import Settings
from .core.middleware import configure_cors

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

# Configure CORS with our custom middleware
configure_cors(app)

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

# Copy the fixed main.py to the backend container
docker cp temp_fix_cors_main.py webapp_nautscan-backend-1:/app/app/main.py

echo "7️⃣ Restarting both frontend and backend containers..."
docker restart webapp_nautscan-backend-1
docker restart webapp_nautscan-frontend-1

echo "8️⃣ Waiting for services to restart (15 seconds)..."
sleep 15

echo "9️⃣ Verifying API endpoints..."
echo ""
echo "Testing health endpoint:"
curl -s http://localhost:8000/health
echo ""
echo ""
echo "Testing interfaces endpoint:"
curl -s http://localhost:8000/api/packets/interfaces | head -30
echo ""
echo ""
echo "Testing permissions to run packet capture:"
docker exec webapp_nautscan-backend-1 /bin/bash -c "python -c 'from scapy.all import sniff; print(\"Packet capture available!\")'"
echo ""

echo "✅ Complete fix applied! The application should now work correctly."
echo "   Please refresh your browser and try the application again."

# Clean up temporary files
rm -f temp_fix_connections.tsx temp_fix_middleware.py temp_fix_cors_main.py 