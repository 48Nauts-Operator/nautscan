// @ts-nocheck
import React, { useState, useEffect } from 'react';

interface Connection {
  source: {
    lat: number;
    lng: number;
    city?: string;
    country?: string;
  };
  destination: {
    lat: number;
    lng: number;
    city?: string;
    country?: string;
  };
  type: 'dns' | 'web' | 'api' | 'main';
  traffic?: number;
}

// Enhanced SVG-based 2D world map 
export default function TwoDWorldMap({ connections = [] }: { connections?: Connection[] }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Set a loading state for better UX
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Map dimensions
  const width = 800;
  const height = 400;
  
  // Convert lat/lng to SVG coordinates
  const latLngToPoint = (lat: number, lng: number) => {
    const x = ((lng + 180) * width) / 360;
    const y = ((90 - lat) * height) / 180;
    return { x, y };
  };
  
  // Connection type colors - matching the 3D map
  const colorMap: Record<string, string> = {
    dns: '#f59e0b',  // Amber/yellow for DNS
    web: '#3b82f6',  // Blue for web traffic
    api: '#10b981',  // Green for API
    main: '#ef4444',  // Red for main/other
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-blue-950/10">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-cyan-300">Loading world map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Legend panel */}
      <div className="absolute top-2 right-2 bg-background/80 border border-primary/30 rounded-sm p-2 backdrop-blur-sm z-10 shadow-lg">
        <div className="text-xs font-mono mb-1 text-primary">Connection Types</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          <div className="flex items-center">
            <span className="w-2 h-2 rounded-full mr-1" style={{backgroundColor: colorMap.web}}></span> 
            <span className="text-xs">Web</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 rounded-full mr-1" style={{backgroundColor: colorMap.api}}></span> 
            <span className="text-xs">API</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 rounded-full mr-1" style={{backgroundColor: colorMap.dns}}></span> 
            <span className="text-xs">DNS</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 rounded-full mr-1" style={{backgroundColor: colorMap.main}}></span> 
            <span className="text-xs">Other</span>
          </div>
        </div>
      </div>
      
      <svg width="100%" height="100%" viewBox="0 0 800 400" className="bg-gradient-to-b from-blue-950/30 to-blue-900/10">
        {/* Background gradient */}
        <defs>
          <linearGradient id="ocean-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0c2d48" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#071b2e" stopOpacity="0.2" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Ocean background */}
        <rect x="0" y="0" width={width} height={height} fill="url(#ocean-gradient)" />
        
        {/* Create a detailed world map grid */}
        <g className="world-grid" opacity="0.3">
          {/* Draw meridians */}
          {Array.from({length: 24}).map((_, i) => (
            <line 
              key={`meridian-${i}`} 
              x1={i * (width / 24)} 
              y1="0" 
              x2={i * (width / 24)} 
              y2={height} 
              stroke="#2a4365" 
              strokeWidth="0.5"
              strokeDasharray="2,2" 
            />
          ))}
          
          {/* Draw parallels */}
          {Array.from({length: 12}).map((_, i) => (
            <line 
              key={`parallel-${i}`} 
              x1="0" 
              y1={i * (height / 12)} 
              x2={width} 
              y2={i * (height / 12)} 
              stroke="#2a4365" 
              strokeWidth="0.5"
              strokeDasharray="2,2" 
            />
          ))}
          
          {/* Draw equator */}
          <line 
            x1="0" 
            y1={height/2} 
            x2={width} 
            y2={height/2} 
            stroke="#3182ce" 
            strokeWidth="1"
            strokeDasharray="5,3" 
          />
          
          {/* Draw prime meridian */}
          <line 
            x1={width/2} 
            y1="0" 
            x2={width/2} 
            y2={height} 
            stroke="#3182ce" 
            strokeWidth="1"
            strokeDasharray="5,3" 
          />
        </g>
        
        {/* Draw enhanced simplified continents */}
        <g className="continents" fill="none" stroke="#4299e1" strokeWidth="1" opacity="0.6">
          {/* North America */}
          <path d="M 150,100 C 170,80 190,70 210,80 L 240,85 C 260,90 270,110 280,130 L 270,150 C 250,170 230,180 200,170 L 180,150 C 160,130 150,110 150,100 Z" />
          
          {/* South America */}
          <path d="M 220,180 C 230,190 240,210 235,230 L 230,260 C 220,280 210,290 200,280 L 190,260 C 195,240 200,220 210,200 L 220,180 Z" />
          
          {/* Europe */}
          <path d="M 400,90 C 420,80 440,85 460,90 L 450,100 C 440,110 430,120 410,125 L 390,120 C 380,110 390,95 400,90 Z" />
          
          {/* Africa */}
          <path d="M 410,140 C 440,130 460,150 470,170 L 460,200 C 450,230 440,240 430,240 L 410,220 C 400,200 400,160 410,140 Z" />
          
          {/* Asia */}
          <path d="M 470,90 C 500,70 530,80 560,90 L 600,110 C 620,130 630,150 620,170 L 590,160 C 560,150 530,140 510,130 L 490,110 C 480,100 470,90 470,90 Z" />
          
          {/* Australia */}
          <path d="M 650,220 C 670,210 690,220 700,240 L 680,260 C 660,270 640,260 630,240 L 650,220 Z" />
          
          {/* Antarctica */}
          <path d="M 300,350 C 350,340 400,345 450,350 L 500,360 C 450,370 400,375 350,370 L 300,350 Z" />
        </g>
        
        {/* Draw connections */}
        {Array.isArray(connections) && connections.length > 0 ? connections.map((connection, index) => {
          if (!connection.source || !connection.destination) return null;
          
          try {
            // Convert lat/lng to SVG coordinates
            const startPoint = latLngToPoint(connection.source.lat, connection.source.lng);
            const endPoint = latLngToPoint(connection.destination.lat, connection.destination.lng);
            
            // Create a curved path between points
            const dx = endPoint.x - startPoint.x;
            const dy = endPoint.y - startPoint.y;
            const dr = Math.sqrt(dx * dx + dy * dy) * 1.2;
            
            // Handle the special case for connections crossing the date line
            // For example: if one point is near longitude 179 and the other near -179
            let pathData;
            
            if (Math.abs(dx) > width / 2) {
              // Connection crosses the date line, draw two arcs
              const midLeft = { x: 0, y: (startPoint.y + endPoint.y) / 2 };
              const midRight = { x: width, y: (startPoint.y + endPoint.y) / 2 };
              
              if (startPoint.x > endPoint.x) {
                // start is on right, end is on left
                pathData = `M${startPoint.x},${startPoint.y} Q${startPoint.x + 50},${startPoint.y - 50} ${midRight.x},${midRight.y} M${midLeft.x},${midLeft.y} Q${endPoint.x - 50},${endPoint.y - 50} ${endPoint.x},${endPoint.y}`;
              } else {
                // start is on left, end is on right
                pathData = `M${startPoint.x},${startPoint.y} Q${startPoint.x - 50},${startPoint.y - 50} ${midLeft.x},${midLeft.y} M${midRight.x},${midRight.y} Q${endPoint.x + 50},${endPoint.y - 50} ${endPoint.x},${endPoint.y}`;
              }
            } else {
              // Normal case - draw a single arc
              pathData = `M${startPoint.x},${startPoint.y} A${dr},${dr} 0 0,1 ${endPoint.x},${endPoint.y}`;
            }
            
            // Determine color based on connection type
            const color = colorMap[connection.type] || colorMap.main;
            
            // Calculate the midpoint of the path for placing the tooltip
            const midX = (startPoint.x + endPoint.x) / 2;
            const midY = (startPoint.y + endPoint.y) / 2 - 20; // Offset slightly above the path
            
            return (
              <g key={`connection-${index}`} className="connection">
                {/* Curved connection line with glow effect */}
                <path 
                  d={pathData} 
                  fill="none" 
                  stroke={color} 
                  strokeWidth="1.5"
                  strokeOpacity="0.7"
                  className="connection-path"
                  filter="url(#glow)"
                />
                
                {/* Source dot */}
                <circle 
                  cx={startPoint.x} 
                  cy={startPoint.y} 
                  r="3" 
                  fill={color} 
                  className="source-dot"
                >
                  <title>{connection.source.city || connection.source.country || 'Unknown location'}</title>
                </circle>
                
                {/* Destination dot */}
                <circle 
                  cx={endPoint.x} 
                  cy={endPoint.y} 
                  r="3" 
                  fill={color} 
                  className="destination-dot"
                >
                  <title>{connection.destination.city || connection.destination.country || 'Unknown location'}</title>
                </circle>
                
                {/* Traffic indicator - size based on traffic amount */}
                {connection.traffic && (
                  <circle 
                    cx={midX} 
                    cy={midY} 
                    r={Math.min(Math.max(3, connection.traffic / 300), 8)} 
                    fill={color} 
                    fillOpacity="0.5"
                    className="traffic-indicator"
                  >
                    <title>{connection.traffic.toLocaleString()} bytes</title>
                  </circle>
                )}
              </g>
            );
          } catch (error) {
            console.error('Error rendering 2D connection:', error);
            return null;
          }
        }) : (
          <text 
            x="400" 
            y="200" 
            textAnchor="middle" 
            fill="#a0aec0" 
            fontSize="14"
            fontFamily="monospace"
          >
            No connection data available
          </text>
        )}
        
        {/* Map compass */}
        <g transform="translate(760, 360)" className="compass">
          <circle cx="0" cy="0" r="15" fill="rgba(0, 0, 0, 0.5)" />
          <line x1="0" y1="-10" x2="0" y2="10" stroke="white" strokeWidth="1" />
          <line x1="-10" y1="0" x2="10" y2="0" stroke="white" strokeWidth="1" />
          <text x="0" y="-18" textAnchor="middle" fill="white" fontSize="8">N</text>
          <text x="18" y="0" textAnchor="middle" fill="white" fontSize="8" dominantBaseline="middle">E</text>
          <text x="0" y="18" textAnchor="middle" fill="white" fontSize="8">S</text>
          <text x="-18" y="0" textAnchor="middle" fill="white" fontSize="8" dominantBaseline="middle">W</text>
        </g>
      </svg>
    </div>
  );
} 