export interface Location {
    lat: number;
    lng: number;
    city?: string;
    country?: string;
    ip?: string;
}

export interface Connection {
    id: string;
    source: Location;
    destination: Location;
    protocol: string;
    source_port: number;
    destination_port: number;
    source_device_name?: string;
    destination_device_name?: string;
    bytes_sent: number;
    bytes_received: number;
    timestamp: string;
    duration?: number;
    application?: string;
    status: 'active' | 'closed' | 'blocked';
}

export interface TrafficStats {
    total_connections: number;
    active_connections: number;
    bytes_per_second: number;
    total_bytes: number;
    connections_per_second: number;
    top_protocols: Record<string, number>;
    top_applications: Record<string, number>;
    timestamp: string;
}

export interface Alert {
    id: number;
    timestamp: string;
    level: 'info' | 'warning' | 'error';
    category: 'security' | 'performance' | 'system';
    message: string;
    details?: Record<string, any>;
    connection_id?: string;
} 