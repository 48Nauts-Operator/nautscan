import { generateConnection, generateTrafficStats, generateAlert } from '../mocks/mockData';
import { Connection, TrafficStats, Alert } from '../types/network';

class MockWebSocket {
    private callbacks: { [key: string]: ((event: any) => void)[] } = {};
    private interval: NodeJS.Timeout | null = null;

    constructor(private type: 'traffic' | 'stats' | 'alerts') {
        this.startEmitting();
    }

    addEventListener(event: string, callback: (event: any) => void) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    removeEventListener(event: string, callback: (event: any) => void) {
        if (this.callbacks[event]) {
            this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
        }
    }

    close() {
        if (this.interval) {
            clearInterval(this.interval);
        }
    }

    private emit(event: string, data: any) {
        if (this.callbacks[event]) {
            const messageEvent = { data: JSON.stringify(data) };
            this.callbacks[event].forEach(callback => callback(messageEvent));
        }
    }

    private startEmitting() {
        const interval = this.type === 'stats' ? 1000 : 2000;
        
        this.interval = setInterval(() => {
            let data;
            switch (this.type) {
                case 'traffic':
                    data = generateConnection();
                    break;
                case 'stats':
                    data = generateTrafficStats();
                    break;
                case 'alerts':
                    if (Math.random() > 0.7) { // Generate alerts less frequently
                        data = generateAlert();
                    }
                    break;
            }
            if (data) {
                this.emit('message', data);
            }
        }, interval);
    }
}

export function createMockWebSocket(url: string): WebSocket {
    const type = url.includes('traffic') ? 'traffic' 
               : url.includes('stats') ? 'stats'
               : 'alerts';
    return new MockWebSocket(type) as unknown as WebSocket;
}

export async function mockFetchJson<T>(endpoint: string): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    if (endpoint.includes('history')) {
        if (endpoint.includes('traffic')) {
            return Array.from({ length: 20 }, generateConnection) as unknown as T;
        } else if (endpoint.includes('stats')) {
            return Array.from({ length: 60 }, generateTrafficStats) as unknown as T;
        }
    } else if (endpoint.includes('alerts')) {
        return Array.from({ length: 10 }, generateAlert) as unknown as T;
    }

    throw new Error('Unknown endpoint');
} 