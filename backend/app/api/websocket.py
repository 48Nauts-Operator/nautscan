from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List, Dict
import asyncio
import json
from ..models.network import Connection, TrafficStats

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_types = {
            'traffic': [],  # For traffic data updates
            'stats': [],    # For statistics updates
            'alerts': []    # For security alerts
        }

    async def connect(self, websocket: WebSocket, connection_type: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        if connection_type in self.connection_types:
            self.connection_types[connection_type].append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        for connections in self.connection_types.values():
            if websocket in connections:
                connections.remove(websocket)

    async def broadcast_traffic(self, connection: Connection):
        """Broadcast new traffic data to all connected clients"""
        for connection in self.connection_types['traffic']:
            try:
                await connection.send_json(connection.dict())
            except WebSocketDisconnect:
                self.disconnect(connection)

    async def broadcast_stats(self, stats: TrafficStats):
        """Broadcast traffic statistics to all connected clients"""
        for connection in self.connection_types['stats']:
            try:
                await connection.send_json(stats.dict())
            except WebSocketDisconnect:
                self.disconnect(connection)

    async def broadcast_alert(self, alert: Dict):
        """Broadcast security alerts to all connected clients"""
        for connection in self.connection_types['alerts']:
            try:
                await connection.send_json(alert)
            except WebSocketDisconnect:
                self.disconnect(connection)

manager = ConnectionManager()

@router.websocket("/ws/traffic")
async def websocket_traffic(websocket: WebSocket):
    await manager.connect(websocket, 'traffic')
    try:
        while True:
            data = await websocket.receive_text()
            # Handle any client messages if needed
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.websocket("/ws/stats")
async def websocket_stats(websocket: WebSocket):
    await manager.connect(websocket, 'stats')
    try:
        while True:
            data = await websocket.receive_text()
            # Handle any client messages if needed
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await manager.connect(websocket, 'alerts')
    try:
        while True:
            data = await websocket.receive_text()
            # Handle any client messages if needed
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        manager.disconnect(websocket) 