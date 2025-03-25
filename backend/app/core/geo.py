import geoip2.database
from typing import Dict
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class GeoIP:
    def __init__(self):
        self.reader = None
        self.db_path = os.getenv('GEOIP_DB_PATH', str(Path(__file__).parent.parent / 'data' / 'GeoLite2-City.mmdb'))
        self._init_reader()

    def _init_reader(self):
        """Initialize the GeoIP reader"""
        try:
            if os.path.exists(self.db_path):
                self.reader = geoip2.database.Reader(self.db_path)
            else:
                logger.warning(f"GeoIP database not found at {self.db_path}, using mock data")
        except Exception as e:
            logger.error(f"Failed to initialize GeoIP reader: {e}")

    def get_location(self, ip: str) -> Dict:
        """Get location information for an IP address"""
        try:
            # For testing, return mock data for certain IP ranges
            if ip.startswith('192.168.'):
                return {
                    'lat': 37.7749,
                    'lng': -122.4194,
                    'city': 'San Francisco',
                    'country': 'United States'
                }
            elif ip.startswith('10.'):
                return {
                    'lat': 51.5074,
                    'lng': -0.1278,
                    'city': 'London',
                    'country': 'United Kingdom'
                }
            
            if self.reader:
                response = self.reader.city(ip)
                return {
                    'lat': response.location.latitude,
                    'lng': response.location.longitude,
                    'city': response.city.name,
                    'country': response.country.name
                }
            else:
                # Return default location for testing
                return {
                    'lat': 40.7128,
                    'lng': -74.0060,
                    'city': 'New York',
                    'country': 'United States'
                }
        except Exception as e:
            logger.error(f"Error getting location for IP {ip}: {e}")
            return {
                'lat': 0,
                'lng': 0,
                'city': 'Unknown',
                'country': 'Unknown'
            }

    def __del__(self):
        """Clean up the reader when the object is destroyed"""
        if self.reader:
            self.reader.close() 