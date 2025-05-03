const { cos, sqrt, pow, PI } = Math;


const RED_ZONES = [
  { center: [23.180167, 80.059333], radius: 5000 },
  { center: [23.2119185, 79.983639], radius: 3642 },
  { center: [23.1806835, 79.9774005], radius: 2675 },
];

const BATTERY_CONSUMPTION_RATE = 0.2; // % per km
const MIN_BATTERY_THRESHOLD = 20; // %
const TURN_RADIUS = 150; // meters
const GRID_RESOLUTION = 100; // meters

export async function check({ source, destination, battery}) {
  const { grid, ref, width, height } = createGrid();
  markRedZones(grid, ref);
  bufferTurnRadius(grid);

  const path = findPath(grid, ref, source, destination, width, height);
  if (!path) return { feasible: false, reason: 'No valid path found' };

  const totalDistance = calculateDistance(path);
  const requiredBattery = (totalDistance / 1000) * BATTERY_CONSUMPTION_RATE;
  const feasible = battery - requiredBattery > MIN_BATTERY_THRESHOLD;

  return {
    feasible,
    totalDistance,
    requiredBattery,
    estimatedRemainingBattery: battery - requiredBattery,
    waypoints: path.map(([lat, lon]) => ({ lat, lon }))
  };
}

// ---------- Internals ----------
function createGrid() {
  const minLat = Math.min(...RED_ZONES.map(z => z.center[0] - z.radius / 111320));
  const maxLat = Math.max(...RED_ZONES.map(z => z.center[0] + z.radius / 111320));
  const minLon = Math.min(...RED_ZONES.map(z => z.center[1] - z.radius / (111320 * cos(toRad(z.center[0])))));
  const maxLon = Math.max(...RED_ZONES.map(z => z.center[1] + z.radius / (111320 * cos(toRad(z.center[0])))));

  const ref = { lat: minLat, lon: minLon };
  const width = Math.ceil((maxLon - minLon) * 111320 / GRID_RESOLUTION);
  const height = Math.ceil((maxLat - minLat) * 111320 / GRID_RESOLUTION);
  const grid = Array.from({ length: height }, () => Array(width).fill(0));

  return { grid, ref, width, height };
}

function latLonToMeters(ref, lat, lon) {
  const x = (lon - ref.lon) * 111320 * cos(toRad(lat));
  const y = (lat - ref.lat) * 111320;
  return [x, y];
}

function metersToLatLon(ref, x, y) {
  const lon = ref.lon + x / (111320 * cos(toRad(ref.lat)));
  const lat = ref.lat + y / 111320;
  return [lat, lon];
}

function markRedZones(grid, ref) {
  for (const zone of RED_ZONES) {
    const [x, y] = latLonToMeters(ref, ...zone.center);
    const xIdx = Math.floor(x / GRID_RESOLUTION);
    const yIdx = Math.floor(y / GRID_RESOLUTION);
    const radiusIdx = Math.floor(zone.radius / GRID_RESOLUTION);

    for (let i = yIdx - radiusIdx; i <= yIdx + radiusIdx; i++) {
      for (let j = xIdx - radiusIdx; j <= xIdx + radiusIdx; j++) {
        if (i < 0 || i >= grid.length || j < 0 || j >= grid[0].length) continue;
        if (pow(i - yIdx, 2) + pow(j - xIdx, 2) <= pow(radiusIdx, 2)) {
          grid[i][j] = 1;
        }
      }
    }
  }
}

function bufferTurnRadius(grid) {
  const radiusIdx = Math.floor(TURN_RADIUS / GRID_RESOLUTION);
  const copy = grid.map(row => [...row]);

  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[0].length; j++) {
      if (copy[i][j] === 1) {
        for (let di = -radiusIdx; di <= radiusIdx; di++) {
          for (let dj = -radiusIdx; dj <= radiusIdx; dj++) {
            const ni = i + di, nj = j + dj;
            if (
              ni >= 0 && ni < grid.length &&
              nj >= 0 && nj < grid[0].length &&
              pow(di, 2) + pow(dj, 2) <= pow(radiusIdx, 2)
            ) {
              grid[ni][nj] = 1;
            }
          }
        }
      }
    }
  }
}

function findPath(grid, ref, startLatLon, endLatLon, width, height) {
  const [sx, sy] = latLonToMeters(ref, ...startLatLon);
  const [ex, ey] = latLonToMeters(ref, ...endLatLon);
  const start = [Math.floor(sy / GRID_RESOLUTION), Math.floor(sx / GRID_RESOLUTION)];
  const end = [Math.floor(ey / GRID_RESOLUTION), Math.floor(ex / GRID_RESOLUTION)];

  const openSet = [[0, ...start]];
  const cameFrom = new Map();
  const gScore = new Map();
  gScore.set(start.toString(), 0);

  while (openSet.length) {
    openSet.sort((a, b) => a[0] - b[0]);
    const [, ci, cj] = openSet.shift();
    if (ci === end[0] && cj === end[1]) return reconstruct(cameFrom, [ci, cj], ref);

    for (const [di, dj] of [[0,1],[1,0],[0,-1],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || ni >= height || nj < 0 || nj >= width || grid[ni][nj] === 1) continue;

      const neighborKey = [ni, nj].toString();
      const tentativeG = (gScore.get([ci, cj].toString()) || Infinity) + Math.sqrt(di ** 2 + dj ** 2);

      if (tentativeG < (gScore.get(neighborKey) || Infinity)) {
        cameFrom.set(neighborKey, [ci, cj]);
        gScore.set(neighborKey, tentativeG);
        const f = tentativeG + heuristic(ni, nj, end[0], end[1]);
        openSet.push([f, ni, nj]);
      }
    }
  }

  return null;
}

function reconstruct(cameFrom, current, ref) {
  const path = [];
  while (current) {
    const [x, y] = [current[1] * GRID_RESOLUTION, current[0] * GRID_RESOLUTION];
    path.unshift(metersToLatLon(ref, x, y));
    current = cameFrom.get(current.toString());
  }
  return path;
}

function heuristic(i1, j1, i2, j2) {
  return Math.sqrt((i1 - i2) ** 2 + (j1 - j2) ** 2);
}

function calculateDistance(waypoints) {
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [lat1, lon1] = waypoints[i];
    const [lat2, lon2] = waypoints[i + 1];
    const dx = (lon2 - lon1) * 111320 * cos(toRad((lat1 + lat2) / 2));
    const dy = (lat2 - lat1) * 111320;
    total += Math.sqrt(dx ** 2 + dy ** 2);
  }
  return total;
}

function toRad(deg) {
  return deg * (PI / 180);
}
