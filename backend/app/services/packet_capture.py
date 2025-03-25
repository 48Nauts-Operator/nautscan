from scapy.all import sniff, IP, TCP, UDP, ICMP, IPv6
from typing import List, Dict, Optional, Callable, Any
import threading
import queue
import logging
import time
import binascii
from datetime import datetime, timedelta
import json
from uuid import uuid4
import socket
import re

from ..db.session import AsyncSessionLocal

logger = logging.getLogger(__name__)

class PacketCapture:
    def __init__(self):
        """Initialize the packet capture service."""
        self.capture_thread: Optional[threading.Thread] = None
        self.should_stop = threading.Event()
        self.packet_queue = queue.Queue(maxsize=1000)  # Buffer last 1000 packets
        self.callbacks: List[Callable] = []
        self.packet_stats = {
            'total_packets': 0,
            'tcp_packets': 0,
            'udp_packets': 0,
            'icmp_packets': 0,
            'other_packets': 0,
            'bytes_received': 0,
            'start_time': None,
        }
        self.captured_packets = []
        self.is_capturing = False
        self.start_time = None
        self.packet_count = 0
        self.byte_count = 0
        
        # IP to hostname cache to avoid repeated lookups
        self.hostname_cache = {}
        # Known provider networks (simplified example)
        self.known_providers = {
            '8.8.8.8': 'Google DNS',
            '8.8.4.4': 'Google DNS',
            '1.1.1.1': 'Cloudflare DNS',
            '1.0.0.1': 'Cloudflare DNS',
            '208.67.222.222': 'OpenDNS',
            '208.67.220.220': 'OpenDNS'
        }
        
        # Default settings
        self.settings = {
            'interface': None,  # Default to all interfaces
            'filter': 'tcp or udp',
            'promisc': True,
            'monitor': False,
            'enable_ipv6': True,
            'max_packets': 1000,
            'capture_limit': {
                'enabled': False,
                'packets': 10000,
                'duration': 300  # seconds
            },
            'store_raw_packets': False,
            'save_to_database': True
        }

    def _resolve_hostname(self, ip_address: str) -> str:
        """Resolve an IP address to a hostname or identify provider."""
        # Check cache first
        if ip_address in self.hostname_cache:
            return self.hostname_cache[ip_address]
            
        # Check known providers
        if ip_address in self.known_providers:
            self.hostname_cache[ip_address] = self.known_providers[ip_address]
            return self.known_providers[ip_address]
            
        # Check provider patterns
        provider_patterns = [
            (r'^13\.', 'AWS'),
            (r'^104\.', 'Akamai'),
            (r'^34\.', 'Google Cloud'),
            (r'^52\.', 'AWS'),
            (r'^172\.217\.', 'Google'),
            (r'^31\.13\.', 'Facebook'),
            (r'^192\.168\.', 'Private Network')
        ]
        
        for pattern, provider in provider_patterns:
            if re.match(pattern, ip_address):
                self.hostname_cache[ip_address] = provider
                return provider
        
        # Try to resolve hostname (with timeout to avoid blocking)
        try:
            socket.setdefaulttimeout(1)
            hostname = socket.gethostbyaddr(ip_address)[0]
            self.hostname_cache[ip_address] = hostname
            return hostname
        except (socket.herror, socket.timeout):
            # No hostname found, check if it's local
            if ip_address.startswith('127.') or ip_address == '::1':
                self.hostname_cache[ip_address] = 'localhost'
                return 'localhost'
            else:
                self.hostname_cache[ip_address] = None
                return None

    def _packet_callback(self, packet):
        """Process captured packet."""
        if IP in packet or IPv6 in packet:
            is_ipv6 = IPv6 in packet
            ip_layer = packet[IPv6] if is_ipv6 else packet[IP]
            protocol_version = "IPv6" if is_ipv6 else "IPv4"
            
            # Extract basic packet info
            packet_info = {
                'id': str(uuid4()),
                'timestamp': datetime.now().isoformat(),
                'source_ip': ip_layer.src,
                'destination_ip': ip_layer.dst,
                'protocol': 'Unknown',
                'protocol_version': protocol_version,
                'length': len(packet),
                'ttl': getattr(ip_layer, 'hlim' if is_ipv6 else 'ttl', None),
                'flags': None,
                'raw_packet': bytes(packet) if self.settings.get('store_raw_packets', False) else None,
                'packet_summary': packet.summary()
            }
            
            # Add device names using hostname resolution
            packet_info['source_device_name'] = self._resolve_hostname(ip_layer.src)
            packet_info['destination_device_name'] = self._resolve_hostname(ip_layer.dst)
            
            # Update statistics
            self.packet_count += 1
            self.byte_count += len(packet)

            # Process based on transport protocol
            if TCP in packet:
                packet_info['protocol'] = 'TCP'
                packet_info['source_port'] = packet[TCP].sport
                packet_info['destination_port'] = packet[TCP].dport
                packet_info['flags'] = self._get_tcp_flags(packet[TCP])
                self.packet_stats['tcp_packets'] += 1
                
                # Detect application layer protocol
                if packet_info['destination_port'] == 80 or packet_info['source_port'] == 80:
                    packet_info['application_protocol'] = 'HTTP'
                elif packet_info['destination_port'] == 443 or packet_info['source_port'] == 443:
                    packet_info['application_protocol'] = 'HTTPS'
                elif packet_info['destination_port'] == 22 or packet_info['source_port'] == 22:
                    packet_info['application_protocol'] = 'SSH'
                    
            elif UDP in packet:
                packet_info['protocol'] = 'UDP'
                packet_info['source_port'] = packet[UDP].sport
                packet_info['destination_port'] = packet[UDP].dport
                self.packet_stats['udp_packets'] += 1
                
                # Detect application layer protocol
                if packet_info['destination_port'] == 53 or packet_info['source_port'] == 53:
                    packet_info['application_protocol'] = 'DNS'
                    
            elif ICMP in packet:
                packet_info['protocol'] = 'ICMP'
                self.packet_stats['icmp_packets'] += 1
            else:
                self.packet_stats['other_packets'] += 1

            self.packet_stats['total_packets'] += 1
            self.packet_stats['bytes_received'] += len(packet)
            
            # Extract payload excerpt if available
            if hasattr(packet, 'payload') and hasattr(packet.payload, 'payload'):
                try:
                    payload = bytes(packet.payload.payload)
                    if payload:
                        # Take first 100 bytes max and convert to hex
                        excerpt = payload[:100]
                        packet_info['payload_excerpt'] = binascii.hexlify(excerpt).decode('utf-8')
                except Exception as e:
                    logger.debug(f"Error extracting payload: {e}")
            
            # Add to in-memory queue for immediate access
            try:
                self.packet_queue.put(packet_info, block=False)
            except queue.Full:
                # Queue is full, remove oldest packet
                try:
                    self.packet_queue.get_nowait()
                    self.packet_queue.put(packet_info, block=False)
                except queue.Empty:
                    pass
                    
            # Save to database asynchronously
            self._save_packet_to_db(packet_info)
            
    def _get_tcp_flags(self, tcp_layer):
        """Extract TCP flags as a string."""
        flags = []
        if tcp_layer.flags & 0x01:  # FIN
            flags.append('FIN')
        if tcp_layer.flags & 0x02:  # SYN
            flags.append('SYN')
        if tcp_layer.flags & 0x04:  # RST
            flags.append('RST')
        if tcp_layer.flags & 0x08:  # PSH
            flags.append('PSH')
        if tcp_layer.flags & 0x10:  # ACK
            flags.append('ACK')
        if tcp_layer.flags & 0x20:  # URG
            flags.append('URG')
        return ','.join(flags)
        
    def _save_packet_to_db(self, packet_info: Dict[str, Any]):
        """Save packet to database asynchronously."""
        if not self.settings.get('save_to_database', True):
            return  # Skip if database saving is disabled
            
        # This launches a background task to save the packet
        threading.Thread(
            target=self._db_save_worker,
            args=(packet_info,),
            daemon=True
        ).start()
        
    def _db_save_worker(self, packet_info: Dict[str, Any]):
        """Worker function to save packet to database."""
        import asyncio
        from ..services.database import DatabaseService
        
        async def save_to_db():
            try:
                async with AsyncSessionLocal() as session:
                    db_service = DatabaseService(session)
                    
                    # Parse timestamp if it's a string
                    if isinstance(packet_info.get('timestamp'), str):
                        try:
                            packet_info['timestamp'] = datetime.fromisoformat(packet_info['timestamp'])
                        except ValueError:
                            packet_info['timestamp'] = datetime.utcnow()
                    
                    # Check for malicious indicators (example implementation)
                    is_malicious = self._check_if_malicious(packet_info)
                    threat_category = "suspicious_traffic" if is_malicious else None
                    
                    # Save to database
                    await db_service.save_packet(
                        packet_data=packet_info,
                        is_malicious=is_malicious,
                        threat_category=threat_category,
                        connection_id=packet_info.get('id')
                    )
            except Exception as e:
                logger.error(f"Error saving packet to database: {e}")
        
        # Run the async function in a new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(save_to_db())
        finally:
            loop.close()
            
    def _check_if_malicious(self, packet_info: Dict[str, Any]) -> bool:
        """Simple check for malicious indicators - extend with actual logic."""
        # Example implementation - replace with real detection logic
        suspicious_ports = [4444, 31337, 8080]  # Example suspicious ports
        suspicious_flags = ['RST,ACK', 'SYN,RST']  # Unusual flag combinations
        
        # Check for suspicious ports
        if packet_info.get('source_port') in suspicious_ports or packet_info.get('destination_port') in suspicious_ports:
            return True
            
        # Check for suspicious flag combinations
        if packet_info.get('flags') in suspicious_flags:
            return True
            
        # Could add checks for known malicious IPs, payload patterns, etc.
        return False

    def _capture_packets(self, interface: str = None):
        """Capture packets on specified interface."""
        try:
            self.is_capturing = True
            self.start_time = time.time()
            
            # Apply settings
            iface = interface or self.settings['interface']
            filter_str = self.settings['filter'] if self.settings['filter'] else None
            
            # Set up packet capture
            sniff(
                iface=iface,
                prn=self._packet_callback,
                filter=filter_str,
                store=0,
                promisc=self.settings['promisc'],
                stop_filter=lambda _: self.should_stop.is_set() or self._check_capture_limits()
            )
        except Exception as e:
            logger.error(f"Error in packet capture: {e}")
        finally:
            self.is_capturing = False
    
    def _check_capture_limits(self) -> bool:
        """Check if capture limits have been reached."""
        if not self.settings['capture_limit']['enabled']:
            return False
            
        # Check packet count limit
        if self.settings['capture_limit']['packets'] > 0 and self.packet_count >= self.settings['capture_limit']['packets']:
            logger.info(f"Packet count limit reached ({self.packet_count} packets). Stopping capture.")
            return True
            
        # Check duration limit
        if self.settings['capture_limit']['duration'] > 0:
            current_time = time.time()
            duration = current_time - self.start_time
            if duration >= self.settings['capture_limit']['duration']:
                logger.info(f"Duration limit reached ({duration:.1f} seconds). Stopping capture.")
                return True
                
        return False
    
    def start_capture(self, interface: str = None, settings: dict = None) -> None:
        """Start packet capture on specified interface with settings."""
        if self.capture_thread and self.capture_thread.is_alive():
            raise RuntimeError("Packet capture is already running")
            
        # Update settings if provided
        if settings:
            self.update_settings(settings)
        
        # Use interface from parameters or settings
        interface = interface or self.settings['interface']
            
        self.should_stop.clear()
        self.packet_stats['start_time'] = datetime.now()
        self.capture_thread = threading.Thread(
            target=self._capture_packets,
            args=(interface,),
            daemon=True
        )
        self.capture_thread.start()
        logger.info(f"Started packet capture on interface: {interface or 'any'} with filter: {self.settings['filter'] or 'none'}")
    
    def update_settings(self, settings: dict) -> None:
        """Update packet capture settings."""
        # Update settings with new values, keeping existing ones for any missing keys
        for key, value in settings.items():
            if key in self.settings:
                self.settings[key] = value
                
        # Update queue size if max_packets changed
        if 'max_packets' in settings and settings['max_packets'] != self.packet_queue.maxsize:
            # Create a new queue with the updated size
            old_queue = self.packet_queue
            self.packet_queue = queue.Queue(maxsize=settings['max_packets'])
            
            # Transfer items from old queue to new queue if possible
            try:
                while not old_queue.empty():
                    item = old_queue.get_nowait()
                    try:
                        self.packet_queue.put_nowait(item)
                    except queue.Full:
                        break  # Stop if new queue is full
            except queue.Empty:
                pass
                
        logger.info(f"Updated packet capture settings: {self.settings}")
    
    def get_settings(self) -> dict:
        """Get current packet capture settings."""
        return self.settings

    def stop_capture(self) -> None:
        """Stop packet capture."""
        if self.capture_thread and self.capture_thread.is_alive():
            self.should_stop.set()
            self.capture_thread.join(timeout=5)
            if self.capture_thread.is_alive():
                logger.warning("Packet capture thread did not stop gracefully")
            self.capture_thread = None
        self.is_capturing = False
        logger.info("Stopped packet capture")

    def get_recent_packets(self, limit: int = 100) -> List[Dict]:
        """Get recent packets from the queue."""
        packets = []
        try:
            while len(packets) < limit and not self.packet_queue.empty():
                packets.append(self.packet_queue.get_nowait())
        except queue.Empty:
            pass
        return packets

    def get_statistics(self) -> Dict:
        """Get packet capture statistics."""
        current_time = time.time()
        duration = current_time - (self.start_time or current_time)
        
        return {
            'total_packets': self.packet_count,
            'tcp_packets': self.packet_stats['tcp_packets'],
            'udp_packets': self.packet_stats['udp_packets'],
            'icmp_packets': self.packet_stats['icmp_packets'],
            'bytes_received': self.byte_count,
            'packets_per_second': self.packet_count / duration if duration > 0 else 0,
            'bytes_per_second': self.byte_count / duration if duration > 0 else 0,
            'is_capturing': self.is_capturing
        }

    def add_callback(self, callback: Callable[[Dict], None]) -> None:
        """Add a callback function to be called for each packet."""
        self.callbacks.append(callback)

    def remove_callback(self, callback: Callable[[Dict], None]) -> None:
        """Remove a callback function."""
        if callback in self.callbacks:
            self.callbacks.remove(callback)

    def packet_callback(self, packet):
        """Process captured packet."""
        if IP in packet:
            packet_info = {
                'source': packet[IP].src,
                'destination': packet[IP].dst,
                'protocol': packet[IP].proto,
                'length': len(packet),
                'time': packet.time
            }
            self.captured_packets.append(packet_info)
            self.packet_count += 1
            self.byte_count += len(packet)

    def start_time_capture(self):
        """Start capturing time."""
        self.start_time = time.time()
        self.is_capturing = True

    def stop_time_capture(self):
        """Stop capturing time."""
        self.is_capturing = False

    def reset_statistics(self):
        """Reset packet capture statistics."""
        self.captured_packets = []
        self.packet_count = 0
        self.byte_count = 0
        self.start_time = None
        self.is_capturing = False
        self.packet_stats = {
            'total_packets': 0,
            'tcp_packets': 0,
            'udp_packets': 0,
            'icmp_packets': 0,
            'other_packets': 0,
            'bytes_received': 0,
            'start_time': None,
        }

    def run_housekeeping(self):
        """Run database housekeeping to remove expired packets."""
        import asyncio
        from ..services.database import DatabaseService
        
        async def housekeeping_task():
            try:
                async with AsyncSessionLocal() as session:
                    db_service = DatabaseService(session)
                    deleted_count = await db_service.run_housekeeping()
                    logger.info(f"Housekeeping complete: {deleted_count} expired packets deleted")
            except Exception as e:
                logger.error(f"Error running housekeeping: {e}")
                
        # Run the async function in a new event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(housekeeping_task())
        finally:
            loop.close()
        
    def start_scheduled_housekeeping(self, interval_hours: int = 24):
        """Start scheduled housekeeping task."""
        def housekeeping_worker():
            while not self.should_stop.is_set():
                # Sleep first, then run housekeeping
                for _ in range(interval_hours * 60 * 60):  # Convert hours to seconds
                    if self.should_stop.is_set():
                        break
                    time.sleep(1)
                    
                if not self.should_stop.is_set():
                    logger.info("Running scheduled housekeeping")
                    self.run_housekeeping()
        
        # Start the housekeeping thread
        housekeeping_thread = threading.Thread(
            target=housekeeping_worker,
            daemon=True
        )
        housekeeping_thread.start()
        logger.info(f"Scheduled housekeeping started with {interval_hours} hour interval")

# Create a singleton instance
packet_capture = PacketCapture() 