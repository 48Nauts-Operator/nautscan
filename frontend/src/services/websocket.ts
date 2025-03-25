import { Connection, TrafficStats } from '../types/network';

export class WebSocketService {
    private trafficSocket: WebSocket | null = null;
    private statsSocket: WebSocket | null = null;
    private alertsSocket: WebSocket | null = null;

    private getWebSocketUrl(path: string): string {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}${path}`;
    }

    setupTrafficSocket(onMessage: (data: Connection) => void) {
        if (this.trafficSocket?.readyState === WebSocket.OPEN) return;
        
        console.log('Setting up traffic WebSocket connection...');
        this.trafficSocket = new WebSocket(this.getWebSocketUrl('/ws/traffic'));
        
        this.trafficSocket.onopen = () => {
            console.log('Traffic WebSocket connected');
        };
        
        this.trafficSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            onMessage(data);
        };
        
        this.trafficSocket.onerror = (error) => {
            console.error('Traffic WebSocket error:', error);
        };
        
        this.trafficSocket.onclose = () => {
            console.log('Traffic WebSocket closed');
            setTimeout(() => this.setupTrafficSocket(onMessage), 1000);
        };
    }

    setupStatsSocket(onMessage: (data: TrafficStats) => void) {
        if (this.statsSocket?.readyState === WebSocket.OPEN) return;
        
        console.log('Setting up stats WebSocket connection...');
        this.statsSocket = new WebSocket(this.getWebSocketUrl('/ws/stats'));
        
        this.statsSocket.onopen = () => {
            console.log('Stats WebSocket connected');
        };
        
        this.statsSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            onMessage(data);
        };
        
        this.statsSocket.onerror = (error) => {
            console.error('Stats WebSocket error:', error);
        };
        
        this.statsSocket.onclose = () => {
            console.log('Stats WebSocket closed');
            setTimeout(() => this.setupStatsSocket(onMessage), 1000);
        };
    }

    setupAlertsSocket(onMessage: (data: any) => void) {
        if (this.alertsSocket?.readyState === WebSocket.OPEN) return;
        
        console.log('Setting up alerts WebSocket connection...');
        this.alertsSocket = new WebSocket(this.getWebSocketUrl('/ws/alerts'));
        
        this.alertsSocket.onopen = () => {
            console.log('Alerts WebSocket connected');
        };
        
        this.alertsSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            onMessage(data);
        };
        
        this.alertsSocket.onerror = (error) => {
            console.error('Alerts WebSocket error:', error);
        };
        
        this.alertsSocket.onclose = () => {
            console.log('Alerts WebSocket closed');
            setTimeout(() => this.setupAlertsSocket(onMessage), 1000);
        };
    }

    cleanup() {
        if (this.trafficSocket) {
            this.trafficSocket.close();
            this.trafficSocket = null;
        }
        if (this.statsSocket) {
            this.statsSocket.close();
            this.statsSocket = null;
        }
        if (this.alertsSocket) {
            this.alertsSocket.close();
            this.alertsSocket = null;
        }
    }
} 