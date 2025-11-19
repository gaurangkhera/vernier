// A* Pathfinding with proper obstacle avoidance
interface Point2D {
  x: number;
  z: number;
}

interface Node {
  x: number;
  z: number;
  g: number; // Cost from start
  h: number; // Heuristic to end
  f: number; // Total cost
  parent: Node | null;
}

interface Obstacle {
  x: number;
  z: number;
  radius: number;
}

// Convert 3D world position to grid coordinates
function worldToGrid(worldX: number, worldZ: number, gridSize: number): Point2D {
  return {
    x: Math.round(worldX / gridSize),
    z: Math.round(worldZ / gridSize),
  };
}

// Convert grid coordinates back to world position
function gridToWorld(gridX: number, gridZ: number, gridSize: number): Point2D {
  return {
    x: gridX * gridSize,
    z: gridZ * gridSize,
  };
}

// Check if a point is blocked by an obstacle
function isBlocked(x: number, z: number, obstacles: Obstacle[], gridSize: number): boolean {
  const worldPos = gridToWorld(x, z, gridSize);
  
  for (const obstacle of obstacles) {
    const dx = worldPos.x - obstacle.x;
    const dz = worldPos.z - obstacle.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Add buffer zone around obstacles
    if (distance < obstacle.radius + gridSize * 1.5) {
      return true;
    }
  }
  
  return false;
}

// Heuristic function (Euclidean distance)
function heuristic(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// Get neighbors of a node (8 directions)
function getNeighbors(node: Point2D, gridBounds: number): Point2D[] {
  const neighbors: Point2D[] = [];
  const directions = [
    { x: -1, z: 0 }, { x: 1, z: 0 },  // Left, Right
    { x: 0, z: -1 }, { x: 0, z: 1 },  // Up, Down
    { x: -1, z: -1 }, { x: 1, z: -1 }, // Diagonals
    { x: -1, z: 1 }, { x: 1, z: 1 },
  ];
  
  for (const dir of directions) {
    const newX = node.x + dir.x;
    const newZ = node.z + dir.z;
    
    if (Math.abs(newX) <= gridBounds && Math.abs(newZ) <= gridBounds) {
      neighbors.push({ x: newX, z: newZ });
    }
  }
  
  return neighbors;
}

// A* Pathfinding algorithm
export function findPathAStar(
  startWorld: { x: number; z: number },
  endWorld: { x: number; z: number },
  obstacles: Obstacle[],
  gridSize: number = 2
): Point2D[] {
  const start = worldToGrid(startWorld.x, startWorld.z, gridSize);
  const end = worldToGrid(endWorld.x, endWorld.z, gridSize);
  
  const openSet: Node[] = [];
  const closedSet = new Set<string>();
  
  const startNode: Node = {
    x: start.x,
    z: start.z,
    g: 0,
    h: heuristic(start, end),
    f: heuristic(start, end),
    parent: null,
  };
  
  openSet.push(startNode);
  
  const gridBounds = 50;
  let iterations = 0;
  const maxIterations = 1000;
  
  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;
    
    // Find node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    
    // Check if we reached the goal
    if (current.x === end.x && current.z === end.z) {
      // Reconstruct path
      const path: Point2D[] = [];
      let node: Node | null = current;
      
      while (node) {
        const worldPos = gridToWorld(node.x, node.z, gridSize);
        path.unshift(worldPos);
        node = node.parent;
      }
      
      // Smooth the path
      return smoothPath(path, obstacles);
    }
    
    closedSet.add(`${current.x},${current.z}`);
    
    // Check all neighbors
    const neighbors = getNeighbors({ x: current.x, z: current.z }, gridBounds);
    
    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.z}`;
      
      if (closedSet.has(key)) continue;
      if (isBlocked(neighbor.x, neighbor.z, obstacles, gridSize)) continue;
      
      // Calculate costs
      const isDiagonal = neighbor.x !== current.x && neighbor.z !== current.z;
      const moveCost = isDiagonal ? 1.414 : 1;
      const tentativeG = current.g + moveCost;
      
      // Check if neighbor is already in open set
      const existingNode = openSet.find(n => n.x === neighbor.x && n.z === neighbor.z);
      
      if (!existingNode) {
        const h = heuristic(neighbor, end);
        openSet.push({
          x: neighbor.x,
          z: neighbor.z,
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
  
  // No path found, return straight line
  console.warn('No path found, returning direct path');
  return [startWorld, endWorld];
}

// Smooth the path by removing unnecessary waypoints
function smoothPath(path: Point2D[], obstacles: Obstacle[]): Point2D[] {
  if (path.length <= 2) return path;
  
  const smoothed: Point2D[] = [path[0]];
  let current = 0;
  
  while (current < path.length - 1) {
    let farthest = current + 1;
    
    // Try to connect to farthest visible point
    for (let i = path.length - 1; i > current + 1; i--) {
      if (isLineOfSightClear(path[current], path[i], obstacles)) {
        farthest = i;
        break;
      }
    }
    
    smoothed.push(path[farthest]);
    current = farthest;
  }
  
  return smoothed;
}

// Check if line of sight is clear between two points
function isLineOfSightClear(a: Point2D, b: Point2D, obstacles: Obstacle[]): boolean {
  const steps = 20;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    
    for (const obstacle of obstacles) {
      const dx = x - obstacle.x;
      const dz = z - obstacle.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < obstacle.radius + 1) {
        return false;
      }
    }
  }
  
  return true;
}

// Convert lat/lng to 3D world coordinates
export function latLngToWorld(
  lat: number,
  lng: number,
  userLat: number,
  userLng: number
): { x: number; z: number } {
  return {
    x: (lng - userLng) * 100000,
    z: -(lat - userLat) * 100000,
  };
}

// Create obstacles from scans and terrain
export function createObstacles(
  scans: Array<{ latitude: number; longitude: number; threatLevel?: string }>,
  terrainObstacles: Array<{ x: number; z: number; width: number; depth: number }>,
  userLocation: { lat: number; lng: number }
): Obstacle[] {
  const obstacles: Obstacle[] = [];
  
  // Add scans as obstacles
  for (const scan of scans) {
    const pos = latLngToWorld(scan.latitude, scan.longitude, userLocation.lat, userLocation.lng);
    let radius = 2;
    
    // Larger radius for higher threats
    if (scan.threatLevel === 'high') radius = 5;
    else if (scan.threatLevel === 'medium') radius = 3.5;
    
    obstacles.push({ ...pos, radius });
  }
  
  // Add terrain obstacles
  for (const terrain of terrainObstacles) {
    obstacles.push({
      x: terrain.x,
      z: terrain.z,
      radius: Math.max(terrain.width, terrain.depth) / 2,
    });
  }
  
  return obstacles;
}
