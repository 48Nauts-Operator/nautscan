import Link from 'next/link'
import { useState, useEffect, useCallback, useMemo } from 'react'
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
  const apiCall = async (endpoint: string, options: RequestInit & { headers?: Record<string, string> } = {}) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    console.log(`Making API call to: ${url}`);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
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

  // Function to fetch packets from the database
  const fetchFromDatabase = useCallback(async () => {
    if (!dbMode) return;
    
    setLoadingDb(true);
    setDbError(null);
    
    try {
      // Log fetch attempt
      console.log('Fetching packet data from database...');
      
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
      
      // Fetch from backend API
      const response = await fetch(`http://localhost:8000/api/packets/db?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Database packets response:', data);
      
      // Set the packets data
      if (data && data.packets && Array.isArray(data.packets)) {
        setDbPackets(data.packets);
        setTotalPackets(data.total || 0);
      } else if (data && Array.isArray(data)) {
        // Handle case where API just returns an array directly
        setDbPackets(data);
        setTotalPackets(data.length);
      } else {
        console.warn('Unexpected database response format');
        setDbPackets([]);
        setTotalPackets(0);
      }
    } catch (err: any) {
      console.error('Error fetching database packets:', err);
      setDbError(err.message || 'Failed to fetch packet data from database');
      setDbPackets([]);
      setTotalPackets(0);
    } finally {
      setLoadingDb(false);
    }
  }, [dbMode, page, pageSize, filter]);
  
  // Fetch database data when component mounts and when dependencies change
  useEffect(() => {
    if (dbMode) {
      fetchFromDatabase();
    }
  }, [dbMode, fetchFromDatabase]);
  
  // Reset to first page and fetch when pageSize changes
  useEffect(() => {
    if (dbMode) {
      setPage(1); // Reset to first page when changing page size
    }
  }, [pageSize, dbMode]);
  
  // Convert database packets to connection format
  const dbConnectionsToDisplay = useMemo(() => {
    if (!dbPackets) return [];
    
    return dbPackets.map((packet, index) => {
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
        source_device_name: packet.service_name || '',
        destination_device_name: '',
        bytes_sent: packet.length || 0,
        bytes_received: 0,
        timestamp: packet.timestamp || new Date().toISOString(),
        status: 'active'
      };
    });
  }, [dbPackets]);
  
  // Apply filtering for real-time connections
  const filteredConnections = connections.filter(conn => 
    filter === '' || 
    Object.values(conn).some(value => 
      value && typeof value === 'string' && value.toLowerCase().includes(filter.toLowerCase())
    )
  );
  
  // Apply pagination for real-time connections
  const paginatedConnections = filteredConnections.slice(
    (page - 1) * pageSize, 
    page * pageSize
  );
  
  // Use database or real-time connections based on mode
  const displayConnections = dbMode ? dbConnectionsToDisplay : paginatedConnections;
  const isLoading = dbMode ? loadingDb : loadingLive;
  const error = dbMode ? dbError : errorLive;
  
  // Calculate total pages
  const totalPages = dbMode 
    ? Math.ceil(totalPackets / pageSize)
    : Math.ceil(filteredConnections.length / pageSize);
    
  // Handle pagination
  const nextPage = () => setPage(p => Math.min(p + 1, totalPages));
  const prevPage = () => setPage(p => Math.max(p - 1, 1));
  
  // Format connection data for display
  const formatProtocol = (protocol: string) => {
    return protocol || 'Unknown';
  };
  
  // Update the helper functions to handle the new Connection structure
  const getSourceIp = (conn: Connection) => {
    return conn.source?.ip || '0.0.0.0';
  };

  const getDestinationIp = (conn: Connection) => {
    return conn.destination?.ip || '0.0.0.0';
  };

  const getSourceDeviceName = (conn: Connection) => {
    return conn.source_device_name || '';
  };

  const getDestinationDeviceName = (conn: Connection) => {
    return conn.destination_device_name || '';
  };

  const getSourceCountry = (conn: Connection) => {
    return conn.source?.country || '—';
  };

  const getDestinationCountry = (conn: Connection) => {
    return conn.destination?.country || '—';
  };

  const getSourceCity = (conn: Connection) => {
    return conn.source?.city || '—';
  };

  const getDestinationCity = (conn: Connection) => {
    return conn.destination?.city || '—';
  };

  const getDirection = (conn: Connection) => {
    // Try to determine direction based on various heuristics
    if (conn.source?.ip?.startsWith('192.168.') || conn.source?.ip?.startsWith('10.') || conn.source?.ip?.startsWith('172.')) {
      return 'Outgoing';
    } else if (conn.destination?.ip?.startsWith('192.168.') || conn.destination?.ip?.startsWith('10.') || conn.destination?.ip?.startsWith('172.')) {
      return 'Incoming';
    }
    
    // If bytes were recorded in one direction
    if (conn.bytes_sent > 0 && conn.bytes_received === 0) {
      return 'Outgoing';
    } else if (conn.bytes_received > 0 && conn.bytes_sent === 0) {
      return 'Incoming';
    }
    
    // Default
    return 'Unknown';
  };

  const getBytes = (conn: Connection) => {
    return (conn.bytes_sent || 0) + (conn.bytes_received || 0);
  };

  // Helper to mark a packet as malicious
  const markAsMalicious = async (id: string) => {
    try {
      const response = await fetch(`/api/packets/db/${id}/mark-malicious`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threat_category: 'manually_flagged',
          notes: 'Manually flagged by user'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      // Refresh the data
      fetchFromDatabase();
    } catch (err: any) {
      console.error('Error marking packet as malicious:', err);
      alert(`Failed to mark packet as malicious: ${err.message}`);
    }
  };

  // Clear capture status messages after 5 seconds
  useEffect(() => {
    if (captureSuccess || captureError) {
      const timer = setTimeout(() => {
        setCaptureSuccess('');
        setCaptureError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [captureSuccess, captureError]);
  
  // Toggle between real-time and database modes
  const toggleMode = () => {
    setDbMode(!dbMode);
  };
  
  // Also fix the ConnectionRow component prop access
  const ConnectionRow = ({ connection }: { connection: Connection }) => {
    return (
      <tr className="border-b border-gray-700">
        <td className="py-2">{connection.source.ip}</td>
        <td className="py-2">{connection.destination.ip}</td>
        <td className="py-2">{connection.protocol}</td>
        <td className="py-2">{connection.source_port}</td>
        <td className="py-2">{connection.destination_port}</td>
        <td className="py-2">{new Date(connection.timestamp).toLocaleTimeString()}</td>
        <td className="py-2">
          <span className={`px-2 py-1 rounded ${connection.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
            {connection.status}
          </span>
        </td>
      </tr>
    );
  };
  
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold font-mono neon-text">CONNECTIONS</h1>
            <p className="text-muted-foreground">View and filter network connections</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Filter connections..."
                className="pl-8 h-10 rounded-sm border border-primary/30 bg-card/50 ring-offset-background px-3 py-2 text-sm file:border-0 file:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 absolute left-2.5 top-3 text-muted-foreground" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setDbMode(true)} 
                className={`px-3 py-2 text-sm rounded-sm border ${dbMode ? 'bg-primary/20 border-primary' : 'border-primary/30'}`}
              >
                Database
              </button>
              <button 
                onClick={() => setDbMode(false)} 
                className={`px-3 py-2 text-sm rounded-sm border ${!dbMode ? 'bg-primary/20 border-primary' : 'border-primary/30'}`}
              >
                Real-time
              </button>
              
              {/* Network Interface Dropdown */}
              <div className="relative ml-2">
                <label htmlFor="interface-select" className="block text-xs font-mono text-primary mb-1">Network Interface</label>
                <select
                  id="interface-select"
                  value={selectedInterface}
                  onChange={handleInterfaceChange}
                  className="h-10 rounded-sm border border-primary/30 bg-card/50 ring-offset-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 appearance-none pr-8"
                  disabled={loadingInterfaces}
                >
                  {loadingInterfaces ? (
                    <option value="">Loading interfaces...</option>
                  ) : interfaces.length === 0 ? (
                    <option value="">No interfaces found</option>
                  ) : (
                    interfaces.map((iface) => (
                      <option 
                        key={iface.name} 
                        value={iface.name}
                        disabled={!iface.is_up}
                      >
                        {iface.description || iface.name} {iface.ip ? `(${iface.ip})` : ''}
                      </option>
                    ))
                  )}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <button 
                  onClick={fetchInterfaces}
                  className="absolute top-0 right-9 h-full flex items-center justify-center text-primary hover:text-primary/80 transition-colors"
                  title="Refresh interfaces"
                  type="button"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              
              {/* Start Capture Button */}
              <button 
                onClick={startCapture}
                className="cyber-button px-4 py-2 text-sm"
              >
                Start Capture
              </button>
            </div>
            
            <Link href="/" className="cyber-button px-4 py-2 text-sm">
              Home
            </Link>
            
            <button 
              onClick={dbMode ? fetchFromDatabase : refresh} 
              className="cyber-button px-4 py-2 text-sm"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>

            {/* Data source indicator */}
            <div className={`px-3 py-1 rounded-sm text-xs font-mono ${
              dbMode 
                ? 'bg-blue-900/50 text-blue-400 border border-blue-700'
                : usingMockData 
                  ? 'bg-amber-900/50 text-amber-400 border border-amber-700' 
                  : 'bg-green-900/50 text-green-400 border border-green-700'
            }`}>
              {dbMode ? 'DATABASE' : usingMockData ? 'MOCK DATA' : 'LIVE DATA'}
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-destructive/20 border border-destructive rounded-sm p-4 mb-6">
            <p className="text-destructive">Error: {error}</p>
            <button 
              onClick={dbMode ? fetchFromDatabase : refresh}
              className="mt-2 bg-destructive text-destructive-foreground px-3 py-1 rounded-sm text-sm"
            >
              Retry
            </button>
          </div>
        )}
        
        {/* Capture success message */}
        {captureSuccess && (
          <div className="bg-green-900/20 border border-green-700 rounded-sm p-4 mb-6">
            <p className="text-green-400">{captureSuccess}</p>
          </div>
        )}
        
        {/* Capture error message */}
        {captureError && (
          <div className="bg-destructive/20 border border-destructive rounded-sm p-4 mb-6">
            <p className="text-destructive font-bold">{captureError}</p>
            
            {captureError.includes('Network error') && (
              <div className="mt-2 text-sm">
                <p className="text-destructive mb-2">Troubleshooting steps:</p>
                <ul className="list-disc pl-5 text-destructive">
                  <li>Ensure the NautScan backend service is running</li>
                  <li>Check if Docker containers are active: <code>docker ps | grep nautscan</code></li>
                  <li>Restart the backend service if needed: <code>docker restart webapp_nautscan-backend-1</code></li>
                  <li>Check backend logs for errors: <code>docker logs webapp_nautscan-backend-1</code></li>
                </ul>
              </div>
            )}
            
            <button 
              onClick={startCapture}
              className="mt-4 bg-destructive text-destructive-foreground px-3 py-1 rounded-sm text-sm"
            >
              Retry
            </button>
          </div>
        )}
        
        {isLoading && displayConnections.length === 0 ? (
          <div className="bg-card rounded-sm border border-primary/30 shadow-sm p-8 text-center">
            <div className="animate-pulse inline-block w-6 h-6 rounded-full bg-primary/50 mb-4"></div>
            <p className="text-muted-foreground">Loading connections data...</p>
          </div>
        ) : (
          <div className="bg-card/90 rounded-sm border border-primary/30 shadow-sm overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 border-b border-primary/30">
                    <th className="px-2 py-2 text-left text-xs font-mono font-medium text-primary">Dir</th>
                    <th className="px-2 py-2 text-left text-xs font-mono font-medium text-primary">Source IP</th>
                    <th className="px-2 py-2 text-left text-xs font-mono font-medium text-primary">Port</th>
                    <th className="px-2 py-2 text-left text-xs font-mono font-medium text-primary">Device</th>
                    <th className="px-2 py-2 text-left text-xs font-mono font-medium text-primary">Dest IP</th>
                    <th className="px-2 py-2 text-left text-xs font-mono font-medium text-primary">Port</th>
                    <th className="px-2 py-2 text-left text-xs font-mono font-medium text-primary">Device</th>
                    <th className="px-2 py-2 text-left text-xs font-mono font-medium text-primary">Country</th>
                    <th className="px-2 py-2 text-left text-xs font-mono font-medium text-primary">City</th>
                    <th className="px-2 py-2 text-left text-xs font-mono font-medium text-primary">Proto</th>
                    <th className="px-2 py-2 text-left text-xs font-mono font-medium text-primary">Traffic</th>
                    <th className="px-2 py-2 text-left text-xs font-mono font-medium text-primary">Status</th>
                    {dbMode && (
                      <th className="px-2 py-2 text-left text-xs font-mono font-medium text-primary">Act</th>
                    )}
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {displayConnections.length > 0 ? (
                    displayConnections.map((conn) => (
                      <tr key={conn.id} className="border-b border-primary/20 hover:bg-primary/5 transition-colors">
                        <td className="px-2 py-1.5 text-xs">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                            getDirection(conn) === "Outgoing"
                              ? "bg-blue-100/10 text-blue-500 ring-1 ring-blue-500/30" 
                              : getDirection(conn) === "Incoming" 
                              ? "bg-purple-100/10 text-purple-500 ring-1 ring-purple-500/30" 
                              : "bg-gray-100/10 text-gray-500 ring-1 ring-gray-500/30"
                          }`}>
                            {getDirection(conn) === "Outgoing" ? "Out" : getDirection(conn) === "Incoming" ? "In" : "Bi"}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-xs">{getSourceIp(conn)}</td>
                        <td className="px-2 py-1.5 text-xs">{conn.source_port || '—'}</td>
                        <td className="px-2 py-1.5 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">{getSourceDeviceName(conn)}</td>
                        <td className="px-2 py-1.5 text-xs">{getDestinationIp(conn)}</td>
                        <td className="px-2 py-1.5 text-xs">{conn.destination_port || '—'}</td>
                        <td className="px-2 py-1.5 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">{getDestinationDeviceName(conn)}</td>
                        <td className="px-2 py-1.5 text-xs whitespace-nowrap">{getSourceCountry(conn)} → {getDestinationCountry(conn)}</td>
                        <td className="px-2 py-1.5 text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{getSourceCity(conn)} → {getDestinationCity(conn)}</td>
                        <td className="px-2 py-1.5 text-xs">{formatProtocol(conn.protocol)}</td>
                        <td className="px-2 py-1.5 text-xs whitespace-nowrap">{getBytes(conn).toLocaleString()} B</td>
                        <td className="px-2 py-1.5 text-xs">
                          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                            conn.status === "active"
                              ? "bg-green-100/10 text-green-500 ring-1 ring-green-500/30" 
                              : conn.status === "closed" 
                              ? "bg-red-100/10 text-red-500 ring-1 ring-red-500/30" 
                              : "bg-yellow-100/10 text-yellow-500 ring-1 ring-yellow-500/30"
                          }`}>
                            {conn.status}
                          </span>
                        </td>
                        {dbMode && (
                          <td className="px-2 py-1.5 text-xs">
                            <button
                              onClick={() => markAsMalicious(conn.id)}
                              disabled={conn.status === 'blocked'}
                              className={`px-1.5 py-0.5 text-xs rounded ${
                                conn.status === 'blocked' 
                                  ? 'bg-gray-100/10 text-gray-400 cursor-not-allowed' 
                                  : 'bg-red-100/10 text-red-500 hover:bg-red-100/20'
                              }`}
                            >
                              Flag
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={dbMode ? 13 : 12} className="px-2 py-8 text-center text-muted-foreground">
                        {filter ? 'No connections match your filter criteria.' : 'No connections detected.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-2 border-t border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Rows:</span>
                <select 
                  value={pageSize} 
                  onChange={(e) => setPageSize(Number(e.target.value))} 
                  className="bg-background/80 border border-primary/30 rounded px-2 py-1 text-xs"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-muted-foreground ml-2">
                  {dbMode 
                    ? `${displayConnections.length > 0 ? (page - 1) * pageSize + 1 : 0}-${Math.min(page * pageSize, totalPackets)} of ${totalPackets}`
                    : `${filteredConnections.length > 0 ? (page - 1) * pageSize + 1 : 0}-${Math.min(page * pageSize, filteredConnections.length)} of ${filteredConnections.length}`
                  }
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className={`px-2 py-1 text-xs rounded-sm border border-primary/30 ${
                    page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/10'
                  }`}
                >
                  «
                </button>
                <button 
                  onClick={prevPage}
                  disabled={page === 1}
                  className={`px-2 py-1 text-xs rounded-sm border border-primary/30 ${
                    page === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/10'
                  }`}
                >
                  ‹
                </button>
                
                {/* Page number display with simple pagination */}
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  // Calculate which page numbers to show
                  let pageNum;
                  if (totalPages <= 5) {
                    // Show all pages if 5 or fewer
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    // Show first 5 pages
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    // Show last 5 pages
                    pageNum = totalPages - 4 + i;
                  } else {
                    // Show current page and 2 on each side
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-2 py-1 text-xs rounded-sm border ${
                        page === pageNum 
                          ? 'bg-primary/20 border-primary' 
                          : 'border-primary/30 hover:bg-primary/10'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button 
                  onClick={nextPage}
                  disabled={page >= totalPages}
                  className={`px-2 py-1 text-xs rounded-sm border border-primary/30 ${
                    page >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/10'
                  }`}
                >
                  ›
                </button>
                <button 
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className={`px-2 py-1 text-xs rounded-sm border border-primary/30 ${
                    page >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/10'
                  }`}
                >
                  »
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}