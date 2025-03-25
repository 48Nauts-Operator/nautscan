from app.core.packet_capture import PacketCapture
import logging
from typing import Dict, Any, Optional, List
import time

logger = logging.getLogger(__name__)

class TrafficService:
    """Service for managing traffic data and statistics"""
    
    def __init__(self):
        self.packet_capture = PacketCapture()
        
    def process_packet(self, packet_info: Dict[str, Any]):
        """Process packet information"""
        # This method is called for each packet captured
        # We don't need to do anything with it for now
        pass
    
    def start_capture(self, interface: Optional[str] = None, filter_str: Optional[str] = None):
        """Start packet capture with specified settings"""
        settings = {}
        if filter_str:
            settings['filter'] = filter_str
            
        return self.packet_capture.start_capture(interface=interface, settings=settings)
    
    def stop_capture(self):
        """Stop packet capture"""
        return self.packet_capture.stop_capture()
