#!/bin/bash

echo "==============================================="
echo "🛠️ NautScan Packet Capture Test Script 🛠️"
echo "==============================================="

echo "1️⃣ Testing the packet capture endpoint directly..."
curl -v -X POST -H "Content-Type: application/json" -d '{"interface":"eth0"}' http://localhost:8000/api/packets/start

echo ""
echo "2️⃣ Adding special handler for packet capture in packets.py..."
cat > temp_fix_packets_start.py << 'EOF'
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status, Query, WebSocket, Path, Request
from pydantic import BaseModel
from scapy.all import sniff, IP, get_if_list, conf
import asyncio
import json
from datetime import datetime, timedelta

# Import the packet capture class
from app.core.packet_capture import PacketCapture

router = APIRouter()
packet_capture = PacketCapture()

# Define API models
class CaptureControl(BaseModel):
    interface: Optional[str] = None
    settings: Optional[dict] = None

@router.get("/interfaces")
async def get_interfaces():
    """Get list of network interfaces available for packet capture."""
    try:
        interfaces = []
        for iface_name in get_if_list():
            interfaces.append({
                'name': iface_name,
                'description': iface_name
            })
        return interfaces
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting interfaces: {str(e)}")

# Handle both POST and OPTIONS for /start to properly support CORS
@router.options("/start")
async def options_start_capture():
    """Handle OPTIONS request for CORS."""
    return {}

@router.post("/start")
async def start_capture(control: Optional[CaptureControl] = None, request: Request = None):
    """Start packet capture."""
    try:
        # Debug log to see what's being received
        print(f"Received start capture request: {control}")
        
        # Handle the case when control is None (empty request)
        if not control:
            if request:
                try:
                    body = await request.json()
                    interface = body.get("interface")
                    settings = body.get("settings")
                except Exception as e:
                    print(f"Failed to parse request body: {e}")
                    interface = "any"  # Default fallback
                    settings = None
            else:
                interface = "any"  # Default fallback
                settings = None
        else:
            interface = control.interface if control and control.interface else "any"
            settings = control.settings if control and control.settings else None
        
        # Prevent starting if already running
        if packet_capture.is_capturing:
            # Just return success if already running - prevents errors on double-click
            return {"message": "Packet capture already running", "status": "active"}
        
        # Start the packet capture
        success = packet_capture.start_capture(interface=interface, settings=settings)
        if success:
            return {"message": "Packet capture started successfully", "interface": interface}
        else:
            raise HTTPException(status_code=500, detail="Failed to start packet capture")
    except Exception as e:
        print(f"Error in start_capture: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop")
async def stop_capture():
    """Stop packet capture."""
    if not packet_capture.is_capturing:
        raise HTTPException(status_code=400, detail="No packet capture running")
    
    try:
        packet_capture.stop_capture()
        return {"message": "Packet capture stopped successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rest of the file remains unchanged...
EOF

# Add the rest of the original packets.py file
tail -n +70 temp_fix_packets.py >> temp_fix_packets_start.py

echo "3️⃣ Copying the updated packets.py to the backend container..."
docker cp temp_fix_packets_start.py webapp_nautscan-backend-1:/app/app/api/packets.py

echo "4️⃣ Restarting the backend service..."
docker restart webapp_nautscan-backend-1

echo "5️⃣ Waiting for services to restart (10 seconds)..."
sleep 10

echo "6️⃣ Testing the updated packet capture endpoint..."
curl -v -X POST -H "Content-Type: application/json" -d '{"interface":"eth0"}' http://localhost:8000/api/packets/start

echo ""
echo "✅ Packet capture endpoint should now be fixed and functioning properly."
echo "   Please refresh your browser and try the application again."

# Clean up temporary files
rm -f temp_fix_packets_start.py 