'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore, Scan, ImportantLocation } from '@/lib/store';
import { Navigation2, X, MapPin as MapPinIcon, Clock, Route as RouteIcon, ArrowRight, Search, Home, FlaskConical, Shield, HeartPulse, Telescope, Cookie, Droplet } from 'lucide-react';
import { getDefaultLocations } from '@/lib/pathfinding';
import { findOptimalPath, calculateTravelTime, formatTravelTime, formatDistance } from '@/lib/pathfinding-enhanced';
import { generateOrganicLayout } from '@/lib/map-generation';

// Icon mapping for lucide-react
const iconMap: Record<string, any> = {
  'Home': Home,
  'FlaskConical': FlaskConical,
  'Shield': Shield,
  'HeartPulse': HeartPulse,
  'Telescope': Telescope,
  'Cookie': Cookie,
  'Droplet': Droplet,
};

// Generate a more organic building layout with better coverage
const BUILDINGS = generateOrganicLayout(25, 100, 8, 20, 3.5);

// Map background with improved aesthetics
function MapBackground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[250, 250]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      
      {/* Subtle grid */}
      <gridHelper args={[250, 50, '#1a1a1a', '#1a1a1a']} position={[0, 0, 0]} />
      
      {/* Main streets */}
      {[-40, -20, 0, 20, 40].map((z, i) => (
        <mesh key={`h-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, z]}>
          <planeGeometry args={[250, 8]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
      {[-40, -20, 0, 20, 40].map((x, i) => (
        <mesh key={`v-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, 0]}>
          <planeGeometry args={[8, 250]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </>
  );
}

// 3D buildings - only show if camera has been used
function Buildings() {
  const { scans } = useAppStore();
  const hasCamera = scans.length > 0;
  
  if (!hasCamera) return null;
  
  return (
    <>
      {BUILDINGS.map((building, i) => (
        <mesh 
          key={i} 
          position={[building.x, 2, building.z]}
          rotation={[0, building.rotation, 0]}
          castShadow
        >
          <boxGeometry args={[building.width, 4, building.depth]} />
          <meshStandardMaterial color="#4a1d6d" roughness={0.8} metalness={0.1} emissive="#3d1759" emissiveIntensity={0.05} opacity={0.4} transparent />
        </mesh>
      ))}
    </>
  );
}

// Curved route visualization
function RouteVisualization({ points, userLocation }: { 
  points: Array<{ lat: number; lng: number; alt: number }>;
  userLocation: { lat: number; lng: number; alt: number } | null;
}) {
  const curve = useMemo(() => {
    if (!userLocation) return null;
    const worldPoints = points.map(point => {
      const x = (point.lng - userLocation.lng) * 100000;
      const z = -(point.lat - userLocation.lat) * 100000;
      return new THREE.Vector3(x, 0.5, z);
    });
    return new THREE.CatmullRomCurve3(worldPoints, false, 'catmullrom', 0.5);
  }, [points, userLocation]);

  const linePoints = useMemo(() => curve ? curve.getPoints(points.length * 5) : [], [curve, points]);

  if (!curve || linePoints.length === 0) return null;
  return <Line points={linePoints} color="#a855f7" lineWidth={6} />;
}

// 3D Location Marker - NO HTML OVERLAY
function LocationMarker({ location, userLocation, onClick }: {
  location: ImportantLocation;
  userLocation: { lat: number; lng: number; alt: number } | null;
  onClick: () => void;
}) {
  const worldX = (location.longitude - (userLocation?.lng || 0)) * 100000;
  const worldZ = -(location.latitude - (userLocation?.lat || 0)) * 100000;
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current && hovered) {
      meshRef.current.position.y = 2 + Math.sin(Date.now() * 0.003) * 0.3;
    } else if (meshRef.current) {
      meshRef.current.position.y = 2;
    }
  });

  return (
    <group 
      position={[worldX, 0, worldZ]} 
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Pin base */}
      <mesh ref={meshRef} scale={hovered ? 1.2 : 1}>
        <coneGeometry args={[1.5, 3, 8]} />
        <meshStandardMaterial color={location.color} emissive={location.color} emissiveIntensity={hovered ? 0.8 : 0.5} />
      </mesh>
      {/* Pin sphere */}
      <mesh position={[0, 3.5, 0]} scale={hovered ? 1.2 : 1}>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color={location.color} emissive={location.color} emissiveIntensity={1} />
      </mesh>
      {/* Glow ring */}
      {hovered && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
          <ringGeometry args={[2, 3, 32]} />
          <meshBasicMaterial color={location.color} transparent opacity={0.3} />
        </mesh>
      )}
    </group>
  );
}

// 3D Scan Marker
function ScanMarker({ scan, userLocation }: {
  scan: Scan;
  userLocation: { lat: number; lng: number; alt: number } | null;
}) {
  const worldX = (scan.longitude - (userLocation?.lng || 0)) * 100000;
  const worldZ = -(scan.latitude - (userLocation?.lat || 0)) * 100000;
  const color = scan.threatLevel === 'high' ? '#e53e3e' : scan.threatLevel === 'medium' ? '#dd6b20' : '#3182ce';
  
  return (
    <mesh position={[worldX, 1, worldZ]}>
      <octahedronGeometry args={[0.8, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
    </mesh>
  );
}

// 3D User Marker
function UserPosition() {
  const meshRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime();
    }
  });
  return (
    <group ref={meshRef} position={[0, 1.5, 0]}>
      <mesh>
        <coneGeometry args={[1, 2, 8]} />
        <meshStandardMaterial color="#38b2ac" emissive="#38b2ac" emissiveIntensity={0.6} />
      </mesh>
      <pointLight color="#38b2ac" intensity={5} distance={10} />
    </group>
  );
}

// Camera controller
function CameraController({ isNavigating }: { isNavigating: boolean }) {
  useFrame((state) => {
    const targetPosition = isNavigating 
      ? new THREE.Vector3(0, 40, 20) // Angled follow-cam
      : new THREE.Vector3(0, 90, 0.1); // Top-down overview
    
    state.camera.position.lerp(targetPosition, 0.05);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

// Main scene
function Scene({ isNavigating }: { isNavigating: boolean }) {
  const { scans, importantLocations, userLocation, navigationPath, setSelectedLocation } = useAppStore();
  return (
    <>
      <PerspectiveCamera makeDefault fov={60} position={[0, 90, 0.1]} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={20}
        maxDistance={150}
        maxPolarAngle={Math.PI / 2.2}
      />
      <CameraController isNavigating={isNavigating} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[50, 50, 50]} intensity={1} castShadow />
      <hemisphereLight groundColor="#1a202c" intensity={0.5} />

      <MapBackground />
      <Buildings />
      <UserPosition />
      
      {scans.map((scan) => <ScanMarker key={scan.id} scan={scan} userLocation={userLocation} />)}
      {importantLocations.map((loc) => <LocationMarker key={loc.id} location={loc} userLocation={userLocation} onClick={() => setSelectedLocation(loc)} />)}
      {navigationPath && <RouteVisualization points={navigationPath.points} userLocation={userLocation} />}
    </>
  );
}

// Main component
export default function Map3D() {
  const store = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  const isNavigating = !!store.navigationPath && !isNavigationReady;

  useEffect(() => {
    let watchId: number | null = null;
    
    if (navigator.geolocation) {
      // Watch position continuously to update map as user moves
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, alt: pos.coords.altitude || 0 };
          store.setUserLocation(loc);
          // Only set locations on first position update
          if (!store.importantLocations.length) {
            store.setImportantLocations(getDefaultLocations(loc));
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
          // Fallback to default location
          if (!store.userLocation) {
            const loc = { lat: 0, lng: 0, alt: 0 };
            store.setUserLocation(loc);
            store.setImportantLocations(getDefaultLocations(loc));
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000
        }
      );
    }
    
    fetchData();
    const interval = setInterval(fetchData, 5000);
    
    return () => {
      clearInterval(interval);
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/scans');
      const data = await res.json();
      store.setScans(data.scans || []);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const selectDestination = (location: ImportantLocation) => {
    if (!store.userLocation) return;
    setIsCalculating(true);
    setShowLocationMenu(false);
    store.setSelectedLocation(location);
    setTimeout(() => {
      const start = { x: 0, z: 0 };
      const end = { 
        x: (location.longitude - store.userLocation!.lng) * 100000, 
        z: -(location.latitude - store.userLocation!.lat) * 100000 
      };
      
      // Only use obstacles if camera is present/active (scans exist)
      const hasCamera = store.scans.length > 0;
      const obstacles = hasCamera ? BUILDINGS : [];
      
      console.log('Pathfinding:', { start, end, obstacleCount: obstacles.length, hasCamera });
      const path = findOptimalPath(start, end, obstacles, 1);
      console.log('Path found:', path.length, 'points');
      
      // Convert x/z points to lat/lng format for store
      const latLngPoints = path.map(p => ({
        lat: store.userLocation!.lat - (p.z / 100000),
        lng: store.userLocation!.lng + (p.x / 100000),
        alt: 0
      }));
      
      store.setNavigationPath({ 
        from: store.userLocation!, 
        to: { lat: location.latitude, lng: location.longitude, alt: location.altitude },
        points: latLngPoints
      });
      setIsNavigationReady(true);
      setIsCalculating(false);
    }, 100);
  };

  const startNavigation = () => {
    setIsNavigationReady(false);
  };

  const clearNavigation = () => {
    store.setNavigationPath(null);
    store.setSelectedLocation(null);
    setIsNavigationReady(false);
  };

  const travelInfo = useMemo(() => {
    if (!store.navigationPath || !store.userLocation) return { time: 0, distance: '' };
    // Convert lat/lng points back to x/z for calculations
    const xzPoints = store.navigationPath.points.map(p => ({
      x: (p.lng - store.userLocation!.lng) * 100000,
      z: -(p.lat - store.userLocation!.lat) * 100000
    }));
    const time = calculateTravelTime(xzPoints);
    const distance = formatDistance(xzPoints);
    return { time, distance };
  }, [store.navigationPath, store.userLocation]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-background">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <MapPinIcon className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-primary text-lg font-semibold mt-4">Loading Map...</div>
        <div className="text-muted-foreground text-sm mt-2">Initializing navigation system</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-background">
      <Canvas shadows><Scene isNavigating={isNavigating} /></Canvas>

      {/* Compact search bar */}
      {!isNavigating && !isNavigationReady && (
        <div className="absolute top-4 left-4 right-4 z-10">
          <button onClick={() => setShowLocationMenu(true)} className="w-full bg-card/95 backdrop-blur-sm hover:bg-secondary text-foreground px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 transition-all border border-border">
            <Search className="w-5 h-5 text-primary" />
            <span className="flex-1 text-left text-muted-foreground">Where to?</span>
          </button>
        </div>
      )}

      {/* Sidebar location menu instead of overlay */}
      {showLocationMenu && (
        <>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-20" onClick={() => setShowLocationMenu(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-80 bg-card/95 backdrop-blur-md shadow-2xl z-30 overflow-y-auto border-r border-border">
            <div className="sticky top-0 bg-card p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <MapPinIcon className="w-5 h-5 text-primary" />
                Destinations
              </h3>
              <button onClick={() => setShowLocationMenu(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3">
              {store.importantLocations.map((loc) => {
                const IconComponent = iconMap[loc.icon] || MapPinIcon;
                return (
                  <button
                    key={loc.id}
                    onClick={() => selectDestination(loc)}
                    disabled={isCalculating}
                    className="w-full text-left p-4 rounded-lg hover:bg-secondary transition-all flex items-center gap-3 mb-2 disabled:opacity-50 disabled:cursor-not-allowed group border border-transparent hover:border-border"
                  >
                    <div className="p-2 rounded-lg" style={{ backgroundColor: loc.color + '20', color: loc.color }}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{loc.name}</div>
                      <div className="text-sm text-muted-foreground truncate">{loc.description}</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-t border-border bg-secondary/50">
              <div className="text-xs text-muted-foreground text-center">
                {store.importantLocations.length} locations available
              </div>
            </div>
          </div>
        </>
      )}

      {/* Route preview with improved visuals */}
      {isNavigationReady && !isNavigating && store.selectedLocation && (
        <div className="absolute bottom-4 left-4 right-4 bg-card/95 backdrop-blur-md rounded-xl shadow-2xl z-10 border border-border p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: store.selectedLocation.color + '20', color: store.selectedLocation.color }}>
              {(() => {
                const IconComponent = iconMap[store.selectedLocation.icon] || MapPinIcon;
                return <IconComponent className="w-8 h-8" />;
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xl font-bold text-foreground">{store.selectedLocation.name}</div>
              <div className="text-sm text-muted-foreground mt-1">{store.selectedLocation.description}</div>
            </div>
            <button onClick={clearNavigation} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-secondary rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <Clock className="w-4 h-4" />
                <span>Travel Time</span>
              </div>
              <div className="text-2xl font-bold text-primary">{formatTravelTime(travelInfo.time)}</div>
              <div className="text-xs text-muted-foreground mt-1">miniature human on foot</div>
            </div>
            <div className="bg-secondary rounded-lg p-4 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
                <RouteIcon className="w-4 h-4" />
                <span>Distance</span>
              </div>
              <div className="text-2xl font-bold text-primary">{travelInfo.distance}</div>
              <div className="text-xs text-muted-foreground mt-1">safest route calculated</div>
            </div>
          </div>
          <button onClick={startNavigation} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-lg">
            <Navigation2 className="w-5 h-5" />
            Start Navigation
          </button>
        </div>
      )}

      {/* Active navigation - compact header */}
      {isNavigating && store.selectedLocation && (
        <div className="absolute top-4 left-4 right-4 bg-card/95 backdrop-blur-md rounded-xl shadow-xl z-10 border border-border p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground mb-1">Navigating to</div>
            <div className="text-lg font-bold text-foreground truncate">{store.selectedLocation.name}</div>
          </div>
          <div className="text-center bg-secondary rounded-lg px-4 py-2 border border-border">
            <div className="text-xs text-muted-foreground">ETA</div>
            <div className="text-base font-bold text-primary whitespace-nowrap">{formatTravelTime(travelInfo.time)}</div>
          </div>
          <div className="text-center bg-secondary rounded-lg px-4 py-2 border border-border">
            <div className="text-xs text-muted-foreground">Distance</div>
            <div className="text-base font-bold text-primary whitespace-nowrap">{travelInfo.distance}</div>
          </div>
          <button onClick={clearNavigation} className="text-muted-foreground hover:text-foreground transition-colors p-2">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
