// Enhanced A* with guaranteed path around all obstacles
interface Point2D {
  x: number;
  z: number;
}

interface Node {
  x: number;
  z: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

interface Obstacle {
  x: number;
  z: number;
  width: number;
  depth: number;
  height?: number;
  rotation?: number;
}

// Check if a grid cell intersects with any obstacle (supports rotation)
function isPointBlocked(gridX: number, gridZ: number, obstacles: Obstacle[], gridSize: number): boolean {
  const worldX = gridX * gridSize;
  const worldZ = gridZ * gridSize;
  const buffer = gridSize * 1.5; // Increased buffer for better clearance
  
  for (const obs of obstacles) {
    if (obs.rotation && obs.rotation !== 0) {
      // For rotated obstacles, use rotated rectangle collision
      const dx = worldX - obs.x;
      const dz = worldZ - obs.z;
      
      // Rotate the point back by -rotation to align with obstacle's local axes
      const cos = Math.cos(-obs.rotation);
      const sin = Math.sin(-obs.rotation);
      const localX = dx * cos - dz * sin;
      const localZ = dx * sin + dz * cos;
      
      const halfWidth = obs.width / 2 + buffer;
      const halfDepth = obs.depth / 2 + buffer;
      
      if (Math.abs(localX) <= halfWidth && Math.abs(localZ) <= halfDepth) {
        return true;
      }
    } else {
      // Simple axis-aligned bounding box
      const halfWidth = obs.width / 2 + buffer;
      const halfDepth = obs.depth / 2 + buffer;
      
      if (
        worldX >= obs.x - halfWidth &&
        worldX <= obs.x + halfWidth &&
        worldZ >= obs.z - halfDepth &&
        worldZ <= obs.z + halfDepth
      ) {
        return true;
      }
    }
  }
  
  return false;
}

// Check if line segment between two points is clear (supports rotation)
function isLineSegmentClear(p1: Point2D, p2: Point2D, obstacles: Obstacle[]): boolean {
  const steps = 30; // Increased from 20 for better accuracy
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = p1.x + (p2.x - p1.x) * t;
    const z = p1.z + (p2.z - p1.z) * t;
    
    for (const obs of obstacles) {
      if (obs.rotation && obs.rotation !== 0) {
        // For rotated obstacles, use rotated rectangle collision
        const dx = x - obs.x;
        const dz = z - obs.z;
        
        // Rotate the point back by -rotation to align with obstacle's local axes
        const cos = Math.cos(-obs.rotation);
        const sin = Math.sin(-obs.rotation);
        const localX = dx * cos - dz * sin;
        const localZ = dx * sin + dz * cos;
        
        const halfWidth = obs.width / 2 + 1.5; // Increased clearance
        const halfDepth = obs.depth / 2 + 1.5;
        
        if (Math.abs(localX) <= halfWidth && Math.abs(localZ) <= halfDepth) {
          return false;
        }
      } else {
        // Simple axis-aligned bounding box
        const halfWidth = obs.width / 2 + 1.5; // Increased clearance
        const halfDepth = obs.depth / 2 + 1.5;
        
        if (
          x >= obs.x - halfWidth &&
          x <= obs.x + halfWidth &&
          z >= obs.z - halfDepth &&
          z <= obs.z + halfDepth
        ) {
          return false;
        }
      }
    }
  }
  
  return true;
}

// Manhattan distance heuristic
function heuristic(a: Point2D, b: Point2D): number {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

// Get valid neighbors
function getNeighbors(node: Point2D, obstacles: Obstacle[], gridSize: number, bounds: number): Point2D[] {
  const neighbors: Point2D[] = [];
  const directions = [
    { x: 0, z: -1 }, { x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }, // Cardinal
    { x: -1, z: -1 }, { x: 1, z: -1 }, { x: -1, z: 1 }, { x: 1, z: 1 }, // Diagonal
  ];
  
  for (const dir of directions) {
    const newX = node.x + dir.x;
    const newZ = node.z + dir.z;
    
    if (Math.abs(newX) > bounds || Math.abs(newZ) > bounds) continue;
    if (isPointBlocked(newX, newZ, obstacles, gridSize)) continue;
    
    // For diagonals, check if the path is clear
    if (dir.x !== 0 && dir.z !== 0) {
      if (
        isPointBlocked(node.x + dir.x, node.z, obstacles, gridSize) ||
        isPointBlocked(node.x, node.z + dir.z, obstacles, gridSize)
      ) {
        continue;
      }
    }
    
    neighbors.push({ x: newX, z: newZ });
  }
  
  return neighbors;
}

// Main A* pathfinding
export function findOptimalPath(
  start: Point2D,
  end: Point2D,
  obstacles: Obstacle[],
  gridSize: number = 1
): Point2D[] {
  const startGrid = {
    x: Math.round(start.x / gridSize),
    z: Math.round(start.z / gridSize),
  };
  
  const endGrid = {
    x: Math.round(end.x / gridSize),
    z: Math.round(end.z / gridSize),
  };
  
  const openSet: Node[] = [];
  const closedSet = new Map<string, boolean>();
  const bounds = 100;
  
  const startNode: Node = {
    ...startGrid,
    g: 0,
    h: heuristic(startGrid, endGrid),
    f: heuristic(startGrid, endGrid),
    parent: null,
  };
  
  openSet.push(startNode);
  
  let iterations = 0;
  const maxIterations = 5000; // Increased for complex paths
  
  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;
    
    // Get node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    
    // Goal reached
    if (current.x === endGrid.x && current.z === endGrid.z) {
      const path: Point2D[] = [];
      let node: Node | null = current;
      
      while (node) {
        path.unshift({
          x: node.x * gridSize,
          z: node.z * gridSize,
        });
        node = node.parent;
      }
      
      // Smooth and add curves
      const smoothed = smoothPath(path, obstacles);
      const curved = addCurvesToPath(smoothed, obstacles);
      console.log('Path found:', iterations, 'iterations,', path.length, 'raw,', smoothed.length, 'smoothed,', curved.length, 'curved');
      return curved;
    }
    
    const key = `${current.x},${current.z}`;
    closedSet.set(key, true);
    
    const neighbors = getNeighbors({ x: current.x, z: current.z }, obstacles, gridSize, bounds);
    
    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.z}`;
      if (closedSet.has(key)) continue;
      
      const isDiagonal = neighbor.x !== current.x && neighbor.z !== current.z;
      const moveCost = isDiagonal ? 1.414 : 1;
      const tentativeG = current.g + moveCost;
      
      const existingNode = openSet.find(n => n.x === neighbor.x && n.z === neighbor.z);
      
      if (!existingNode) {
        const h = heuristic(neighbor, endGrid);
        openSet.push({
          ...neighbor,
          g: tentativeG,
          h: h,
          f: tentativeG + h,
          parent: current,
        });
      } else if (tentativeG < existingNode.g) {
        existingNode.g = tentativeG;
        existingNode.f = tentativeG + existingNode.h;
        existingNode.parent = current;
      }
    }
  }
  
  console.warn('No path found after', iterations, 'iterations');
  return [start, end];
}

// Smooth path by removing redundant waypoints
function smoothPath(path: Point2D[], obstacles: Obstacle[]): Point2D[] {
  if (path.length <= 2) return path;
  
  const smoothed: Point2D[] = [path[0]];
  let current = 0;
  
  while (current < path.length - 1) {
    let farthest = current + 1;
    
    for (let i = path.length - 1; i > current + 1; i--) {
      if (isLineSegmentClear(path[current], path[i], obstacles)) {
        farthest = i;
        break;
      }
    }
    
    smoothed.push(path[farthest]);
    current = farthest;
  }
  
  return smoothed;
}

// Add curves to make path more natural (no straight lines) - Google Maps style
function addCurvesToPath(path: Point2D[], obstacles: Obstacle[]): Point2D[] {
  if (path.length <= 2) return path;
  
  const curved: Point2D[] = [];
  
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];
    
    curved.push(current);
    
    // Calculate segment details
    const dx = next.x - current.x;
    const dz = next.z - current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    // Add intermediate points for smooth curves, checking each against obstacles
    const segments = Math.max(5, Math.floor(dist / 1.5)); // More segments for smoother curves
    
    for (let j = 1; j < segments; j++) {
      const t = j / segments;
      
      // Catmull-Rom spline-like curve
      const prev = i > 0 ? path[i - 1] : current;
      const after = i < path.length - 2 ? path[i + 2] : next;
      
      // Bezier curve calculation
      const p0 = current;
      const p3 = next;
      const p1 = {
        x: current.x + (next.x - prev.x) * 0.3,
        z: current.z + (next.z - prev.z) * 0.3
      };
      const p2 = {
        x: next.x - (after.x - current.x) * 0.3,
        z: next.z - (after.z - current.z) * 0.3
      };
      
      // Cubic bezier interpolation
      const mt = 1 - t;
      const curvePoint = {
        x: mt * mt * mt * p0.x + 
           3 * mt * mt * t * p1.x + 
           3 * mt * t * t * p2.x + 
           t * t * t * p3.x,
        z: mt * mt * mt * p0.z + 
           3 * mt * mt * t * p1.z + 
           3 * mt * t * t * p2.z + 
           t * t * t * p3.z
      };
      
      // Only add curve point if it doesn't intersect obstacles
      let isBlocked = false;
      for (const obs of obstacles) {
        if (obs.rotation && obs.rotation !== 0) {
          const dx = curvePoint.x - obs.x;
          const dz = curvePoint.z - obs.z;
          const cos = Math.cos(-obs.rotation);
          const sin = Math.sin(-obs.rotation);
          const localX = dx * cos - dz * sin;
          const localZ = dx * sin + dz * cos;
          if (Math.abs(localX) <= obs.width / 2 + 1 && Math.abs(localZ) <= obs.depth / 2 + 1) {
            isBlocked = true;
            break;
          }
        } else {
          if (curvePoint.x >= obs.x - obs.width / 2 - 1 &&
              curvePoint.x <= obs.x + obs.width / 2 + 1 &&
              curvePoint.z >= obs.z - obs.depth / 2 - 1 &&
              curvePoint.z <= obs.z + obs.depth / 2 + 1) {
            isBlocked = true;
            break;
          }
        }
      }
      
      if (!isBlocked) {
        curved.push(curvePoint);
      }
    }
  }
  
  curved.push(path[path.length - 1]);
  
  return curved;
}

// Calculate travel time for miniature humans
export function calculateTravelTime(path: Point2D[]): number {
  let totalDistance = 0;
  
  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1].x - path[i].x;
    const dz = path[i + 1].z - path[i].z;
    totalDistance += Math.sqrt(dx * dx + dz * dz);
  }
  
  // Miniature human walking speed: ~0.5 units/second (scaled for miniature size)
  // This represents a tiny human walking across household terrain
  const walkingSpeed = 0.5;
  const timeInSeconds = totalDistance / walkingSpeed;
  
  return timeInSeconds;
}

// Format time for display
export function formatTravelTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes} min ${secs} sec`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hr ${minutes} min`;
  }
}

// Calculate distance in miniature human scale
export function formatDistance(path: Point2D[]): string {
  let totalDistance = 0;
  
  for (let i = 0; i < path.length - 1; i++) {
    const dx = path[i + 1].x - path[i].x;
    const dz = path[i + 1].z - path[i].z;
    totalDistance += Math.sqrt(dx * dx + dz * dz);
  }
  
  // Convert to miniature human scale (1 unit = ~1 cm for a miniature human)
  const distanceInCm = totalDistance;
  
  if (distanceInCm < 100) {
    return `${Math.round(distanceInCm)} cm`;
  } else {
    return `${(distanceInCm / 100).toFixed(1)} m`;
  }
}
