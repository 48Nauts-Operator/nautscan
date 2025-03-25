import { useEffect, useRef, useState } from 'react';
import { Box, Tooltip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { feature } from 'topojson-client';
import { Feature, Geometry } from 'geojson';
import { geoPath, geoMercator } from 'd3-geo';

type ConnectionType = 'dns' | 'web' | 'api' | 'main';

interface Location {
  lat: number;
  lng: number;
  city?: string;
}

interface Connection {
  source: Location;
  destination: Location;
  type: ConnectionType;
  traffic?: number;
}

// Convert lat/lng to SVG coordinates
function latLngToPoint(lat: number, lng: number, width: number, height: number): [number, number] {
  const x = ((lng + 180) * width) / 360;
  const y = ((90 - lat) * height) / 180;
  return [x, y];
}

// Create a curved path between two points
function createCurvedPath(start: [number, number], end: [number, number]): string {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const curve = Math.min(Math.abs(dx) * 0.5, 100);
  const midY = (start[1] + end[1]) / 2 - curve;
  return `M ${start[0]},${start[1]} Q ${(start[0] + end[0]) / 2},${midY} ${end[0]},${end[1]}`;
}

// Connection type colors with better contrast
const CONNECTION_TYPES: Record<ConnectionType, { color: string; label: string }> = {
  dns: { color: 'rgba(0, 255, 255, 0.8)', label: 'DNS Traffic' },
  web: { color: 'rgba(255, 140, 0, 0.8)', label: 'Web Traffic' },
  api: { color: 'rgba(255, 0, 255, 0.8)', label: 'API Traffic' },
  main: { color: 'rgba(0, 255, 255, 0.8)', label: 'Main Traffic' }
};

export default function WorldMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [worldData, setWorldData] = useState<Feature<Geometry>[]>([]);
  const [loading, setLoading] = useState(true);

  // Set up the map projection with smaller scale
  const projection = geoMercator()
    .scale(150)
    .translate([400, 200])
    .center([0, 20]);

  useEffect(() => {
    // Fetch world map data
    fetch('/world-110m.json')
      .then(response => response.json())
      .then(topology => {
        const countries = feature(topology, topology.objects.countries);
        setWorldData((countries as any).features);
      })
      .catch(error => {
        console.error('Error loading world map data:', error);
      });

    // Fetch connection data
    async function fetchConnections() {
      try {
        const response = await fetch('/api/connections');
        const data = await response.json();
        setConnections(data);
      } catch (error) {
        console.error('Error fetching connections:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchConnections();
  }, []);

  if (loading) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(0, 255, 255, 0.8)',
          backgroundColor: '#000814',
        }}
      >
        Loading map data...
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex', 
      flexDirection: 'column',
      gap: 2,
    }}>
      {/* Map Container */}
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '50%',
          position: 'relative',
          backgroundColor: '#000814',
          overflow: 'hidden',
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 400"
          preserveAspectRatio="xMidYMid meet"
          style={{
            filter: 'drop-shadow(0 0 2px rgba(0, 255, 255, 0.3))',
          }}
        >
          {/* World map */}
          <g>
            {worldData.map((country, i) => (
              <path
                key={i}
                d={geoPath().projection(projection)(country) || ''}
                fill="rgba(30, 41, 59, 0.8)"
                stroke="rgba(0, 255, 255, 0.1)"
                strokeWidth="0.5"
              />
            ))}
          </g>

          {/* Connection lines */}
          {connections.map((connection, index) => {
            const start = projection([connection.source.lng, connection.source.lat]) as [number, number];
            const end = projection([connection.destination.lng, connection.destination.lat]) as [number, number];
            const pathId = `connection-${index}`;
            const connectionColor = CONNECTION_TYPES[connection.type]?.color || CONNECTION_TYPES.main.color;

            return (
              <g key={index}>
                <defs>
                  <path id={pathId} d={createCurvedPath(start, end)} />
                  <filter id={`glow-${index}`}>
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <use
                  href={`#${pathId}`}
                  stroke={connectionColor}
                  strokeWidth="2"
                  fill="none"
                  opacity="0.8"
                  filter={`url(#glow-${index})`}
                  strokeDasharray="1000"
                  strokeDashoffset="1000"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="1000"
                    to="0"
                    dur="3s"
                    fill="freeze"
                  />
                </use>
                <Tooltip title={`${connection.source.city || 'Unknown'} (${connection.traffic || 0} MB/s)`}>
                  <circle
                    cx={start[0]}
                    cy={start[1]}
                    r="3"
                    fill={connectionColor}
                    filter={`url(#glow-${index})`}
                    style={{ cursor: 'pointer' }}
                  />
                </Tooltip>
                <Tooltip title={`${connection.destination.city || 'Unknown'} (${connection.traffic || 0} MB/s)`}>
                  <circle
                    cx={end[0]}
                    cy={end[1]}
                    r="3"
                    fill={connectionColor}
                    filter={`url(#glow-${index})`}
                    style={{ cursor: 'pointer' }}
                  />
                </Tooltip>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: 2,
            borderRadius: 1,
            color: '#fff',
          }}
        >
          {Object.entries(CONNECTION_TYPES).map(([type, { color, label }]) => (
            <Box
              key={type}
              sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 1,
                '&:last-child': { mb: 0 },
              }}
            >
              <Box
                sx={{
                  width: 20,
                  height: 2,
                  backgroundColor: color,
                  mr: 1,
                  boxShadow: `0 0 4px ${color}`,
                }}
              />
              <Box sx={{ fontSize: '0.8rem' }}>{label}</Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Connection Table */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          flex: 1,
          backgroundColor: 'rgba(30, 41, 59, 0.8)',
          '& .MuiTableCell-root': {
            color: 'white',
            borderColor: 'rgba(0, 255, 255, 0.1)',
            padding: '8px 16px',
          },
          '& .MuiTableHead-root': {
            '& .MuiTableCell-root': {
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              fontWeight: 'bold',
            },
          },
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Application</TableCell>
              <TableCell>Total Data (Traffic %)</TableCell>
              <TableCell>Download</TableCell>
              <TableCell>Upload</TableCell>
              <TableCell>Top Client</TableCell>
              <TableCell align="right">Clients</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              {
                app: 'HTTP Proxy Server',
                icon: '🌐',
                totalData: '7.30 GB (34.3%)',
                download: '7.26 GB',
                upload: '38.0 MB',
                topClient: 'Mac Studio',
                clients: 4
              },
              {
                app: 'SSL/TLS',
                icon: '🔒',
                totalData: '5.76 GB (27.1%)',
                download: '4.76 GB',
                upload: '991 MB',
                topClient: 'Mac Studio',
                clients: 36
              },
              {
                app: 'YouTube',
                icon: '▶️',
                totalData: '2.43 GB (11.4%)',
                download: '2.40 GB',
                upload: '26.7 MB',
                topClient: 'Scooby-2',
                clients: 4
              }
            ].map((row, index) => (
              <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{row.icon}</span>
                    {row.app}
                  </Box>
                </TableCell>
                <TableCell>{row.totalData}</TableCell>
                <TableCell>{row.download}</TableCell>
                <TableCell>{row.upload}</TableCell>
                <TableCell>{row.topClient}</TableCell>
                <TableCell align="right">{row.clients}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
} 