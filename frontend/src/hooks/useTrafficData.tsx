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
        const connections: Connection[] = data.packets.map((packet: any, index: number) => {
          // Use the direction to determine if it's outgoing or incoming
          const isOutgoing = packet.direction === 'outgoing'
          
          return {
            id: packet.packet_id?.toString() || index.toString(),
            source: {
              ip: packet.source_ip || '0.0.0.0',
              lat: 0,
              lng: 0,
              city: '',
              country: ''
            },
            destination: {
              ip: packet.dest_ip || '0.0.0.0',
              lat: 0,
              lng: 0,
              city: '',
              country: ''
            },
            protocol: packet.protocol || 'UNKNOWN',
            source_port: packet.source_port || 0,
            destination_port: packet.dest_port || 0,
            source_device_name: isOutgoing ? 'Local Device' : packet.service || '',
            destination_device_name: !isOutgoing ? 'Local Device' : packet.service || '',
            bytes_sent: isOutgoing ? packet.length || 0 : 0,
            bytes_received: !isOutgoing ? packet.length || 0 : 0,
            timestamp: packet.timestamp || new Date().toISOString(),
            status: 'active'
          }
        })
        
        setConnections(connections)
        setUsingMockData(false)
      } else if (data && Array.isArray(data)) {
        // Handle case where API just returns array directly
        const connections: Connection[] = data.map((packet: any, index: number) => ({
          id: packet.packet_id?.toString() || index.toString(),
          source: {
            ip: packet.source_ip || '0.0.0.0',
            lat: 0,
            lng: 0,
            city: '',
            country: ''
          },
          destination: {
            ip: packet.dest_ip || '0.0.0.0',
            lat: 0,
            lng: 0,
            city: '',
            country: ''
          },
          protocol: packet.protocol || 'UNKNOWN',
          source_port: packet.source_port || 0,
          destination_port: packet.dest_port || 0,
          source_device_name: '',
          destination_device_name: '',
          bytes_sent: packet.length || 0,
          bytes_received: 0,
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
    id: i.toString(),
    source: {
      ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
      lat: 0,
      lng: 0,
      city: '',
      country: ''
    },
    destination: {
      ip: `8.8.8.${Math.floor(Math.random() * 254) + 1}`,
      lat: 0,
      lng: 0,
      city: '',
      country: ''
    },
    protocol: ['TCP', 'UDP', 'ICMP'][Math.floor(Math.random() * 3)],
    source_port: Math.floor(Math.random() * 65535),
    destination_port: Math.floor(Math.random() * 65535),
    source_device_name: 'Local Device',
    destination_device_name: '',
    bytes_sent: Math.floor(Math.random() * 1500),
    bytes_received: 0,
    timestamp: new Date().toISOString(),
    status: 'active'
  }))
}
