#!/bin/bash

echo "==============================================="
echo "🛠️ NautScan Frontend Direct Fix Script 🛠️"
echo "==============================================="

echo "1️⃣ Creating a modified connections.tsx file with fixed API URLs..."
cat > temp_connections.tsx << 'EOF'
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
  
  // Fetch network interfaces
  const fetchInterfaces = useCallback(async () => {
    setLoadingInterfaces(true);
    try {
      console.log('Fetching network interfaces...');
      // Use a direct URL to the backend API
      const response = await fetch('http://localhost:8000/api/packets/interfaces');
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
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
      const response = await fetch('http://localhost:8000/api/packets/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interface: interfaceName
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error updating interface: ${response.status} ${response.statusText}`);
      }
      
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
        interface: selectedInterface,
        settings: null
      };
      console.log('Request body:', requestBody);
      
      // Use a direct URL to the backend API
      const response = await fetch('http://localhost:8000/api/packets/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        // Try to get detailed error message from response
        try {
          const errorData = await response.json();
          console.error('Error data from server:', errorData);
          throw new Error(`Error starting capture: ${errorData.detail || response.statusText}`);
        } catch (jsonError) {
          console.error('Failed to parse error response:', jsonError);
          throw new Error(`Error starting capture: ${response.status} ${response.statusText}`);
        }
      }
      
      // Get the success response
      const responseData = await response.json();
      console.log('Success response:', responseData);
      
      setCaptureStarted(true);
      setCaptureSuccess('Started packet capture on interface: ' + selectedInterface);
      // Switch to real-time mode to see the packets
      setDbMode(false);
      refresh();
      
    } catch (err) {
      console.error('Failed to start packet capture:', err);
      
      // Check if it's a network error
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setCaptureError('Network error: Unable to connect to the backend API. Please ensure the backend service is running.');
      } else {
        setCaptureError(err.message);
      }
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
        // You could also add more complex filtering logic here
      }
      
      const response = await fetch(`http://localhost:8000/api/packets/db?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setDbPackets(data.packets || []);
      setTotalPackets(data.total || 0);
    } catch (err) {
      console.error('Error fetching packets from database:', err);
      setDbError(err.message);
    } finally {
      setLoadingDb(false);
    }
  }, [dbMode, page, pageSize, filter]);
EOF

# Now add the rest of the file that we don't need to modify
tail -n +205 ./frontend/src/pages/connections.tsx >> temp_connections.tsx

echo "2️⃣ Copying the fixed file to the frontend container..."
docker cp temp_connections.tsx webapp_nautscan-frontend-1:/app/src/pages/connections.tsx

echo "3️⃣ Creating a .env.local file in the frontend container..."
cat > temp_env_local << 'EOF'
# Use localhost URL for API calls
NEXT_PUBLIC_API_URL=http://localhost:8000/api
EOF
docker cp temp_env_local webapp_nautscan-frontend-1:/app/.env.local

echo "4️⃣ Restarting the frontend service..."
docker restart webapp_nautscan-frontend-1

echo "5️⃣ Waiting for services to restart (10 seconds)..."
sleep 10

echo "✅ Frontend direct fix applied! The application should now work correctly."
echo "   Please refresh your browser and try the application again."

# Clean up temporary files
rm -f temp_connections.tsx temp_env_local 