import { NextApiRequest, NextApiResponse } from 'next';
import { Reader } from '@maxmind/geoip2-node';
import path from 'path';

// This should be replaced with your actual data source
const mockConnections = [
  {
    sourceIP: '8.8.8.8',          // Google DNS
    destIP: '208.67.222.222',     // OpenDNS
    type: 'dns',
    trafficVolume: 1000
  },
  {
    sourceIP: '13.32.99.99',      // AWS
    destIP: '104.244.42.1',       // Twitter
    type: 'web',
    trafficVolume: 800
  },
  {
    sourceIP: '157.240.22.35',    // Facebook
    destIP: '172.217.3.110',      // Google
    type: 'api',
    trafficVolume: 600
  }
];

async function getLocationFromIP(ip: string, reader: Reader) {
  try {
    // @ts-ignore - Ignore type checking for this part
    const response = await reader.city(ip);
    return {
      lat: response.location?.latitude || 0,
      lng: response.location?.longitude || 0,
      city: response.city?.names.en,
      country: response.country?.names.en,
      ip: ip
    };
  } catch (error) {
    console.error('Error getting location for IP:', ip, error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get database path from environment variable and resolve it correctly
    const dbPath = path.join(process.cwd(), 'public', 'data', 'GeoLite2-City.mmdb');
    console.log('Loading MaxMind database from:', dbPath);
    
    // Check if database file exists
    const fs = require('fs');
    if (!fs.existsSync(dbPath)) {
      console.error('MaxMind database file not found. Please run: npm run update-maxmind');
      throw new Error('Database file not found');
    }
    
    const reader = await Reader.open(dbPath);

    // Process connections with geolocation data
    const processedConnections = await Promise.all(
      mockConnections.map(async (conn) => {
        const source = await getLocationFromIP(conn.sourceIP, reader);
        const destination = await getLocationFromIP(conn.destIP, reader);

        if (source && destination) {
          return {
            source,
            destination,
            type: conn.type,
            traffic: conn.trafficVolume
          };
        }
        return null;
      })
    );

    // Filter out any failed lookups
    const validConnections = processedConnections.filter(Boolean);

    res.status(200).json(validConnections);
  } catch (error) {
    console.error('Error processing connections:', error);
    // Fallback data in case of errors
    res.status(200).json([
      {
        source: { lat: 40.7128, lng: -74.0060, city: 'New York', country: 'United States', ip: '8.8.8.8' },
        destination: { lat: 51.5074, lng: -0.1278, city: 'London', country: 'United Kingdom', ip: '208.67.222.222' },
        type: 'main',
        traffic: 1000
      },
      {
        source: { lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'Japan', ip: '13.32.99.99' },
        destination: { lat: 37.7749, lng: -122.4194, city: 'San Francisco', country: 'United States', ip: '104.244.42.1' },
        type: 'main',
        traffic: 800
      },
      {
        source: { lat: 1.3521, lng: 103.8198, city: 'Singapore', country: 'Singapore', ip: '157.240.22.35' },
        destination: { lat: -33.8688, lng: 151.2093, city: 'Sydney', country: 'Australia', ip: '172.217.3.110' },
        type: 'main',
        traffic: 600
      }
    ]);
  }
} 