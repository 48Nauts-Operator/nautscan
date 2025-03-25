import { Connection, TrafficStats, Alert, Location } from '../types/network';

const cities = [
    { city: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060 },
    { city: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
    { city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
    { city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
    { city: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 }
];

const protocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'DNS'];
const applications = ['Chrome', 'Firefox', 'Slack', 'Zoom', 'VS Code', 'Docker'];
const statuses: ('active' | 'closed' | 'blocked')[] = ['active', 'closed', 'blocked'];

function getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomLocation(): Location {
    const city = getRandomItem(cities);
    return {
        lat: city.lat,
        lng: city.lng,
        city: city.city,
        country: city.country
    };
}

function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateConnection(): Connection {
    return {
        id: Math.random().toString(36).substr(2, 9),
        source: getRandomLocation(),
        destination: getRandomLocation(),
        protocol: getRandomItem(protocols),
        source_port: getRandomInt(1024, 65535),
        destination_port: getRandomInt(1, 1024),
        bytes_sent: getRandomInt(1000, 1000000),
        bytes_received: getRandomInt(1000, 1000000),
        timestamp: new Date().toISOString(),
        duration: getRandomInt(0, 3600),
        application: Math.random() > 0.3 ? getRandomItem(applications) : undefined,
        status: getRandomItem(statuses)
    };
}

export function generateTrafficStats(): TrafficStats {
    return {
        total_connections: getRandomInt(100, 1000),
        active_connections: getRandomInt(10, 100),
        bytes_per_second: getRandomInt(1000, 10000000),
        total_bytes: getRandomInt(1000000, 1000000000),
        connections_per_second: Math.random() * 10,
        top_protocols: protocols.reduce((acc, protocol) => {
            acc[protocol] = getRandomInt(1, 100);
            return acc;
        }, {} as Record<string, number>),
        top_applications: applications.reduce((acc, app) => {
            acc[app] = getRandomInt(1, 50);
            return acc;
        }, {} as Record<string, number>),
        timestamp: new Date().toISOString()
    };
}

export function generateAlert(): Alert {
    const levels: Alert['level'][] = ['info', 'warning', 'error'];
    const categories: Alert['category'][] = ['security', 'performance', 'system'];
    const messages = [
        'High traffic detected',
        'New connection blocked',
        'System performance degraded',
        'Security scan completed',
        'Connection attempt from blocked IP'
    ];

    return {
        id: getRandomInt(1, 1000),
        timestamp: new Date().toISOString(),
        level: getRandomItem(levels),
        category: getRandomItem(categories),
        message: getRandomItem(messages),
        details: Math.random() > 0.5 ? {
            ip: '192.168.1.' + getRandomInt(1, 255),
            port: getRandomInt(1, 65535)
        } : undefined,
        connection_id: Math.random() > 0.5 ? Math.random().toString(36).substr(2, 9) : undefined
    };
} 