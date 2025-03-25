# 3D World Map Visualization Documentation

## Overview
The 3D World Map component is a key feature of the NautScan application, providing an interactive visualization of network connections across the globe. It shows network traffic paths between different geographic locations in real-time with various visual indicators for different connection types.

## Implementation Details

### Technologies Used
- **Three.js**: A JavaScript 3D library that makes WebGL simpler to use
- **React Three Fiber**: React renderer for Three.js (creates a bridge between React and Three.js)
- **Drei**: A collection of useful helpers for React Three Fiber
- **TypeScript**: For type safety and better development experience

### Key Components

#### `ThreeDWorldMap.tsx`
The main component that renders the 3D earth globe with connection lines and points. It accepts a list of connections as props and visualizes them on the globe.

#### Globe Rendering
- Earth texture with bump mapping for realistic appearance
- Semi-transparent cloud layer
- Slowly rotating for aesthetic effect
- Stars in the background for depth

#### Connection Visualization
- Curved lines between source and destination points
- Color-coded connections based on connection type:
  - DNS Traffic: Cyan (`#00ffff`)
  - Web Traffic: Dark Orange (`#ff8c00`)
  - API Traffic: Magenta (`#ff00ff`)
  - Main Traffic: Cyan (`#00ffff`)
- Source and destination points represented as spheres
- Hover information showing details about the connection

#### Interactive Controls
- Orbit controls for rotating, panning, and zooming
- Hover effects for connection points to show additional information

## Usage

```tsx
import ThreeDWorldMap from '../components/ThreeDWorldMap';

// Sample connections data
const connections = [
  {
    source: { lat: 37.7749, lng: -122.4194, city: 'San Francisco' },
    destination: { lat: 51.5074, lng: -0.1278, city: 'London' },
    type: 'web',
    traffic: 2.4
  },
  // ... more connections
];

// In your component
<ThreeDWorldMap connections={connections} />
```

## Required Textures
The visualization uses the following texture images:
- `/public/earth_texture.jpg` - The main Earth texture
- `/public/earth_bump.jpg` - Bump map for elevation
- `/public/earth_clouds.png` - Semi-transparent clouds layer

## Future Improvements
- Add animated particles flowing along the connection paths
- Implement zoom-to-location functionality
- Add time filtering to show connections over specific time periods
- Improve performance for handling large numbers of connections
- Add day/night cycle visualization
- Implement heat map overlay option for traffic density

## Notes
- The component is dynamically imported with `{ ssr: false }` to prevent issues with server-side rendering, as Three.js requires a browser environment.
- The component includes fallback demo connections if none are provided through props.
- Interactive controls are limited to prevent extreme zoom-out or zoom-in. 