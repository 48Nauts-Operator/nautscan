// @ts-nocheck
// Reference type declarations
/// <reference path="../three-types.d.ts" />
/// <reference path="../module-declarations.d.ts" />

import { useRef, useEffect, useState, Suspense, useMemo } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture, Html } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three/src/loaders/TextureLoader';

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

// Enhanced helper function to convert latitude and longitude to 3D coordinates
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

// Connection type colors with improved palette
const CONNECTION_TYPES: Record<string, string> = {
  dns: '#f59e0b',  // Amber/yellow for DNS
  web: '#3b82f6',  // Blue for web traffic
  api: '#10b981',  // Green for API
  main: '#ef4444',  // Red for main/other
};

// Atmosphere shader component with improved glow effect
const Atmosphere = ({ radius = 5, opacity = 0.15 }: { radius?: number, opacity?: number }) => {
  // Use a simpler implementation without custom shaders
  return (
    <mesh scale={[1.1, 1.1, 1.1]}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshBasicMaterial
        color="#1e90ff"
        transparent={true}
        opacity={opacity}
        side={THREE.BackSide}
      />
    </mesh>
  );
};

// Enhanced loading fallback with spinner animation
function LoadingFallback() {
  return (
    <Html center>
      <div className="bg-black/80 text-white p-4 rounded shadow-lg text-center">
        <div className="animate-spin w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Loading Earth textures...</p>
      </div>
    </Html>
  );
}

// Enhanced stars background with simpler implementation
function Stars({ count = 5000 }) {
  const starsRef = useRef();
  
  useEffect(() => {
    if (!starsRef.current) return;
    
    // Create a simpler star field
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.07,
      sizeAttenuation: true,
    });
    
    const starsVertices = [];
    
    // Create a more basic star distribution
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 200;
      const y = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 200;
      
      starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(starsVertices, 3)
    );
    
    starsRef.current.geometry = starsGeometry;
    starsRef.current.material = starsMaterial;
    
  }, [count]);
  
  return <points ref={starsRef} />;
}

// Arc connection component for visualizing paths between points
function ArcConnection({ start, end, color, height = 1, segments = 50, width = 0.05, pulse = false }) {
  const curveRef = useRef<THREE.Line | null>(null);
  const matRef = useRef<THREE.LineBasicMaterial | null>(null);
  const initialOpacity = 0.7;
  
  // Generate arc points
  const points = useMemo(() => {
    // Ensure both start and end are valid 3D vectors
    if (!start || !end || !start.x || !end.x) {
      console.warn("Invalid start or end point for ArcConnection", { start, end });
      return [];
    }
    
    try {
      const startV = new THREE.Vector3(start.x, start.y, start.z);
      const endV = new THREE.Vector3(end.x, end.y, end.z);
      
      // Calculate the midpoint and add height
      const midV = new THREE.Vector3().addVectors(startV, endV).divideScalar(2);
      const distance = startV.distanceTo(endV);
      
      // Adjust height based on distance
      const arcHeight = distance * 0.4 * height;
      
      // Find normal to create a curve
      const normal = new THREE.Vector3().crossVectors(
        startV, 
        endV
      ).normalize();
      
      if (normal.length() === 0 || !isFinite(normal.x) || !isFinite(normal.y) || !isFinite(normal.z)) {
        // If points are too close or calculation fails, use up vector
        normal.set(0, 1, 0);
      }
      
      // Apply height to the midpoint
      midV.add(normal.multiplyScalar(arcHeight));
      
      // Create Quadratic Bezier curve
      const curve = new THREE.QuadraticBezierCurve3(startV, midV, endV);
      
      // Generate points along the curve
      return curve.getPoints(segments);
    } catch (error) {
      console.error("Error generating arc curve:", error);
      return [];
    }
  }, [start, end, height, segments]);
  
  // Create geometry from points
  const geometry = useMemo(() => {
    if (points.length === 0) {
      // Return empty geometry if we have no points
      return new THREE.BufferGeometry();
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);
  
  // Animate the pulse effect
  useFrame(({ clock }) => {
    if (pulse && matRef.current) {
      const time = clock.getElapsedTime();
      // Pulsing opacity effect
      matRef.current.opacity = initialOpacity * (0.7 + 0.3 * Math.sin(time * 2));
    }
  });
  
  // Only render if we have valid points
  if (points.length === 0) {
    return null;
  }
  
  return (
    <line ref={curveRef} geometry={geometry}>
      <lineBasicMaterial 
        ref={matRef}
        color={color}
        transparent={true}
        opacity={initialOpacity}
        linewidth={width}
      />
    </line>
  );
}

// Enhanced Globe component with improved performance
function Globe({ connections }: { connections: Connection[] }) {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  const [hoverInfo, setHoverInfo] = useState<{ position: THREE.Vector3, text: string } | null>(null);
  const [textureError, setTextureError] = useState<boolean>(false);
  const [textures, setTextures] = useState<{ 
    earthTexture: THREE.Texture | null,
    bumpMap: THREE.Texture | null,
    cloudsTexture: THREE.Texture | null,
    specularMap: THREE.Texture | null,
    normalMap: THREE.Texture | null,
  }>({
    earthTexture: null, 
    bumpMap: null, 
    cloudsTexture: null,
    specularMap: null,
    normalMap: null
  });
  
  // Globe radius
  const GLOBE_RADIUS = 5;
  
  // Load earth textures with enhanced error handling
  useEffect(() => {
    let isMounted = true;
    
    async function loadTextures() {
      try {
        console.log("Attempting to load Earth textures...");
        
        // Check if we should use direct URLs
        const useDirectUrls = typeof window !== 'undefined' && window.USE_DIRECT_TEXTURE_URLS === true;
        
        // Use appropriate URLs based on the flag
        const earthTextureUrl = useDirectUrls && window.EARTH_TEXTURE_URL ? 
          window.EARTH_TEXTURE_URL : '/earth_texture.jpg';
        const cloudsTextureUrl = useDirectUrls && window.EARTH_CLOUDS_URL ? 
          window.EARTH_CLOUDS_URL : '/earth_clouds.png';
          
        console.log("Loading earth texture from:", earthTextureUrl);
        console.log("Loading clouds texture from:", cloudsTextureUrl);
        
        // Try with explicit path from public folder
        const loader = new TextureLoader();
        loader.crossOrigin = "anonymous";
        
        try {
          const earthTexture = await loader.loadAsync(earthTextureUrl);
          const cloudsTexture = await loader.loadAsync(cloudsTextureUrl);
          
          // Set textures without any additional processing
          if (isMounted) {
            setTextures({ 
              earthTexture, 
              cloudsTexture, 
              bumpMap: null,
              specularMap: null,
              normalMap: null
            });
          }
        } catch (error) {
          console.error("Error loading textures:", error);
          if (isMounted) setTextureError(true);
        }
      } catch (error) {
        console.error("Error in texture loading process:", error);
        if (isMounted) setTextureError(true);
      }
    }
    
    loadTextures();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Handle globe rotation with smoother animation
  useFrame(({ clock }) => {
    if (groupRef.current) {
      // Apply a slight auto-rotation to the entire group
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.05;
    }
    
    if (cloudsRef.current) {
      // Clouds rotate slightly faster than Earth
      cloudsRef.current.rotation.y = clock.getElapsedTime() * 0.07;
    }
  });

  // Process connections for visualization
  const { connectionArcs, connectionPoints } = useMemo(() => {
    // Array to hold all connection lines
    const arcs = [];
    const points = [];
    
    // Only process if we have valid connections
    if (!connections || !Array.isArray(connections) || connections.length === 0) {
      console.log("No connections to process");
      return { connectionArcs: [], connectionPoints: [] };
    }
    
    // Process each connection
    connections.forEach((connection, index) => {
      try {
        // Skip invalid connections
        if (!connection || typeof connection !== 'object') {
          console.warn("Invalid connection object:", connection);
          return;
        }
        
        // Only process connections with valid coordinates
        if (!connection.source || !connection.destination ||
            typeof connection.source.lat !== 'number' || 
            typeof connection.source.lng !== 'number' ||
            typeof connection.destination.lat !== 'number' || 
            typeof connection.destination.lng !== 'number') {
          console.warn("Invalid connection data:", connection);
          return;
        }
        
        // Convert lat/lng to 3D vectors
        const sourcePos = latLngToVector3(
          connection.source.lat,
          connection.source.lng, 
          GLOBE_RADIUS
        );
        
        const destPos = latLngToVector3(
          connection.destination.lat,
          connection.destination.lng,
          GLOBE_RADIUS
        );
        
        // Verify positions are valid
        if (!sourcePos || !destPos || 
            !isFinite(sourcePos.x) || !isFinite(sourcePos.y) || !isFinite(sourcePos.z) ||
            !isFinite(destPos.x) || !isFinite(destPos.y) || !isFinite(destPos.z)) {
          console.warn("Invalid coordinates calculated:", { sourcePos, destPos });
          return;
        }
        
        // Determine color based on connection type
        const color = CONNECTION_TYPES[connection.type] || CONNECTION_TYPES.main;
        
        // Adjust height based on traffic value
        const height = connection.traffic ? 
          0.5 + Math.min(1.5, connection.traffic / 1000) : 
          1;
        
        // Create connection arc
        arcs.push(
          <ArcConnection 
            key={`arc-${index}`}
            start={sourcePos} 
            end={destPos} 
            color={color}
            height={height}
            pulse={true}
            width={0.05}
          />
        );
        
        // Create source and destination points
        points.push(
          <mesh 
            key={`source-${index}`} 
            position={sourcePos}
            onPointerOver={() => {
              const locationName = connection.source.city || connection.source.country || 'Unknown';
              setHoverInfo({
                position: sourcePos,
                text: `${locationName} (${(connection.traffic || 0).toLocaleString()} B)`
              });
            }}
            onPointerOut={() => setHoverInfo(null)}
          >
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>,
          <mesh 
            key={`dest-${index}`} 
            position={destPos}
            onPointerOver={() => {
              const locationName = connection.destination.city || connection.destination.country || 'Unknown';
              setHoverInfo({
                position: destPos,
                text: `${locationName}`
              });
            }}
            onPointerOut={() => setHoverInfo(null)}
          >
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      } catch (error) {
        console.error("Error processing connection:", error);
      }
    });
    
    return { connectionArcs: arcs, connectionPoints: points };
  }, [connections, GLOBE_RADIUS]);

  return (
    <group ref={groupRef}>
      {/* Earth - with enhanced materials and fallback */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        {textureError || !textures.earthTexture ? (
          // Enhanced fallback material - using meshBasicMaterial instead of meshPhongMaterial
          <meshBasicMaterial 
            color="#254a74" 
          />
        ) : (
          // Simplified Earth material - using meshBasicMaterial instead of meshPhysicalMaterial
          <meshBasicMaterial 
            map={textures.earthTexture} 
          />
        )}
      </mesh>
      
      {/* Add atmosphere glow effect */}
      <Atmosphere radius={GLOBE_RADIUS} opacity={0.15} />
      
      {/* Clouds layer - only if textures loaded successfully */}
      {!textureError && textures.cloudsTexture && (
        <mesh ref={cloudsRef} scale={[1.02, 1.02, 1.02]}>
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          <meshBasicMaterial 
            map={textures.cloudsTexture}
            transparent={true}
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      )}
      
      {/* Grid lines as fallback if textures fail to load */}
      {(textureError || !textures.earthTexture) && (
        <group>
          {/* Longitude lines */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * Math.PI * 2;
            const points = [];
            for (let j = 0; j <= 100; j++) {
              const phi = (j / 100) * Math.PI;
              const x = GLOBE_RADIUS * Math.sin(phi) * Math.cos(angle);
              const y = GLOBE_RADIUS * Math.cos(phi);
              const z = GLOBE_RADIUS * Math.sin(phi) * Math.sin(angle);
              points.push(new THREE.Vector3(x, y, z));
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            return (
              <line key={`long-${i}`} geometry={geometry}>
                <lineBasicMaterial attach="material" color="#113244" linewidth={1} />
              </line>
            );
          })}
          
          {/* Latitude lines */}
          {Array.from({ length: 12 }).map((_, i) => {
            const phi = (i / 12) * Math.PI;
            const points = [];
            for (let j = 0; j <= 100; j++) {
              const angle = (j / 100) * Math.PI * 2;
              const radius = GLOBE_RADIUS * Math.sin(phi);
              const x = radius * Math.cos(angle);
              const y = GLOBE_RADIUS * Math.cos(phi);
              const z = radius * Math.sin(angle);
              points.push(new THREE.Vector3(x, y, z));
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            return (
              <line key={`lat-${i}`} geometry={geometry}>
                <lineBasicMaterial attach="material" color="#113244" linewidth={1} />
              </line>
            );
          })}
        </group>
      )}
      
      {/* Connection arcs */}
      {connectionArcs}
      
      {/* Connection points */}
      {connectionPoints}
      
      {/* Hover information */}
      {hoverInfo && (
        <sprite position={hoverInfo.position.clone().multiplyScalar(1.1)}>
          <spriteMaterial attach="material" map={null} />
          <Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
            <div className="bg-black/70 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
              {hoverInfo.text}
            </div>
          </Html>
        </sprite>
      )}
    </group>
  );
}

// Connection legend component
function ConnectionLegend() {
  return (
    <Html position={[-10, 8, 0]} style={{ pointerEvents: 'none' }}>
      <div className="bg-black/70 text-white text-xs rounded px-3 py-2 shadow-lg border border-gray-700">
        <div className="font-bold mb-2">Connection Types</div>
        <div className="space-y-1">
          {Object.entries(CONNECTION_TYPES).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div style={{ backgroundColor: color }} className="w-3 h-3 rounded-full"></div>
              <div>{type.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>
    </Html>
  );
}

export default function ThreeDWorldMap({ connections = [] }: { connections?: Connection[] }) {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Start with loading state
    setLoading(true);
    // Set loading to false after a delay to avoid flickering
    const timer = setTimeout(() => setLoading(false), 500);
    
    return () => clearTimeout(timer);
  }, [connections]);

  return (
    <div className="w-full h-full">
      {loading ? (
        <div className="w-full h-full flex items-center justify-center bg-[#091320]">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-cyan-300">Loading 3D globe...</p>
          </div>
        </div>
      ) : (
        <Canvas 
          camera={{ position: [0, 0, 15], fov: 45 }}
          gl={{ 
            antialias: false,
            powerPreference: 'default',
            alpha: false,
            stencil: false
          }}
          shadows={false}
          dpr={1}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 10]} intensity={1} />
          <Stars count={2000} />
          <Suspense fallback={<LoadingFallback />}>
            <Globe connections={connections} />
            <ConnectionLegend />
          </Suspense>
          <OrbitControls 
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            minDistance={7}
            maxDistance={25}
            autoRotate={false}
          />
        </Canvas>
      )}
    </div>
  );
} 