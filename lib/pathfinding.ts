import { ImportantLocation, Scan } from './store';

interface Point3D {
  lat: number;
  lng: number;
  alt: number;
}

interface Obstacle {
  position: Point3D;
  radius: number;
}

// A* pathfinding algorithm for 3D navigation
export function findPath(
  start: Point3D,
  end: Point3D,
  obstacles: Obstacle[]
): Point3D[] {
  const distance = (a: Point3D, b: Point3D) => {
    const dx = (a.lng - b.lng) * 100000;
    const dy = a.alt - b.alt;
    const dz = (a.lat - b.lat) * 100000;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  const isPathClear = (from: Point3D, to: Point3D): boolean => {
    for (const obstacle of obstacles) {
      const midPoint = {
        lat: (from.lat + to.lat) / 2,
        lng: (from.lng + to.lng) / 2,
        alt: (from.alt + to.alt) / 2,
      };
      if (distance(midPoint, obstacle.position) < obstacle.radius * 2) {
        return false;
      }
    }
    return true;
  };

  // Simple waypoint-based pathfinding
  const waypoints: Point3D[] = [start];
  
  // Calculate number of intermediate points based on distance
  const totalDistance = distance(start, end);
  const numWaypoints = Math.max(3, Math.floor(totalDistance / 5));

  for (let i = 1; i < numWaypoints; i++) {
    const t = i / numWaypoints;
    let waypoint = {
      lat: start.lat + (end.lat - start.lat) * t,
      lng: start.lng + (end.lng - start.lng) * t,
      alt: start.alt + (end.alt - start.alt) * t + Math.sin(t * Math.PI) * 2, // Arc over obstacles
    };

    // Avoid obstacles by adjusting waypoint
    for (const obstacle of obstacles) {
      const dist = distance(waypoint, obstacle.position);
      if (dist < obstacle.radius * 3) {
        // Push waypoint away from obstacle
        const angle = Math.random() * Math.PI * 2;
        waypoint = {
          lat: waypoint.lat + Math.cos(angle) * 0.00005,
          lng: waypoint.lng + Math.sin(angle) * 0.00005,
          alt: waypoint.alt + 1,
        };
      }
    }

    waypoints.push(waypoint);
  }

  waypoints.push(end);
  return waypoints;
}

// Convert scans to obstacles for pathfinding
export function scansToObstacles(scans: Scan[]): Obstacle[] {
  return scans
    .filter((scan) => scan.threatLevel === 'high' || scan.threatLevel === 'medium')
    .map((scan) => ({
      position: {
        lat: scan.latitude,
        lng: scan.longitude,
        alt: scan.altitude,
      },
      radius: scan.threatLevel === 'high' ? 0.0001 : 0.00005,
    }));
}

// Get default important locations for Etinuxe community
export function getDefaultLocations(userLocation: Point3D): ImportantLocation[] {
  return [
    {
      id: 'homebase',
      type: 'homebase',
      name: 'Home Base',
      latitude: userLocation.lat + 0.0002,
      longitude: userLocation.lng - 0.0003,
      altitude: 0,
      description: 'Main underground settlement and command center',
      color: '#a855f7',
      icon: 'Home',
    },
    {
      id: 'lab-alpha',
      type: 'lab',
      name: "Dr. Miniature's Lab",
      latitude: userLocation.lat - 0.0001,
      longitude: userLocation.lng + 0.0004,
      altitude: 1,
      description: 'Original research facility with ongoing experiments',
      color: '#9333ea',
      icon: 'FlaskConical',
    },
    {
      id: 'shelter-1',
      type: 'shelter',
      name: 'Emergency Shelter Alpha',
      latitude: userLocation.lat + 0.0003,
      longitude: userLocation.lng + 0.0002,
      altitude: 0,
      description: 'Reinforced shelter for cat attacks and other threats',
      color: '#c026d3',
      icon: 'Shield',
    },
    {
      id: 'medcenter',
      type: 'medcenter',
      name: 'Medical Center',
      latitude: userLocation.lat - 0.0002,
      longitude: userLocation.lng - 0.0001,
      altitude: 0,
      description: 'Emergency medical facility with miniature equipment',
      color: '#e879f9',
      icon: 'HeartPulse',
    },
    {
      id: 'safepoint-1',
      type: 'safepoint',
      name: 'Safe Point Beta',
      latitude: userLocation.lat + 0.0001,
      longitude: userLocation.lng + 0.0003,
      altitude: 2,
      description: 'Elevated safe observation point',
      color: '#7c3aed',
      icon: 'Telescope',
    },
    {
      id: 'food-storage',
      type: 'food',
      name: 'Food Storage',
      latitude: userLocation.lat - 0.0003,
      longitude: userLocation.lng + 0.0001,
      altitude: 0,
      description: 'Crumb collection and food preservation facility',
      color: '#a78bfa',
      icon: 'Cookie',
    },
    {
      id: 'water-source',
      type: 'water',
      name: 'Water Collection Point',
      latitude: userLocation.lat + 0.0004,
      longitude: userLocation.lng - 0.0002,
      altitude: 0,
      description: 'Fresh water droplet harvesting station',
      color: '#8b5cf6',
      icon: 'Droplet',
    },
  ];
}
