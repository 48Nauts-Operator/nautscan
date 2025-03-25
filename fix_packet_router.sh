#!/bin/bash

echo "==============================================="
echo "🛠️ NautScan Backend Router Fix Script 🛠️"
echo "==============================================="

echo "1️⃣ Creating simplified packet capture module..."
cat > temp_fix_packetcapture.py << 'EOF'
from scapy.all import get_if_list, conf, sniff, IP, TCP, UDP
import time
import queue
import logging
import threading
from typing import Dict, List, Optional, Callable, Any

logger = logging.getLogger(__name__)

class PacketCapture:
    def __init__(self):
        self.packet_queue = queue.Queue(maxsize=10000)
        self.is_capturing = False
        self.capture_thread = None
        self.start_time = None
        self.packet_count = 0
        self.byte_count = 0
        self.packet_stats = {
            'tcp_packets': 0,
            'udp_packets': 0,
            'icmp_packets': 0
        }
        self.settings = {
            'interface': None,
            'filter': None,
            'promisc': True,
            'monitor': False
        }

    def get_settings(self):
        """Get current packet capture settings."""
        return self.settings

    def update_settings(self, new_settings):
        """Update packet capture settings."""
        if new_settings:
            for key, value in new_settings.items():
                if key in self.settings and value is not None:
                    self.settings[key] = value
        return self.settings

    def start_capture(self, interface=None, settings=None):
        """Start packet capture on the specified interface."""
        if self.is_capturing:
            logger.warning("Packet capture already running")
            return False

        if settings:
            self.update_settings(settings)
        
        if interface:
            self.settings['interface'] = interface

        self.is_capturing = True
        self.start_time = time.time()
        self.packet_count = 0
        self.byte_count = 0
        self.packet_stats = {
            'tcp_packets': 0,
            'udp_packets': 0,
            'icmp_packets': 0
        }

        self.capture_thread = threading.Thread(target=self._capture_packets)
        self.capture_thread.daemon = True
        self.capture_thread.start()
        
        logger.info(f"Started packet capture on interface: {self.settings['interface'] or 'any'}")
        return True

    def stop_capture(self):
        """Stop packet capture."""
        if not self.is_capturing:
            logger.warning("No packet capture running")
            return False

        self.is_capturing = False
        if self.capture_thread:
            self.capture_thread.join(timeout=2.0)
            self.capture_thread = None
        
        logger.info("Stopped packet capture")
        return True

    def _capture_packets(self):
        """Packet capture thread function."""
        try:
            # Define the packet handler function inside to access self
            def packet_handler(packet):
                if not self.is_capturing:
                    return
                
                if IP in packet:
                    # Extract basic packet info
                    packet_info = {
                        'source': packet[IP].src,
                        'destination': packet[IP].dst,
                        'protocol': packet[IP].proto,
                        'length': len(packet),
                        'time': time.time()
                    }
                    
                    # Add port information if available
                    if TCP in packet:
                        packet_info['source_port'] = packet[TCP].sport
                        packet_info['destination_port'] = packet[TCP].dport
                        packet_info['protocol_name'] = 'TCP'
                        self.packet_stats['tcp_packets'] += 1
                    elif UDP in packet:
                        packet_info['source_port'] = packet[UDP].sport
                        packet_info['destination_port'] = packet[UDP].dport
                        packet_info['protocol_name'] = 'UDP'
                        self.packet_stats['udp_packets'] += 1
                    else:
                        # ICMP or other
                        packet_info['protocol_name'] = 'Other'
                        if packet[IP].proto == 1:  # ICMP
                            self.packet_stats['icmp_packets'] += 1
                    
                    # Simple application protocol detection
                    if 'source_port' in packet_info or 'destination_port' in packet_info:
                        src_port = packet_info.get('source_port', 0)
                        dst_port = packet_info.get('destination_port', 0)
                        
                        if dst_port == 80 or src_port == 80:
                            packet_info['application'] = 'HTTP'
                        elif dst_port == 443 or src_port == 443:
                            packet_info['application'] = 'HTTPS'
                        elif dst_port == 53 or src_port == 53:
                            packet_info['application'] = 'DNS'
                        elif dst_port == 22 or src_port == 22:
                            packet_info['application'] = 'SSH'
                        elif dst_port == 25 or src_port == 25:
                            packet_info['application'] = 'SMTP'
                    
                    # Update counters
                    self.packet_count += 1
                    self.byte_count += len(packet)
                    
                    # Add to queue, dropping oldest if full
                    if self.packet_queue.full():
                        try:
                            self.packet_queue.get_nowait()
                        except queue.Empty:
                            pass
                    
                    try:
                        self.packet_queue.put_nowait(packet_info)
                    except queue.Full:
                        pass

            # Start packet capture
            iface = self.settings['interface'] if self.settings['interface'] not in [None, 'any'] else None
            filter_str = self.settings['filter']
            
            # Use small count values and loop to allow for clean shutdown
            while self.is_capturing:
                try:
                    sniff(
                        iface=iface,
                        filter=filter_str,
                        prn=packet_handler,
                        store=False,
                        count=10,
                        timeout=1,
                        monitor=self.settings['monitor']
                    )
                except Exception as e:
                    logger.error(f"Error in packet capture: {e}")
                    time.sleep(1)  # Prevent CPU spin if persistent error
                    
        except Exception as e:
            logger.error(f"Exception in capture thread: {e}")
            self.is_capturing = False

    def get_recent_packets(self, limit: int = 100) -> List[Dict]:
        """Get recent packets from the queue."""
        packets = []
        try:
            for _ in range(min(limit, self.packet_queue.qsize())):
                if not self.packet_queue.empty():
                    packets.append(self.packet_queue.get_nowait())
                else:
                    break
        except queue.Empty:
            pass
        
        # Return packets in reverse order (newest first)
        return list(reversed(packets))

    def get_statistics(self) -> Dict:
        """Get packet capture statistics."""
        current_time = time.time()
        duration = current_time - (self.start_time or current_time)
        
        if duration <= 0:
            duration = 0.001  # Prevent division by zero
        
        return {
            'total_packets': self.packet_count,
            'tcp_packets': self.packet_stats['tcp_packets'],
            'udp_packets': self.packet_stats['udp_packets'],
            'icmp_packets': self.packet_stats['icmp_packets'],
            'bytes_received': self.byte_count,
            'packets_per_second': self.packet_count / duration,
            'bytes_per_second': self.byte_count / duration,
            'is_capturing': self.is_capturing
        }
EOF

echo "2️⃣ Creating simplified packets router..."
cat > temp_fix_packets.py << 'EOF'
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, status, Query, WebSocket, Path
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

@router.post("/start")
async def start_capture(control: CaptureControl = None):
    """Start packet capture."""
    if packet_capture.is_capturing:
        raise HTTPException(status_code=400, detail="Packet capture is already running")
    
    try:
        interface = control.interface if control and control.interface else None
        settings = control.settings if control and control.settings else None
        packet_capture.start_capture(interface=interface, settings=settings)
        return {"message": "Packet capture started successfully"}
    except Exception as e:
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

@router.get("/list")
async def list_packets(limit: int = 100) -> List[Dict]:
    """Get list of captured packets."""
    return packet_capture.get_recent_packets(limit)

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time packet monitoring."""
    await websocket.accept()
    try:
        while True:
            stats = packet_capture.get_statistics()
            await websocket.send_text(json.dumps(stats))
            await asyncio.sleep(1)
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()

@router.get("/recent")
async def get_recent_packets(
    limit: int = Query(default=100, le=1000)
) -> List[dict]:
    """Get recent packets."""
    try:
        packets = packet_capture.get_recent_packets(limit=limit)
        return packets
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get recent packets: {str(e)}"
        )

@router.get("/statistics")
async def get_statistics() -> Dict:
    """Get packet capture statistics."""
    return packet_capture.get_statistics()

@router.get("/settings")
async def get_capture_settings():
    """Get current packet capture settings."""
    try:
        return packet_capture.get_settings()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting settings: {str(e)}")

@router.post("/settings")
async def update_capture_settings(settings: dict):
    """Update packet capture settings."""
    try:
        packet_capture.update_settings(settings)
        return {"message": "Settings updated successfully", "settings": packet_capture.get_settings()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating settings: {str(e)}")

@router.get("/db")
async def get_packets_from_db(
    limit: int = Query(100, gt=0, le=1000),
    offset: int = Query(0, ge=0),
    protocol: Optional[str] = None,
    source_ip: Optional[str] = None,
    destination_ip: Optional[str] = None
):
    """Mock implementation for database packets API."""
    try:
        # This is a mock implementation - returns empty data
        return {
            "packets": [],
            "total": 0,
            "limit": limit,
            "offset": offset,
            "message": "Database integration is not implemented in this version."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving packets: {str(e)}")
EOF

echo "3️⃣ Copying fix files to the backend container..."
docker cp temp_fix_packetcapture.py webapp_nautscan-backend-1:/app/app/core/packet_capture.py
docker cp temp_fix_packets.py webapp_nautscan-backend-1:/app/app/api/packets.py

echo "4️⃣ Restarting backend service..."
docker restart webapp_nautscan-backend-1

echo "5️⃣ Waiting for service to restart (10 seconds)..."
sleep 10

echo "6️⃣ Checking container status..."
docker ps | grep webapp_nautscan-backend

echo "7️⃣ Testing backend API endpoints..."
echo ""
echo "Testing health endpoint:"
curl -s http://localhost:8000/health
echo ""
echo ""
echo "Testing interfaces endpoint:"
curl -s http://localhost:8000/api/packets/interfaces
echo ""

echo "✅ Backend fix completed! The API endpoints should now work correctly."
echo "   Please refresh your browser and try the application again."

# Clean up temporary files
rm -f temp_fix_packetcapture.py temp_fix_packets.py 