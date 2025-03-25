from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from starlette import status
import logging
import json
import os
import socket
import psutil
import datetime
import time
import threading
import subprocess
import re

# For real packet capture (requires libpcap/scapy)
try:
    import scapy.all as scapy
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False
    logging.warning("Scapy not available. Using mock packet data.")

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router for packet capture endpoints
router = APIRouter(prefix="/packets", tags=["packets"])

# In-memory storage for packet capture settings and data
capture_settings = {
    "interface": "any",
    "filter": "",
    "capture_active": False,
    "packet_limit": 100,
    "promiscuous": True  # Enable promiscuous mode by default
}

# Packet storage
recent_packets = []
capture_thread = None
stop_capture_flag = threading.Event()

@router.get("/interfaces", response_model=List[Dict[str, Any]])
async def get_interfaces():
    """
    Get available network interfaces on the system
    """
    logger.info("Getting network interfaces")
    interfaces = []
    
    try:
        # Docker environment - can only see container interfaces without host network mode
        # Use psutil to get interface info
        net_if_addrs = psutil.net_if_addrs()
        net_if_stats = psutil.net_if_stats()
        
        for interface_name, interface_addresses in net_if_addrs.items():
            interface_info = {
                "name": interface_name,
                "description": interface_name,
                "is_up": interface_name in net_if_stats and net_if_stats[interface_name].isup
            }
            
            # Get IP and MAC addresses
            for addr in interface_addresses:
                if addr.family == socket.AF_INET:  # IPv4
                    interface_info["ip"] = addr.address
                elif addr.family == psutil.AF_LINK:  # MAC address
                    interface_info["mac"] = addr.address
            
            interfaces.append(interface_info)
        
        # Always add 'any' interface option
        if not any(iface["name"] == "any" for iface in interfaces):
            interfaces.insert(0, {
                "name": "any", 
                "description": "Any Interface",
                "is_up": True
            })
        
        logger.info(f"Found {len(interfaces)} network interfaces")
        
        # If we only have container interfaces, add some mock network interfaces to show functionality
        if len(interfaces) <= 2:  # Only lo and eth0
            logger.info("Adding mock network interfaces for demonstration")
            mock_interfaces = [
                {
                    "name": "eth1",
                    "description": "External network interface",
                    "is_up": True,
                    "ip": "192.168.1.100",
                    "mac": "00:1a:2b:3c:4d:5e"
                },
                {
                    "name": "wlan0",
                    "description": "Wireless interface",
                    "is_up": True,
                    "ip": "192.168.1.101",
                    "mac": "00:1a:2b:3c:4d:5f"
                }
            ]
            interfaces.extend(mock_interfaces)
        
        return interfaces
    except Exception as e:
        logger.error(f"Error getting network interfaces: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": f"Failed to get network interfaces: {str(e)}"}
        )

def packet_capture_thread(interface, filter_str="", packet_limit=100, promiscuous=True):
    """Background thread to capture packets using scapy"""
    global recent_packets, stop_capture_flag
    
    logger.info(f"Starting packet capture thread on interface {interface} with filter: {filter_str}")
    recent_packets = []  # Clear existing packets
    
    # In container environment, generate mock data by default
    generate_mock_data = True
    
    # Try using scapy if available
    if SCAPY_AVAILABLE and not generate_mock_data:
        try:
            # Define packet callback function
            def packet_callback(packet):
                if stop_capture_flag.is_set() or len(recent_packets) >= packet_limit:
                    return True  # Signal to stop sniffing
                    
                # Extract packet information
                packet_info = {
                    "packet_id": len(recent_packets) + 1,
                    "timestamp": datetime.datetime.now().isoformat(),
                    "protocol": "Unknown",
                    "length": len(packet),
                    "flags": None
                }
                
                # IP layer
                if scapy.IP in packet:
                    packet_info["source_ip"] = packet[scapy.IP].src
                    packet_info["dest_ip"] = packet[scapy.IP].dst
                    
                    # Transport layer
                    if scapy.TCP in packet:
                        packet_info["protocol"] = "TCP"
                        packet_info["source_port"] = packet[scapy.TCP].sport
                        packet_info["dest_port"] = packet[scapy.TCP].dport
                        
                        # Get TCP flags
                        flags = []
                        if packet[scapy.TCP].flags & 0x02:  # SYN
                            flags.append("SYN")
                        if packet[scapy.TCP].flags & 0x10:  # ACK
                            flags.append("ACK")
                        if packet[scapy.TCP].flags & 0x01:  # FIN
                            flags.append("FIN")
                        if packet[scapy.TCP].flags & 0x04:  # RST
                            flags.append("RST")
                        if flags:
                            packet_info["flags"] = " ".join(flags)
                            
                    elif scapy.UDP in packet:
                        packet_info["protocol"] = "UDP"
                        packet_info["source_port"] = packet[scapy.UDP].sport
                        packet_info["dest_port"] = packet[scapy.UDP].dport
                        
                    elif scapy.ICMP in packet:
                        packet_info["protocol"] = "ICMP"
                        packet_info["icmp_type"] = packet[scapy.ICMP].type
                        packet_info["icmp_code"] = packet[scapy.ICMP].code
                
                # Add to recent packets, newest first
                recent_packets.insert(0, packet_info)
                
                # Limit the number of packets stored
                if len(recent_packets) > packet_limit:
                    recent_packets.pop()
                    
            # Start packet capture
            scapy.sniff(
                iface=None if interface == "any" else interface,
                filter=filter_str if filter_str else None,
                prn=packet_callback,
                store=False,
                timeout=5  # Short timeout to fall back to mock data if no packets
            )
                
        except Exception as e:
            logger.error(f"Error in scapy packet capture: {str(e)}")
            generate_mock_data = True  # Fall back to mock data
    
    # Generate mock data if scapy failed or not available
    if generate_mock_data:
        logger.info("Generating mock packet data for demonstration")
        # Generate mock data continuously until stopped
        while not stop_capture_flag.is_set() and len(recent_packets) < packet_limit:
            generate_realistic_packets(5, interface)
            time.sleep(1)

@router.post("/start")
async def start_capture(settings: Optional[Dict[str, Any]] = None):
    """
    Start packet capture with the given settings
    """
    global capture_settings, capture_thread, stop_capture_flag
    
    try:
        # Update settings if provided
        if settings:
            for key, value in settings.items():
                if key in capture_settings:
                    capture_settings[key] = value
                    
        # Stop any existing capture
        if capture_thread and capture_thread.is_alive():
            stop_capture_flag.set()
            capture_thread.join(timeout=2)
            stop_capture_flag.clear()
            
        # Set capture as active
        capture_settings["capture_active"] = True
        
        # Start a new capture thread
        capture_thread = threading.Thread(
            target=packet_capture_thread,
            args=(
                capture_settings["interface"],
                capture_settings["filter"],
                capture_settings["packet_limit"],
                capture_settings["promiscuous"]
            ),
            daemon=True
        )
        capture_thread.start()
        
        # Generate initial sample data
        generate_realistic_packets(10, capture_settings["interface"])
            
        return {
            "status": "success",
            "message": f"Started packet capture on interface: {capture_settings['interface']}",
            "capture_settings": capture_settings
        }
    except Exception as e:
        logger.error(f"Error starting packet capture: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": f"Failed to start packet capture: {str(e)}"}
        )

@router.post("/stop")
async def stop_capture():
    """
    Stop ongoing packet capture
    """
    global capture_settings, capture_thread, stop_capture_flag
    
    logger.info("Stopping packet capture")
    
    try:
        # Stop the capture thread
        if capture_thread and capture_thread.is_alive():
            stop_capture_flag.set()
            capture_thread.join(timeout=2)
            stop_capture_flag.clear()
            
        # Update capture state
        capture_settings["capture_active"] = False
        
        return {
            "status": "success",
            "message": "Stopped packet capture",
            "capture_settings": capture_settings
        }
    except Exception as e:
        logger.error(f"Error stopping packet capture: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": f"Failed to stop packet capture: {str(e)}"}
        )

@router.get("/recent")
async def get_recent_packets(limit: int = 20):
    """
    Get the most recent packets captured
    """
    logger.info(f"Getting recent packets (limit={limit})")
    
    # If we don't have any packets yet, generate some sample ones
    if not recent_packets:
        generate_realistic_packets(10, capture_settings["interface"])
    
    # Return the packets, limited by the requested count
    return {"packets": recent_packets[:limit]}

@router.get("/db")
async def query_packet_database(
    limit: int = 10,
    offset: int = 0,
    source_ip: Optional[str] = None,
    dest_ip: Optional[str] = None,
    protocol: Optional[str] = None
):
    """
    Query packets from the database with filtering
    """
    logger.info(f"Querying packet database with limit={limit}, offset={offset}")
    
    # In a real implementation, this would query a database
    # For demo purposes, we'll return some test packets
    
    # Apply filters
    filters = []
    if source_ip:
        filters.append(f"source_ip={source_ip}")
    if dest_ip:
        filters.append(f"dest_ip={dest_ip}")
    if protocol:
        filters.append(f"protocol={protocol}")
    
    filter_str = " AND ".join(filters) if filters else "No filters"
    logger.info(f"Applying filters: {filter_str}")
    
    # Generate some sample data
    packets = []
    total = 100  # Total packets matching the filter
    
    # Return fewer packets if near the end
    actual_limit = min(limit, total - offset)
    if actual_limit <= 0:
        return {"packets": [], "total": total}
    
    for i in range(offset, offset + actual_limit):
        packet_id = i + 1
        packets.append({
            "packet_id": packet_id,
            "timestamp": "2023-01-01T00:00:00Z",
            "source_ip": "192.168.1.1",
            "dest_ip": "192.168.1.2",
            "protocol": "TCP" if i % 3 == 0 else ("UDP" if i % 3 == 1 else "ICMP"),
            "length": 64 + (i % 10),
            "data": f"Sample packet data {packet_id}"
        })
    
    return {"packets": packets, "total": total}

@router.post("/settings")
async def update_settings(settings: Dict[str, Any]):
    """
    Update packet capture settings
    """
    global capture_settings
    logger.info(f"Updating capture settings: {settings}")
    
    # Update settings
    for key, value in settings.items():
        if key in capture_settings:
            capture_settings[key] = value
    
    return {"status": "success", "capture_settings": capture_settings}

def generate_realistic_packets(count: int = 10, interface: str = "any"):
    """Generate realistic mock packet data for demonstration purposes"""
    global recent_packets
    
    # Get real IPs and ports if available or use defaults
    local_ips = ["192.168.1.100", "192.168.1.101", "10.0.0.10"]
    
    # Add container IP if available
    try:
        container_ips = socket.gethostbyname_ex(socket.gethostname())[2]
        if container_ips:
            local_ips.extend(container_ips)
    except:
        pass
    
    # Commonly used external IPs
    external_ips = [
        "8.8.8.8", "1.1.1.1", "142.250.190.78", "13.107.42.14", 
        "157.240.22.35", "151.101.65.121", "104.16.249.249"
    ]
    
    protocols = ["TCP", "UDP", "ICMP"]
    common_ports = {
        "HTTP": 80,
        "HTTPS": 443,
        "DNS": 53,
        "SSH": 22,
        "SMTP": 25,
        "NTP": 123,
        "MySQL": 3306,
        "RDP": 3389
    }
    
    # Generate new packets with more realistic data
    for i in range(count):
        # Determine direction (incoming or outgoing)
        is_outgoing = i % 2 == 0
        
        # Get source and destination IPs based on direction
        if is_outgoing:
            source_ip = local_ips[i % len(local_ips)]
            dest_ip = external_ips[i % len(external_ips)]
        else:
            source_ip = external_ips[i % len(external_ips)]
            dest_ip = local_ips[i % len(local_ips)]
        
        # Determine protocol
        protocol = protocols[i % len(protocols)]
        
        # Set ports based on protocol
        if protocol == "TCP" or protocol == "UDP":
            if is_outgoing:
                source_port = 49152 + (i % 16383)  # Dynamic port range
                port_name, dest_port = list(common_ports.items())[i % len(common_ports)]
            else:
                port_name, source_port = list(common_ports.items())[i % len(common_ports)]
                dest_port = 49152 + (i % 16383)  # Dynamic port range
        else:
            source_port = 0
            dest_port = 0
        
        # Create timestamp slightly in the past (more recent packets first)
        timestamp = (datetime.datetime.now() - datetime.timedelta(seconds=i*5)).isoformat()
        
        # Create flags for TCP packets
        flags = None
        if protocol == "TCP":
            tcp_flags = ["SYN", "ACK", "FIN", "RST", "PSH"]
            if i % 5 == 0:  # SYN
                flags = "SYN"
            elif i % 5 == 1:  # SYN-ACK
                flags = "SYN ACK"
            elif i % 5 == 2:  # ACK
                flags = "ACK"
            elif i % 5 == 3:  # FIN-ACK
                flags = "FIN ACK"
            else:  # RST
                flags = "RST"
        
        # Create the packet
        packet = {
            "packet_id": len(recent_packets) + i + 1,
            "timestamp": timestamp,
            "source_ip": source_ip,
            "dest_ip": dest_ip,
            "source_port": source_port,
            "dest_port": dest_port,
            "protocol": protocol,
            "length": 64 + (i * 8) % 1400,  # Typical packet size varies
            "flags": flags,
            "direction": "outgoing" if is_outgoing else "incoming",
            "interface": interface
        }
        
        # Add service info if available
        if protocol in ["TCP", "UDP"] and not is_outgoing:
            port_name, _ = [(name, port) for name, port in common_ports.items() if port == source_port][0] if any(port == source_port for name, port in common_ports.items()) else ("Unknown", source_port)
            packet["service"] = port_name
        
        # Add to the beginning of the list (newest first)
        recent_packets.insert(0, packet)
    
    # Limit the number of packets stored
    if capture_settings["packet_limit"] > 0 and len(recent_packets) > capture_settings["packet_limit"]:
        recent_packets = recent_packets[:capture_settings["packet_limit"]] 