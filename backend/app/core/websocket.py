from typing import Dict, Set
from fastapi import WebSocket
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "processes": set(),
            "packets": set(),
            "system": set()
        }

    async def connect(self, websocket: WebSocket, channel: str):
        """Connect a client to a specific channel."""
        await websocket.accept()
        if channel in self.active_connections:
            self.active_connections[channel].add(websocket)
            logger.info(f"Client connected to channel: {channel}")

    async def disconnect(self, websocket: WebSocket, channel: str):
        """Disconnect a client from a specific channel."""
        if channel in self.active_connections:
            self.active_connections[channel].discard(websocket)
            logger.info(f"Client disconnected from channel: {channel}")

    async def broadcast(self, channel: str, message: dict):
        """Broadcast a message to all clients in a channel."""
        if channel not in self.active_connections:
            return

        # Add timestamp to message
        message["timestamp"] = datetime.now().isoformat()

        # Broadcast to all connected clients in the channel
        disconnected = set()
        for connection in self.active_connections[channel]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.add(connection)

        # Remove disconnected clients
        for connection in disconnected:
            self.active_connections[channel].discard(connection)

    async def send_personal_message(self, websocket: WebSocket, message: dict):
        """Send a message to a specific client."""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")

# Create global WebSocket manager instance
websocket_manager = WebSocketManager() 