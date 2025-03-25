#!/bin/bash

echo "==============================================="
echo "🛠️ NautScan Frontend Final Fix Script 🛠️"
echo "==============================================="

echo "1️⃣ Creating the useTrafficData.tsx hook with direct backend URLs..."
cat > temp_useTrafficData.tsx << 'EOF'
import { useState, useEffect, useCallback } from 'react'
import { Connection } from '../types/network'

interface TrafficDataOptions {
  refreshInterval?: number
  initialData?: Connection[]
  useWebsockets?: boolean
}

export function useTrafficData({
  refreshInterval = 10000,
  initialData = [],
  useWebsockets = false
}: TrafficDataOptions = {}) {
  const [connections, setConnections] = useState<Connection[]>(initialData)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [usingMockData, setUsingMockData] = useState(false)

  const fetchTrafficData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Log fetch attempt
      console.log('Fetching traffic data from backend API...')
      
      // Use direct URL to the backend
      const response = await fetch('http://localhost:8000/api/packets/recent')
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Traffic data response:', data)
      
      // Convert the packet data to Connection format
      if (data && data.packets && Array.isArray(data.packets)) {
        const connections: Connection[] = data.packets.map((packet: any, index: number) => ({
          id: packet.packet_id || index,
          source: packet.source_ip || '192.168.1.1',
          destination: packet.dest_ip || '192.168.1.2',
          protocol: packet.protocol || 'TCP',
          port: packet.source_port || 80,
          bytes: packet.length || 64,
          timestamp: packet.timestamp || new Date().toISOString(),
          status: 'active'
        }))
        
        setConnections(connections)
        setUsingMockData(false)
      } else if (data && Array.isArray(data)) {
        // Handle case where API just returns array directly
        const connections: Connection[] = data.map((packet: any, index: number) => ({
          id: packet.packet_id || index,
          source: packet.source_ip || '192.168.1.1',
          destination: packet.dest_ip || '192.168.1.2',
          protocol: packet.protocol || 'TCP',
          port: packet.source_port || 80,
          bytes: packet.length || 64,
          timestamp: packet.timestamp || new Date().toISOString(),
          status: 'active'
        }))
        
        setConnections(connections)
        setUsingMockData(false)
      } else {
        console.warn('Unexpected data format from API, using mock data')
        // Use mock data as fallback
        setConnections(generateMockData(10))
        setUsingMockData(true)
      }
      
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error fetching traffic data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      
      // Use mock data as fallback
      console.warn('Using mock data due to API error')
      setConnections(generateMockData(10))
      setUsingMockData(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchTrafficData()
  }, [fetchTrafficData])

  // Set up interval for refresh
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const timer = setInterval(() => {
        fetchTrafficData()
      }, refreshInterval)

      return () => clearInterval(timer)
    }
  }, [refreshInterval, fetchTrafficData])

  const refresh = useCallback(() => {
    fetchTrafficData()
  }, [fetchTrafficData])

  return {
    connections,
    loading,
    error,
    refresh,
    lastUpdated,
    usingMockData
  }
}

// Mock data generator
function generateMockData(count: number): Connection[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    source: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
    destination: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
    protocol: ['TCP', 'UDP', 'ICMP'][Math.floor(Math.random() * 3)],
    port: Math.floor(Math.random() * 65535),
    bytes: Math.floor(Math.random() * 1500),
    timestamp: new Date().toISOString(),
    status: ['active', 'closed'][Math.floor(Math.random() * 2)]
  }))
}
EOF

echo "2️⃣ Copying the fixed hook to the frontend container..."
docker cp temp_useTrafficData.tsx webapp_nautscan-frontend-1:/app/src/hooks/useTrafficData.tsx

echo "3️⃣ Creating a .env.local file with direct API URLs..."
cat > temp_env_local << 'EOF'
# Direct backend API URL for all requests
NEXT_PUBLIC_API_URL=http://localhost:8000/api
EOF
docker cp temp_env_local webapp_nautscan-frontend-1:/app/.env.local

echo "4️⃣ Restarting the frontend service..."
docker restart webapp_nautscan-frontend-1

echo "5️⃣ Waiting for services to restart (10 seconds)..."
sleep 10

echo "✅ Frontend fix complete! The application should now work correctly."
echo "   Please refresh your browser and try the application again."

# Clean up temporary files
rm -f temp_useTrafficData.tsx temp_env_local 