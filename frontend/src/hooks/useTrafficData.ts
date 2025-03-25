import { useState, useEffect, useCallback, useRef } from 'react';
import { Connection, TrafficStats, Alert } from '../types/network';
import { ApiService } from '../services/api';
import { WebSocketService } from '../services/websocket';

interface UseTrafficDataProps {
  historyDuration?: string;
  refreshInterval?: number;
  useWebsockets?: boolean;
  maxRetries?: number;
}

export function useTrafficData({ 
  historyDuration = '1h', 
  refreshInterval = 60000,
  useWebsockets = false,
  maxRetries = 3
}: UseTrafficDataProps = {}) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [stats, setStats] = useState<TrafficStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [usingMockData, setUsingMockData] = useState(false);
  
  // Use refs to avoid recreating the service on each render
  const wsServiceRef = useRef<WebSocketService | null>(null);

  // Initialize WebSocket service
  useEffect(() => {
    // Skip WebSocket initialization completely if not enabled
    if (!useWebsockets) return;
    
    if (useWebsockets && !wsServiceRef.current) {
      try {
        wsServiceRef.current = new WebSocketService();
        console.log('WebSocket service initialized');
      } catch (err) {
        console.error('Failed to initialize WebSocket service:', err);
      }
    }
    
    return () => {
      if (wsServiceRef.current) {
        wsServiceRef.current.cleanup();
        wsServiceRef.current = null;
        console.log('WebSocket service cleaned up');
      }
    };
  }, [useWebsockets]);

  // Set up WebSocket listeners if enabled
  useEffect(() => {
    // Skip WebSocket setup completely if not enabled
    if (!useWebsockets) return;
    
    if (!useWebsockets || !wsServiceRef.current) return;
    
    const wsService = wsServiceRef.current;
    
    try {
      // Set up traffic socket for real-time connection updates
      wsService.setupTrafficSocket((newConnection) => {
        setConnections(prev => {
          // Check if this connection already exists
          const exists = prev.some(conn => conn.id === newConnection.id);
          if (exists) {
            // Update existing connection
            return prev.map(conn => 
              conn.id === newConnection.id ? newConnection : conn
            );
          } else {
            // Add new connection, maintain most recent at top
            return [newConnection, ...prev.slice(0, 99)];
          }
        });
      });
      
      // Set up stats socket for real-time stats updates
      wsService.setupStatsSocket((newStats) => {
        setStats(newStats);
      });
      
      // Set up alerts socket for real-time alerts
      wsService.setupAlertsSocket((newAlert) => {
        setAlerts(prev => [newAlert, ...prev.slice(0, 19)]);
      });
      
      console.log('WebSocket listeners set up');
    } catch (err) {
      console.error('Error setting up WebSocket listeners:', err);
    }
    
  }, [useWebsockets]);

  // Load data from the API with retry logic
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null); // Clear previous errors
    
    try {
      console.log('Fetching traffic data...');
      
      // Get current connections
      const connectionsData = await ApiService.getCurrentConnections(100);
      setConnections(connectionsData);
      
      // Check if we're getting mock data 
      const isMockData = connectionsData.length > 0 && connectionsData[0].id && connectionsData[0].id.startsWith('conn-');
      console.log('Is mock data?', isMockData);
      setUsingMockData(isMockData);
      
      // Get current stats
      const statsData = await ApiService.getCurrentStats();
      setStats(statsData);
      
      // For alerts, we'll keep the mock data for now since we don't have a real endpoint yet
      // This can be updated when the alerts API is available
      const mockAlerts: Alert[] = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        level: ['info', 'warning', 'error'][Math.floor(Math.random() * 3)] as 'info' | 'warning' | 'error',
        category: ['security', 'performance', 'system'][Math.floor(Math.random() * 3)] as 'security' | 'performance' | 'system',
        message: `Alert: ${['Unusual traffic', 'Port scan detected', 'High bandwidth usage', 'Connection attempt blocked', 'System resource low'][Math.floor(Math.random() * 5)]}`,
        timestamp: new Date().toISOString(),
      }));
      setAlerts(mockAlerts);
      
      // Reset retry count on success
      setRetryCount(0);
    } catch (err) {
      console.error('Error loading data:', err);
      
      // Set user-friendly error message
      const userMessage = 
        err instanceof Error 
          ? (err.message.includes('Failed to fetch') || err.message.includes('ERR_NAME_NOT_RESOLVED')
              ? 'Cannot connect to the backend server. Check if it is running.' 
              : err.message)
          : 'Failed to load data';
      
      setError(userMessage);
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
      
      if (retryCount < maxRetries) {
        console.log(`Retry attempt ${retryCount + 1} of ${maxRetries}...`);
        
        // Wait a bit longer between each retry
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        setTimeout(loadData, retryDelay);
      } else {
        console.log('Max retries reached. Using mock data if available.');
        setUsingMockData(true);
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount, maxRetries]);

  // Setup data loading on mount and refresh interval
  useEffect(() => {
    console.log('Setting up data loading with refresh interval:', refreshInterval);
    
    // Initial load
    loadData();

    // Set up refresh interval
    const intervalId = setInterval(() => {
      console.log('Refreshing data...');
      loadData();
    }, refreshInterval);

    return () => {
      console.log('Cleaning up interval...');
      clearInterval(intervalId);
    };
  }, [loadData, refreshInterval]);

  // Extra logging for debugging
  useEffect(() => {
    if (connections.length > 0) {
      console.log(`Loaded ${connections.length} connections. Using ${usingMockData ? 'mock' : 'real'} data.`);
    }
  }, [connections, usingMockData]);

  return {
    connections,
    stats,
    alerts,
    loading,
    error,
    usingMockData,
    refresh: loadData,
  };
} 