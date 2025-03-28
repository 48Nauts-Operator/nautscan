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

# Set up logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# For real packet capture (requires libpcap/scapy)
try:
    import scapy.all as scapy
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False
    logger.warning("Scapy not available. Using mock packet data.")

# Check for host capture file environment variable
HOST_CAPTURE_FILE = os.environ.get('HOST_CAPTURE_FILE', None)
if HOST_CAPTURE_FILE and os.path.exists(HOST_CAPTURE_FILE):
    logger.info(f"Found host capture file at {HOST_CAPTURE_FILE}")
    HOST_CAPTURE_AVAILABLE = True
else:
    HOST_CAPTURE_AVAILABLE = False
    logger.info("Host capture file not found or not configured")

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

def get_host_interfaces():
    """Get network interfaces from the host machine"""
    interfaces = []
    
    # Check if we're running with host network access
    host_network = os.environ.get('HOST_NETWORK', 'false').lower() == 'true'
    logger.info(f"HOST_NETWORK flag: {host_network}")
    
    # Try to get host interfaces directly from the host
    try:
        if host_network and os.path.exists('/host/proc/net/dev'):
            # Reading directly from the host's proc filesystem
            logger.info("Reading network interfaces from host proc filesystem")
            with open('/host/proc/net/dev', 'r') as f:
                lines = f.readlines()
                
            # Skip header lines
            for line in lines[2:]:
                parts = line.strip().split(':')
                if len(parts) < 2:
                    continue
                    
                interface_name = parts[0].strip()
                
                # Skip loopback and Docker interfaces
                if interface_name == 'lo' or interface_name.startswith('docker') or interface_name.startswith('br-') or interface_name.startswith('veth'):
                    continue
                    
                interface_info = {
                    "name": interface_name,
                    "description": f"Host interface: {interface_name}",
                    "is_up": True,  # We can't tell from /proc/net/dev, assuming up
                }
                
                interfaces.append(interface_info)
            
            logger.info(f"Found {len(interfaces)} host interfaces")
        
        # Fall back to running ifconfig if not using host network or if no interfaces found
        if not interfaces:
            logger.info("Using ifconfig to discover interfaces")
            if os.path.exists('/Users'):  # Check if running on macOS
                interfaces_raw = subprocess.check_output(["ifconfig"]).decode('utf-8')
            else:
                interfaces_raw = subprocess.check_output(["ifconfig"]).decode('utf-8')
                
            interface_sections = interfaces_raw.split('\n\n')
            
            for section in interface_sections:
                if not section.strip():
                    continue
                    
                # Extract interface name
                name_match = re.match(r'^(\w+):', section.split('\n')[0])
                if not name_match:
                    continue
                    
                interface_name = name_match.group(1)
                
                # Skip loopback and Docker interfaces
                if interface_name == 'lo' or interface_name.startswith('docker') or interface_name.startswith('br-') or interface_name.startswith('veth'):
                    continue
                    
                interface_info = {
                    "name": interface_name,
                    "description": interface_name,
                    "is_up": True,
                }
                
                # Extract IP address if present
                ip_match = re.search(r'inet (\d+\.\d+\.\d+\.\d+)', section)
                if ip_match:
                    interface_info["ip"] = ip_match.group(1)
                
                # Extract MAC address if present
                mac_match = re.search(r'ether ([0-9a-f:]+)', section)
                if mac_match:
                    interface_info["mac"] = mac_match.group(1)
                    
                interfaces.append(interface_info)
            
    except Exception as e:
        logger.error(f"Error getting network interfaces: {e}")
        # If we fail, try backup method using scapy
        if SCAPY_AVAILABLE:
            try:
                for iface in scapy.get_if_list():
                    # Skip loopback and Docker interfaces
                    if iface == 'lo' or iface.startswith('docker') or iface.startswith('br-') or iface.startswith('veth'):
                        continue
                    
                    interface_info = {
                        "name": iface,
                        "description": iface,
                        "is_up": True,
                    }
                    
                    try:
                        interface_info["mac"] = scapy.get_if_hwaddr(iface)
                        ip = scapy.get_if_addr(iface)
                        if ip != '0.0.0.0':
                            interface_info["ip"] = ip
                    except:
                        pass
                        
                    interfaces.append(interface_info)
            except Exception as scapy_error:
                logger.error(f"Error getting interfaces with scapy: {scapy_error}")
    
    # Make sure we found some interfaces or return defaults
    if not interfaces:
        logger.warning("No interfaces found, using defaults")
        interfaces = [
            {"name": "eth0", "description": "Container interface: eth0", "is_up": True}
        ]
                
    return interfaces

@router.get("/interfaces", response_model=List[Dict[str, Any]])
async def get_interfaces():
    """
    Get available network interfaces on the system
    """
    logger.info("Getting network interfaces")
    interfaces = get_host_interfaces()
    
    # Always add 'any' interface option
    if interfaces and not any(iface["name"] == "any" for iface in interfaces):
        interfaces.insert(0, {
            "name": "any",
            "description": "Any interface",
            "is_up": True
        })
        
    logger.info(f"Found {len(interfaces)} interfaces")
    
    if not interfaces:
        # Return default interfaces if none found
        return [
            {"name": "any", "description": "Any interface", "is_up": True},
            {"name": "eth0", "description": "Ethernet", "is_up": True},
            {"name": "en0", "description": "Wi-Fi", "is_up": True}
        ]
        
    return interfaces

def generate_mock_data():
    """Generate mock packet data when real capture is not available"""
    global recent_packets
    logger.info("Generating mock packet data")
    
    # Sample IPs for simulation
    sample_ips = [
        "192.168.1.100", "192.168.1.101", "192.168.1.102",
        "10.0.0.10", "172.16.0.5",
        "8.8.8.8", "1.1.1.1", "142.250.190.78", "157.240.22.35", "13.107.42.14"
    ]
    
    # Common ports
    common_ports = [80, 443, 22, 25, 53, 123, 3306, 5432]
    
    # Sample protocols
    protocols = ["TCP", "UDP", "ICMP"]
    
    # Generate packets
    recent_packets = []
    for i in range(20):
        # Decide direction - outgoing (local to external) or incoming (external to local)
        direction = "outgoing" if i % 2 == 0 else "incoming"
        
        # Select source and destination based on direction
        if direction == "outgoing":
            source_ip = sample_ips[i % 3]  # Local IPs
            dest_ip = sample_ips[5 + (i % 5)]  # External IPs
        else:
            source_ip = sample_ips[5 + (i % 5)]  # External IPs
            dest_ip = sample_ips[i % 3]  # Local IPs
        
        # Select protocol
        protocol = protocols[i % 3]
        
        # Create packet info
        packet_info = {
            "packet_id": i + 1,
            "timestamp": (datetime.datetime.now() - datetime.timedelta(seconds=i * 5)).isoformat(),
            "source_ip": source_ip,
            "dest_ip": dest_ip,
            "protocol": protocol,
            "direction": direction,
            "interface": capture_settings["interface"],
            "length": 64 + (i * 8)
        }
        
        # Add port info for TCP/UDP
        if protocol in ["TCP", "UDP"]:
            packet_info["source_port"] = common_ports[i % len(common_ports)]
            packet_info["dest_port"] = 49152 + (i % 4)
            
            # Add flags for TCP
            if protocol == "TCP":
                flags = ["SYN", "ACK", "FIN", "RST"]
                if i % 4 == 0:
                    packet_info["flags"] = "SYN"
                elif i % 4 == 1:
                    packet_info["flags"] = "ACK"
                elif i % 4 == 2:
                    packet_info["flags"] = "FIN ACK"
                
            # Add common service names
            if direction == "incoming":
                if packet_info["source_port"] == 80:
                    packet_info["service"] = "HTTP"
                elif packet_info["source_port"] == 443:
                    packet_info["service"] = "HTTPS"
                elif packet_info["source_port"] == 22:
                    packet_info["service"] = "SSH"
                elif packet_info["source_port"] == 25:
                    packet_info["service"] = "SMTP"
        else:
            # ICMP doesn't use ports
            packet_info["source_port"] = 0
            packet_info["dest_port"] = 0
            
        recent_packets.append(packet_info)
    
    # Sort by timestamp (newest first)
    recent_packets = sorted(recent_packets, key=lambda p: p["timestamp"], reverse=True)
    
    logger.info(f"Generated {len(recent_packets)} mock packets")

def packet_capture_thread(interface, filter_str="", packet_limit=100, promiscuous=True):
    """Background thread to capture packets using scapy"""
    global recent_packets, stop_capture_flag
    
    logger.info(f"Starting packet capture thread on interface {interface} with filter: {filter_str}")
    recent_packets = []  # Clear existing packets
    
    # Try to use host capture file if available
    if HOST_CAPTURE_AVAILABLE and SCAPY_AVAILABLE:
        try:
            logger.info(f"Using host capture file: {HOST_CAPTURE_FILE}")
            
            # Use sniff with offline parameter to read from the pipe
            def packet_callback(packet):
                if stop_capture_flag.is_set() or len(recent_packets) >= packet_limit:
                    return True  # Signal to stop sniffing
                    
                # Extract packet information
                packet_info = {
                    "packet_id": len(recent_packets) + 1,
                    "timestamp": datetime.datetime.now().isoformat(),
                    "protocol": "Unknown",
                    "length": len(packet),
                    "flags": None,
                    "interface": interface
                }
                
                # IP layer
                if scapy.IP in packet:
                    packet_info["source_ip"] = packet[scapy.IP].src
                    packet_info["dest_ip"] = packet[scapy.IP].dst
                    
                    # Determine direction based on source/dest IP
                    if is_local_ip(packet_info["source_ip"]):
                        packet_info["direction"] = "outgoing"
                    elif is_local_ip(packet_info["dest_ip"]):
                        packet_info["direction"] = "incoming"
                    else:
                        packet_info["direction"] = "unknown"
                    
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
                            
                        # Try to get service name based on port
                        port = packet_info["dest_port"] if packet_info["direction"] == "outgoing" else packet_info["source_port"]
                        packet_info["service"] = get_service_name(port)
                    
                    elif scapy.UDP in packet:
                        packet_info["protocol"] = "UDP"
                        packet_info["source_port"] = packet[scapy.UDP].sport
                        packet_info["dest_port"] = packet[scapy.UDP].dport
                        
                        # Try to get service name based on port
                        port = packet_info["dest_port"] if packet_info["direction"] == "outgoing" else packet_info["source_port"]
                        packet_info["service"] = get_service_name(port)
                    
                    elif scapy.ICMP in packet:
                        packet_info["protocol"] = "ICMP"
                        packet_info["source_port"] = 0
                        packet_info["dest_port"] = 0
                
                recent_packets.append(packet_info)
                logger.debug(f"Captured packet: {packet_info}")
            
            # Start sniffing from the host capture file
            logger.info(f"Starting packet capture from host file")
            try:
                # For a named pipe that's continuously being written to
                # we use a separate thread to read from it
                while not stop_capture_flag.is_set() and len(recent_packets) < packet_limit:
                    try:
                        packets = scapy.sniff(offline=HOST_CAPTURE_FILE, count=10, timeout=1)
                        for packet in packets:
                            if stop_capture_flag.is_set() or len(recent_packets) >= packet_limit:
                                break
                            packet_callback(packet)
                        
                        # Short sleep to avoid busy waiting
                        time.sleep(0.1)
                    except Exception as read_error:
                        logger.error(f"Error reading from host capture file: {str(read_error)}")
                        time.sleep(1)  # Wait a bit before trying again
            except Exception as sniff_error:
                logger.error(f"Error in scapy.sniff with host capture: {str(sniff_error)}")
                # Fall back to regular capture or mock data
                if SCAPY_AVAILABLE:
                    try_regular_capture(interface, filter_str, packet_limit, promiscuous, packet_callback)
                else:
                    generate_mock_data()
        except Exception as e:
            logger.error(f"Error in host capture thread: {str(e)}")
            # Fall back to regular capture or mock data
            if SCAPY_AVAILABLE:
                try_regular_capture(interface, filter_str, packet_limit, promiscuous, None)
            else:
                generate_mock_data()
    elif SCAPY_AVAILABLE:
        # Use regular scapy capture
        try_regular_capture(interface, filter_str, packet_limit, promiscuous, None)
    else:
        logger.warning("Scapy not available, using mock data")
        generate_mock_data()
    
    logger.info("Packet capture thread finished")

def try_regular_capture(interface, filter_str, packet_limit, promiscuous, callback=None):
    """Try to use regular Scapy packet capture"""
    global recent_packets, stop_capture_flag
    
    try:
        # Define packet callback function if not provided
        if callback is None:
            def packet_callback(packet):
                if stop_capture_flag.is_set() or len(recent_packets) >= packet_limit:
                    return True  # Signal to stop sniffing
                    
                # Extract packet information
                packet_info = {
                    "packet_id": len(recent_packets) + 1,
                    "timestamp": datetime.datetime.now().isoformat(),
                    "protocol": "Unknown",
                    "length": len(packet),
                    "flags": None,
                    "interface": interface
                }
                
                # IP layer
                if scapy.IP in packet:
                    packet_info["source_ip"] = packet[scapy.IP].src
                    packet_info["dest_ip"] = packet[scapy.IP].dst
                    
                    # Determine direction based on source/dest IP
                    if is_local_ip(packet_info["source_ip"]):
                        packet_info["direction"] = "outgoing"
                    elif is_local_ip(packet_info["dest_ip"]):
                        packet_info["direction"] = "incoming"
                    else:
                        packet_info["direction"] = "unknown"
                    
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
                            
                        # Try to get service name based on port
                        port = packet_info["dest_port"] if packet_info["direction"] == "outgoing" else packet_info["source_port"]
                        packet_info["service"] = get_service_name(port)
                    
                    elif scapy.UDP in packet:
                        packet_info["protocol"] = "UDP"
                        packet_info["source_port"] = packet[scapy.UDP].sport
                        packet_info["dest_port"] = packet[scapy.UDP].dport
                        
                        # Try to get service name based on port
                        port = packet_info["dest_port"] if packet_info["direction"] == "outgoing" else packet_info["source_port"]
                        packet_info["service"] = get_service_name(port)
                    
                    elif scapy.ICMP in packet:
                        packet_info["protocol"] = "ICMP"
                        packet_info["source_port"] = 0
                        packet_info["dest_port"] = 0
                
                recent_packets.append(packet_info)
                logger.debug(f"Captured packet: {packet_info}")
        else:
            packet_callback = callback
        
        # Start sniffing
        logger.info(f"Starting regular scapy packet capture on interface {interface}")
        scapy.sniff(
            iface=None if interface == "any" else interface,
            filter=filter_str,
            prn=packet_callback,
            stop_filter=lambda p: stop_capture_flag.is_set() or len(recent_packets) >= packet_limit,
            store=0
        )
    except Exception as sniff_error:
        logger.error(f"Error in regular packet capture: {str(sniff_error)}")
        generate_mock_data()

def is_local_ip(ip):
    """Check if an IP is a local IP address"""
    # Check for localhost
    if ip == "127.0.0.1" or ip == "::1":
        return True
    
    # Check for private IP ranges
    if ip.startswith(("10.", "172.16.", "172.17.", "172.18.", "172.19.", "172.2", "172.3", "192.168.")):
        return True
    
    return False

def get_service_name(port):
    """Try to identify service from port number"""
    common_ports = {
        21: "FTP",
        22: "SSH",
        23: "Telnet",
        25: "SMTP",
        53: "DNS",
        80: "HTTP",
        110: "POP3",
        143: "IMAP",
        443: "HTTPS",
        465: "SMTPS",
        587: "SMTP",
        993: "IMAPS",
        995: "POP3S",
        3306: "MySQL",
        5432: "PostgreSQL",
        8000: "API",
        8080: "HTTP"
    }
    return common_ports.get(port, "")

@router.get("/recent", response_model=Dict[str, Any])
async def get_recent_packets(limit: int = 20):
    """
    Get recent packets captured
    """
    logger.info(f"Getting recent packets (limit={limit})")
    # Use mock data if no real packets available
    if not recent_packets:
        generate_mock_data()
        
    # Limit the number of packets returned
    limited_packets = recent_packets[:limit]
    return {"packets": limited_packets}

@router.get("/db", response_model=Dict[str, Any])
async def get_db_packets(
    limit: int = 10, 
    offset: int = 0, 
    source_ip: str = None,
    dest_ip: str = None
):
    """
    Get packets from database with pagination and filtering
    """
    logger.info(f"Getting database packets (limit={limit}, offset={offset})")
    
    # For now, we'll generate mock data (this would be replaced with actual DB queries)
    if not recent_packets:
        generate_mock_data()
    
    # Apply filtering if requested
    filtered_packets = recent_packets
    if source_ip:
        filtered_packets = [p for p in filtered_packets if p["source_ip"] == source_ip]
    if dest_ip:
        filtered_packets = [p for p in filtered_packets if p["dest_ip"] == dest_ip]
    
    # Apply pagination
    paginated_packets = filtered_packets[offset:offset + limit]
    
    return {
        "packets": paginated_packets,
        "total": len(filtered_packets)
    }

@router.post("/start", response_model=Dict[str, Any])
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
        
        return {
            "status": "success",
            "message": f"Started packet capture on interface {capture_settings['interface']}",
            "settings": capture_settings
        }
    except Exception as e:
        error_message = f"Error starting packet capture: {str(e)}"
        logger.error(error_message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_message
        )

@router.post("/stop", response_model=Dict[str, Any])
async def stop_capture():
    """
    Stop the current packet capture
    """
    global capture_settings, capture_thread, stop_capture_flag
    
    try:
        # Set the flag to stop the capture thread
        if capture_thread and capture_thread.is_alive():
            stop_capture_flag.set()
            capture_thread.join(timeout=2)
            stop_capture_flag.clear()
            
        # Set capture as inactive
        capture_settings["capture_active"] = False
        
        return {
            "status": "success",
            "message": "Stopped packet capture",
            "packets_captured": len(recent_packets)
        }
    except Exception as e:
        error_message = f"Error stopping packet capture: {str(e)}"
        logger.error(error_message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_message
        )

@router.get("/status", response_model=Dict[str, Any])
async def get_capture_status():
    """
    Get the current capture status
    """
    return {
        "capture_active": capture_settings["capture_active"],
        "interface": capture_settings["interface"],
        "packets_captured": len(recent_packets),
        "settings": capture_settings
    }

@router.post("/settings", response_model=Dict[str, Any])
async def update_settings(settings: Dict[str, Any]):
    """
    Update capture settings without starting/stopping capture
    """
    global capture_settings
    
    try:
        # Update settings
        for key, value in settings.items():
            if key in capture_settings:
                capture_settings[key] = value
                
        return {
            "status": "success",
            "message": "Updated capture settings",
            "settings": capture_settings
        }
    except Exception as e:
        error_message = f"Error updating capture settings: {str(e)}"
        logger.error(error_message)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_message
        )

@router.get("/db/{packet_id}", response_model=Dict[str, Any])
async def get_db_packet(packet_id: int):
    """
    Get a specific packet from the database by ID
    """
    logger.info(f"Getting database packet {packet_id}")
    
    # For now, we'll use mock data
    if not recent_packets:
        generate_mock_data()
    
    # Find packet by ID
    for packet in recent_packets:
        if packet["packet_id"] == packet_id:
            return packet
    
    # If not found
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Packet with ID {packet_id} not found"
    )

@router.post("/db/{packet_id}/mark-malicious", response_model=Dict[str, Any])
async def mark_packet_as_malicious(
    packet_id: int,
    data: Dict[str, Any]
):
    """
    Mark a packet as malicious in the database
    """
    logger.info(f"Marking packet {packet_id} as malicious")
    
    # This would update the database in a real implementation
    return {
        "status": "success",
        "message": f"Packet {packet_id} marked as malicious",
        "details": data
    }

# Initialize with mock data
generate_mock_data()
