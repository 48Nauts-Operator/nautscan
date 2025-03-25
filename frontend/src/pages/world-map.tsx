// @ts-nocheck
/// <reference path="../three-types.d.ts" />
/// <reference path="../module-declarations.d.ts" />
/// <reference path="../next-declarations.d.ts" />

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useTrafficData } from '../hooks/useTrafficData'

// Import the map components with dynamic loading and SSR disabled
const ThreeDWorldMap = dynamic(() => import('../components/ThreeDWorldMap'), { 
  ssr: false 
})

const TwoDWorldMap = dynamic(() => import('../components/TwoDWorldMap'), { 
  ssr: false 
})

// Import the texture checker component
const EnsureTextures = dynamic(() => import('../components/EnsureTextures'), { 
  ssr: false 
})

export default function WorldMap() {
  // Sample data for statistics
  const sampleSourceCountries = [
    { name: "United States", percentage: 42 },
    { name: "China", percentage: 28 },
    { name: "Russia", percentage: 15 },
    { name: "Germany", percentage: 8 },
    { name: "Brazil", percentage: 7 }
  ]
  
  const sampleDestCountries = [
    { name: "United States", percentage: 38 },
    { name: "Netherlands", percentage: 22 },
    { name: "Japan", percentage: 17 },
    { name: "United Kingdom", percentage: 14 },
    { name: "Singapore", percentage: 9 }
  ]
  
  const sampleRegions = [
    { name: "North America", traffic: 420 },
    { name: "Asia", traffic: 350 },
    { name: "Europe", traffic: 280 },
    { name: "South America", traffic: 150 },
    { name: "Africa", traffic: 95 }
  ]
  
  // Use the traffic data hook to get real connection data
  const { 
    connections, 
    loading, 
    error, 
    refresh,
    usingMockData 
  } = useTrafficData({
    refreshInterval: 15000, // refresh every 15 seconds
    useWebsockets: false,  // Explicitly disable WebSockets
  });
  
  // Convert connections to the format needed for the 3D map
  const connectionsFor3D = connections.map(conn => {
    // Check if source/destination have lat/lng properties
    const hasGeoData = conn.source && 
                      typeof conn.source === 'object' && 
                      'lat' in conn.source &&
                      conn.destination &&
                      typeof conn.destination === 'object' &&
                      'lat' in conn.destination;
                      
    if (hasGeoData) {
      return {
        source: {
          lat: conn.source.lat,
          lng: conn.source.lng,
          city: conn.source.city || 'Unknown',
          country: conn.source.country || 'Unknown'
        },
        destination: {
          lat: conn.destination.lat,
          lng: conn.destination.lng,
          city: conn.destination.city || 'Unknown',
          country: conn.destination.country || 'Unknown'
        },
        type: conn.protocol?.toString().toLowerCase().includes('http') ? 'web' : 
              conn.protocol?.toString().toLowerCase().includes('dns') ? 'dns' :
              conn.application?.toString().toLowerCase().includes('api') ? 'api' : 'main',
        traffic: (conn.bytes_sent || 0) + (conn.bytes_received || 0)
      };
    }
    
    // If no geo data, return default/random locations
    return {
      source: {
        lat: Math.random() * 180 - 90,
        lng: Math.random() * 360 - 180,
        city: 'Unknown City',
        country: 'Unknown Country'
      },
      destination: {
        lat: Math.random() * 180 - 90,
        lng: Math.random() * 360 - 180,
        city: 'Unknown City',
        country: 'Unknown Country'
      },
      type: ['web', 'dns', 'api', 'main'][Math.floor(Math.random() * 4)],
      traffic: Math.floor(Math.random() * 1000)
    };
  });
  
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d')
  
  // Calculate statistics from connections data
  const calculateStats = () => {
    const sourceCountries: Record<string, number> = {};
    const destCountries: Record<string, number> = {};
    const regions: Record<string, number> = {};
    
    // Define regions based on country codes
    const regionMap: Record<string, string> = {
      'US': 'North America',
      'CA': 'North America',
      'MX': 'North America',
      'GB': 'Europe',
      'UK': 'Europe',
      'DE': 'Europe',
      'FR': 'Europe',
      'IT': 'Europe',
      'ES': 'Europe',
      'CN': 'Asia',
      'JP': 'Asia',
      'IN': 'Asia',
      'KR': 'Asia',
      'AU': 'Oceania',
      'NZ': 'Oceania',
      'BR': 'South America',
      'AR': 'South America',
      'ZA': 'Africa',
      'EG': 'Africa',
      'NG': 'Africa',
    };
    
    // Process connections
    connections.forEach(conn => {
      if (conn.source && typeof conn.source === 'object' && 'country' in conn.source && conn.source.country) {
        sourceCountries[conn.source.country] = (sourceCountries[conn.source.country] || 0) + 1;
        
        const region = regionMap[conn.source.country] || 'Other';
        regions[region] = (regions[region] || 0) + ((conn.bytes_sent || 0) + (conn.bytes_received || 0));
      }
      
      if (conn.destination && typeof conn.destination === 'object' && 'country' in conn.destination && conn.destination.country) {
        destCountries[conn.destination.country] = (destCountries[conn.destination.country] || 0) + 1;
      }
    });
    
    // Convert to percentage for display
    const totalSources = Object.values(sourceCountries).reduce((a, b) => a + b, 0);
    const totalDests = Object.values(destCountries).reduce((a, b) => a + b, 0);
    
    // Convert to array format for display
    const sourceCountriesArray = Object.entries(sourceCountries)
      .map(([name, count]) => ({ 
        name, 
        percentage: Math.round((count / totalSources) * 100) || 0 
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
      
    const destCountriesArray = Object.entries(destCountries)
      .map(([name, count]) => ({ 
        name, 
        percentage: Math.round((count / totalDests) * 100) || 0 
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
      
    const regionsArray = Object.entries(regions)
      .map(([name, traffic]) => ({ 
        name, 
        traffic: Math.round(traffic / 1024) // Convert to KB
      }))
      .sort((a, b) => b.traffic - a.traffic)
      .slice(0, 5);
      
    return {
      sourceCountries: sourceCountriesArray.length > 0 ? sourceCountriesArray : sourceCountries,
      destCountries: destCountriesArray.length > 0 ? destCountriesArray : destCountries,
      regions: regionsArray.length > 0 ? regionsArray : regions
    };
  };
  
  // Generate stats from real data
  const { sourceCountries, destCountries, regions } = calculateStats();
  
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold font-mono neon-text">WORLD MAP</h1>
            <p className="text-muted-foreground">Visualize global network connections</p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <div className="flex p-0.5 bg-background border border-primary/30 rounded-sm">
              <button
                className={`px-4 py-1.5 text-sm ${viewMode === '3d' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                onClick={() => setViewMode('3d')}
              >
                3D View
              </button>
              <button
                className={`px-4 py-1.5 text-sm ${viewMode === '2d' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                onClick={() => setViewMode('2d')}
              >
                2D View
              </button>
            </div>
            
            <button 
              onClick={refresh} 
              className="cyber-button px-4 py-2 text-sm"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            
            <Link href="/" className="cyber-button px-4 py-2 text-sm">
              Home
            </Link>
            
            {/* Data source indicator */}
            <div className={`px-3 py-1 rounded-sm text-xs font-mono ${usingMockData ? 'bg-amber-900/50 text-amber-400 border border-amber-700' : 'bg-green-900/50 text-green-400 border border-green-700'}`}>
              {usingMockData ? 'MOCK DATA' : 'LIVE DATA'}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/20 border border-destructive rounded-sm p-4 mb-6">
            <p className="text-destructive">Error: {error}</p>
            <button 
              onClick={refresh}
              className="mt-2 bg-destructive text-destructive-foreground px-3 py-1 rounded-sm text-sm"
            >
              Retry
            </button>
          </div>
        )}
        
        <div className="space-y-6">
          {/* Connection visuals */}
          <div className="bg-card/80 rounded-sm border border-primary/30 shadow-sm p-4 backdrop-blur-sm">
            <div className="h-[500px] w-full bg-muted/20">
              {viewMode === '3d' ? (
                <ThreeDWorldMap connections={connectionsFor3D} />
              ) : (
                <TwoDWorldMap connections={connectionsFor3D} />
              )}
            </div>
          </div>
          
          {/* Ensure textures component - will only show if there are issues */}
          <EnsureTextures />
          
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Top Source Countries */}
            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">Top Source Countries</h2>
                <p className="text-muted-foreground">Source countries by percentage</p>
              </div>
              <div className="p-4">
                {sourceCountries && Array.isArray(sourceCountries) ? 
                  sourceCountries.map((country, i) => (
                    <div key={i} className="mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{country?.name || 'Unknown'}</span>
                        <span className="text-sm text-muted-foreground">{country?.percentage || 0}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                          style={{ width: `${country?.percentage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                  : <div className="text-center py-4 text-muted-foreground">No data available</div>
                }
              </div>
            </div>
            
            {/* Destination Countries */}
            <div className="bg-card rounded-lg border shadow-sm p-4">
              <h2 className="text-xl font-semibold mb-4">Top Destination Countries</h2>
              <div className="space-y-4">
                {destCountries && Array.isArray(destCountries) ? 
                  destCountries.map((country, i) => (
                    <div key={i} className="w-full">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{country?.name || 'Unknown'}</span>
                        <span className="text-sm text-muted-foreground">{country?.percentage || 0}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-full h-2" 
                          style={{ width: `${country?.percentage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                  : <div className="text-center py-4 text-muted-foreground">No data available</div>
                }
              </div>
            </div>
            
            {/* Traffic by Region */}
            <div className="bg-card rounded-lg border shadow-sm p-4">
              <h2 className="text-xl font-semibold mb-4">Traffic by Region</h2>
              <div className="space-y-4">
                {regions && Array.isArray(regions) ? 
                  regions.map((region, i) => (
                    <div key={i} className="w-full">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{region?.name || 'Unknown'}</span>
                        <span className="text-sm text-muted-foreground">{region?.traffic || 0} KB</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full h-2" 
                          style={{ width: `${Math.min(100, ((region?.traffic || 0) / 500) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                  : <div className="text-center py-4 text-muted-foreground">No data available</div>
                }
              </div>
            </div>
          </div>
          
          {/* Connection details */}
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">International Connections</h2>
              <p className="text-sm text-muted-foreground">Latest cross-border network activity</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium">Source</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Source Country</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Destination</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Destination Country</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Traffic</th>
                  </tr>
                </thead>
                <tbody>
                  {connections.slice(0, 5).map((conn, i) => (
                    <tr key={i} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm">{conn.source && typeof conn.source === 'object' && 'city' in conn.source ? conn.source.city : 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm">{conn.source && typeof conn.source === 'object' && 'country' in conn.source ? conn.source.country : 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm">{conn.destination && typeof conn.destination === 'object' && 'city' in conn.destination ? conn.destination.city : 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm">{conn.destination && typeof conn.destination === 'object' && 'country' in conn.destination ? conn.destination.country : 'Unknown'}</td>
                      <td className="px-4 py-3 text-sm">{((conn.bytes_sent || 0) + (conn.bytes_received || 0)).toLocaleString()} bytes</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 