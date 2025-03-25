import { Connection, TrafficStats, Alert } from '../types/network';

interface ConnectionHistoryParams {
    startTime: string;
    endTime: string;
    limit?: number;
    protocol?: string;
    application?: string;
}

interface StatsHistoryParams {
    startTime: string;
    endTime: string;
    interval?: string;
}

interface AlertHistoryParams {
    startTime?: string;
    endTime?: string;
    level?: 'info' | 'warning' | 'error';
    category?: 'security' | 'performance' | 'system';
    limit?: number;
}

// In Docker compose networking, services can access each other by name
// For local development outside Docker, we use localhost
// Environment variable can override both
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Set API URL fallback
const API_FALLBACK_URL = 'http://localhost:8000/api';

// Log the API URL for debugging
console.log('API URL:', API_URL);

// Function to try the main URL first, then fall back to localhost if hostname can't be resolved
const getApiUrl = (endpoint: string) => {
  // If URL contains "backend" but we're in a browser environment outside Docker, use localhost
  const url = API_URL.includes('backend') && typeof window !== 'undefined' ? 
    `http://localhost:8000/api${endpoint}` : 
    `${API_URL}${endpoint}`;
  
  console.log('Using API URL:', url);
  return url;
};

// Helper function to generate random IP
const randomIp = () => 
  `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

// Helper function to generate a mock location
const mockLocation = (country?: string) => ({
    lat: Math.random() * 180 - 90,
    lng: Math.random() * 360 - 180,
    city: country ? `City in ${country}` : 'Unknown City',
    country: country || ['US', 'UK', 'CN', 'RU', 'DE', 'JP', 'IN', 'BR'][Math.floor(Math.random() * 8)],
    ip: randomIp()
});

// Generate mock connections for testing when API fails
const generateMockConnections = (count: number = 10): Connection[] => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `conn-${i}`,
        source: mockLocation(),
        destination: mockLocation(),
        protocol: ['TCP', 'UDP', 'ICMP'][Math.floor(Math.random() * 3)],
        source_port: Math.floor(Math.random() * 60000) + 1024,
        destination_port: [80, 443, 22, 25, 3306, 5432][Math.floor(Math.random() * 6)],
        bytes_sent: Math.floor(Math.random() * 100000),
        bytes_received: Math.floor(Math.random() * 100000),
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString(),
        application: ['HTTP', 'HTTPS', 'SSH', 'DNS', 'SMTP'][Math.floor(Math.random() * 5)],
        status: ['active', 'closed', 'blocked'][Math.floor(Math.random() * 3)] as 'active' | 'closed' | 'blocked'
    }));
};

// Generate mock stats for testing when API fails
const generateMockStats = (): TrafficStats => {
    return {
        total_connections: Math.floor(Math.random() * 1000) + 100,
        active_connections: Math.floor(Math.random() * 200) + 50,
        bytes_per_second: Math.random() * 10000,
        total_bytes: Math.floor(Math.random() * 1000000),
        connections_per_second: Math.random() * 10,
        top_protocols: {
            'TCP': Math.floor(Math.random() * 100),
            'UDP': Math.floor(Math.random() * 50),
            'ICMP': Math.floor(Math.random() * 20)
        },
        top_applications: {
            'HTTP': Math.floor(Math.random() * 100),
            'HTTPS': Math.floor(Math.random() * 80),
            'SSH': Math.floor(Math.random() * 30),
            'DNS': Math.floor(Math.random() * 50)
        },
        timestamp: new Date().toISOString()
    };
};

export class ApiService {
    // Flag to use mock data if API is not available
    private static useMockData = true;

    private static async fetchJson<T>(endpoint: string): Promise<T> {
        try {
            console.log('Fetching from:', getApiUrl(endpoint));
            const response = await fetch(getApiUrl(endpoint));
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error (${response.status}): ${errorText}`);
            }
            return response.json();
        } catch (error) {
            console.error(`Error fetching from ${endpoint}:`, error);
            
            // If it's a network error (like ERR_NAME_NOT_RESOLVED), try with localhost
            if (error instanceof TypeError && error.message.includes('fetch') && API_URL.includes('backend')) {
                try {
                    console.log('Retrying with localhost fallback...');
                    const fallbackUrl = `http://localhost:8000/api${endpoint}`;
                    console.log('Fallback URL:', fallbackUrl);
                    
                    const fallbackResponse = await fetch(fallbackUrl);
                    if (!fallbackResponse.ok) {
                        const errorText = await fallbackResponse.text();
                        throw new Error(`API error (${fallbackResponse.status}): ${errorText}`);
                    }
                    return fallbackResponse.json();
                } catch (fallbackError) {
                    console.error('Fallback also failed:', fallbackError);
                }
            }
            
            // If mock data is enabled and there's an error, return mock data
            if (ApiService.useMockData) {
                console.log('Falling back to mock data');
                if (endpoint.includes('/connections')) {
                    return generateMockConnections(20) as unknown as T;
                } else if (endpoint.includes('/stats')) {
                    return generateMockStats() as unknown as T;
                } else if (endpoint.includes('/top/protocols')) {
                    return { 
                        'TCP': 120, 
                        'UDP': 85, 
                        'ICMP': 30 
                    } as unknown as T;
                } else if (endpoint.includes('/top/applications')) {
                    return { 
                        'HTTP': 100, 
                        'HTTPS': 85, 
                        'SSH': 45, 
                        'DNS': 30 
                    } as unknown as T;
                }
            }
            
            throw error;
        }
    }

    static async getCurrentConnections(
        limit: number = 25,
        protocol?: string,
        application?: string
    ): Promise<Connection[]> {
        const params = new URLSearchParams();
        if (limit) params.append('limit', limit.toString());
        if (protocol) params.append('protocol', protocol);
        if (application) params.append('application', application);
        
        return this.fetchJson<Connection[]>(`/traffic/connections/current?${params.toString()}`);
    }

    static async getConnectionHistory(
        startTime: Date, 
        endTime: Date,
        limit: number = 100,
        protocol?: string,
        application?: string
    ): Promise<Connection[]> {
        const params = new URLSearchParams({
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            limit: limit.toString(),
        });
        
        if (protocol) params.append('protocol', protocol);
        if (application) params.append('application', application);
        
        return this.fetchJson<Connection[]>(`/traffic/connections/history?${params.toString()}`);
    }

    static async getCurrentStats(): Promise<TrafficStats> {
        return this.fetchJson<TrafficStats>('/traffic/stats/current');
    }

    static async getStatsHistory(
        startTime: Date, 
        endTime: Date,
        interval: string = '1m'
    ): Promise<TrafficStats[]> {
        const params = new URLSearchParams({
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            interval,
        });
        
        return this.fetchJson<TrafficStats[]>(`/traffic/stats/history?${params.toString()}`);
    }

    static async getTopApplications(
        duration: string = '5m', 
        limit: number = 10
    ): Promise<Record<string, number>> {
        const params = new URLSearchParams({
            duration,
            limit: limit.toString(),
        });
        
        return this.fetchJson<Record<string, number>>(`/traffic/top/applications?${params.toString()}`);
    }

    static async getTopProtocols(
        duration: string = '5m', 
        limit: number = 10
    ): Promise<Record<string, number>> {
        const params = new URLSearchParams({
            duration,
            limit: limit.toString(),
        });
        
        return this.fetchJson<Record<string, number>>(`/traffic/top/protocols?${params.toString()}`);
    }

    static async getGeoConnections(params: {
        country?: string;
        city?: string;
        limit?: number;
    } = {}): Promise<Connection[]> {
        const queryParams = new URLSearchParams();
        
        if (params.country) queryParams.append('country', params.country);
        if (params.city) queryParams.append('city', params.city);
        if (params.limit) queryParams.append('limit', params.limit.toString());
        
        return this.fetchJson<Connection[]>(`/traffic/geo/connections?${queryParams.toString()}`);
    }
} 