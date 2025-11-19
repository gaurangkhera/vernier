interface Obstacle {
  x: number;
  z: number;
  width: number;
  depth: number;
  rotation: number;
}

// Generate a more organic, less grid-like layout for buildings
export function generateOrganicLayout(
  count: number,
  areaSize: number,
  minSize: number,
  maxSize: number,
  streetGutter: number
): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const halfArea = areaSize / 2;
  const attempts = count * 5; // Try more times than needed to ensure placement

  for (let i = 0; i < attempts && obstacles.length < count; i++) {
    const width = Math.random() * (maxSize - minSize) + minSize;
    const depth = Math.random() * (maxSize - minSize) + minSize;
    const rotation = Math.random() * Math.PI / 2; // 0 to 90 degrees

    const x = Math.random() * (areaSize - width) - halfArea + width / 2;
    const z = Math.random() * (areaSize - depth) - halfArea + depth / 2;

    const newObstacle: Obstacle = { x, z, width, depth, rotation };

    // Check for street alignment (don't place on main streets)
    const isOnStreet = 
      (Math.abs(x) % 20 < streetGutter) ||
      (Math.abs(z) % 20 < streetGutter);

    if (isOnStreet) continue;

    // Check for overlap with existing obstacles
    let overlaps = false;
    for (const existing of obstacles) {
      const dist = Math.sqrt((x - existing.x) ** 2 + (z - existing.z) ** 2);
      if (dist < (width + existing.width) / 2 + streetGutter) {
        overlaps = true;
        break;
      }
    }

    if (!overlaps) {
      obstacles.push(newObstacle);
    }
  }

  return obstacles;
}
