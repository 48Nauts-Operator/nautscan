from scapy.all import sniff, IP, TCP, UDP
from typing import List, Dict, Optional, Callable
import threading
import queue
import socket
import requests
import dns.resolver
from datetime import datetime

class NetworkMonitor:
    def __init__(self):
        """Initialize the network monitor."""
        self._packet_queue = queue.Queue()
        self._stop_sniffing = threading.Event()
        self._connections: Dict[str, dict] = {}
        self._callback: Optional[Callable] = None
        self._sniffer_thread: Optional[threading.Thread] = None
        
    def start_monitoring(self, callback: Optional[Callable] = None):
        """Start network monitoring in a separate thread."""
        self._callback = callback
        self._stop_sniffing.clear()
        self._sniffer_thread = threading.Thread(target=self._sniff_packets)
        self._sniffer_thread.daemon = True
        self._sniffer_thread.start()
        
    def stop_monitoring(self):
        """Stop network monitoring."""
        self._stop_sniffing.set()
        if self._sniffer_thread:
            self._sniffer_thread.join()
            
    def _sniff_packets(self):
        """Sniff network packets and process them."""
        try:
            sniff(
                prn=self._process_packet,
                store=False,
                stop_filter=lambda _: self._stop_sniffing.is_set()
            )
        except Exception as e:
            print(f"Error in packet sniffing: {e}")
            
    def _process_packet(self, packet):
        """Process a single network packet."""
        if IP in packet:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            src_ip = packet[IP].src
            dst_ip = packet[IP].dst
            
            connection_info = {
                'timestamp': timestamp,
                'src_ip': src_ip,
                'dst_ip': dst_ip,
                'protocol': self._get_protocol(packet),
                'is_external': self._is_external_ip(dst_ip),
                'hostname': self._resolve_hostname(dst_ip),
                'port': self._get_port(packet)
            }
            
            connection_key = f"{src_ip}:{dst_ip}"
            self._connections[connection_key] = connection_info
            
            if self._callback:
                self._callback(connection_info)
                
    def _get_protocol(self, packet) -> str:
        """Determine the protocol of the packet."""
        if TCP in packet:
            return 'TCP'
        elif UDP in packet:
            return 'UDP'
        return 'Unknown'
        
    def _get_port(self, packet) -> Optional[int]:
        """Get the destination port of the packet."""
        if TCP in packet:
            return packet[TCP].dport
        elif UDP in packet:
            return packet[UDP].dport
        return None
        
    @staticmethod
    def _is_external_ip(ip: str) -> bool:
        """Check if an IP address is external."""
        try:
            ip_parts = list(map(int, ip.split('.')))
            return not (
                ip_parts[0] == 127 or  # localhost
                (ip_parts[0] == 10) or  # 10.x.x.x
                (ip_parts[0] == 172 and 16 <= ip_parts[1] <= 31) or  # 172.16.x.x - 172.31.x.x
                (ip_parts[0] == 192 and ip_parts[1] == 168)  # 192.168.x.x
            )
        except:
            return False
            
    @staticmethod
    def _resolve_hostname(ip: str) -> Optional[str]:
        """Resolve hostname from IP address."""
        try:
            return socket.gethostbyaddr(ip)[0]
        except:
            return None
            
    def get_active_connections(self) -> List[dict]:
        """Get list of active connections."""
        return list(self._connections.values())
        
    def get_external_connections(self) -> List[dict]:
        """Get list of external connections."""
        return [conn for conn in self._connections.values() if conn['is_external']]
