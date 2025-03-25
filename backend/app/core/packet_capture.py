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
