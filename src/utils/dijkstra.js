/**
 * Dijkstra's Algorithm Implementation for Passwala
 * Used for finding shortest path distances between landmarks in Satellite, Ahmedabad.
 */

// Landmarks and their approximate coordinates in Satellite/Ahmedabad
export const LANDMARKS = {
  'Star Bazaar': { lat: 23.0235, lng: 72.5312 },
  'Shivranjani': { lat: 23.0264, lng: 72.5401 },
  'Mansi Circle': { lat: 23.0305, lng: 72.5330 },
  'Jhansi Ki Rani': { lat: 23.0255, lng: 72.5475 },
  'Nehrunagar': { lat: 23.0265, lng: 72.5540 },
  'Satellite Cross Road': { lat: 23.0210, lng: 72.5350 },
  'Keshavbaug': { lat: 23.0280, lng: 72.5250 },
  'Vastrapur Lake': { lat: 23.0380, lng: 72.5450 },
  'ISCON Circle': { lat: 23.0215, lng: 72.5075 },
  'Jodhpur Cross Road': { lat: 23.0185, lng: 72.5260 },
  'Ramdevnagar': { lat: 23.0230, lng: 72.5180 }
};

// Graph representation: Adjacency list with weights (distance in km)
export const AHMEDABAD_GRAPH = {
  'Star Bazaar': { 'Shivranjani': 0.9, 'Satellite Cross Road': 0.4, 'Ramdevnagar': 1.2 },
  'Shivranjani': { 'Star Bazaar': 0.9, 'Mansi Circle': 0.8, 'Jhansi Ki Rani': 0.7, 'Satellite Cross Road': 1.1 },
  'Mansi Circle': { 'Shivranjani': 0.8, 'Keshavbaug': 0.9, 'Vastrapur Lake': 1.5 },
  'Jhansi Ki Rani': { 'Shivranjani': 0.7, 'Nehrunagar': 0.8 },
  'Nehrunagar': { 'Jhansi Ki Rani': 0.8 },
  'Satellite Cross Road': { 'Star Bazaar': 0.4, 'Shivranjani': 1.1, 'Jodhpur Cross Road': 0.8 },
  'Keshavbaug': { 'Mansi Circle': 0.9, 'ISCON Circle': 2.1 },
  'Vastrapur Lake': { 'Mansi Circle': 1.5 },
  'ISCON Circle': { 'Keshavbaug': 2.1, 'Ramdevnagar': 1.5 },
  'Ramdevnagar': { 'Star Bazaar': 1.2, 'ISCON Circle': 1.5, 'Jodhpur Cross Road': 1.0 },
  'Jodhpur Cross Road': { 'Satellite Cross Road': 0.8, 'Ramdevnagar': 1.0 }
};

/**
 * Dijkstra's Algorithm
 * @param {Object} graph - Adjacency list
 * @param {string} start - Starting node
 * @param {string} end - Destination node
 * @returns {Object} { distance, path }
 */
export function dijkstra(graph, start, end) {
  const distances = {};
  const previous = {};
  const nodes = new Set();

  for (let node in graph) {
    distances[node] = Infinity;
    previous[node] = null;
    nodes.add(node);
  }
  distances[start] = 0;

  while (nodes.size > 0) {
    let closestNode = null;
    for (let node of nodes) {
      if (closestNode === null || distances[node] < distances[closestNode]) {
        closestNode = node;
      }
    }

    if (distances[closestNode] === Infinity || closestNode === end) break;

    nodes.delete(closestNode);

    for (let neighbor in graph[closestNode]) {
      let alt = distances[closestNode] + graph[closestNode][neighbor];
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        previous[neighbor] = closestNode;
      }
    }
  }

  const path = [];
  let curr = end;
  while (curr) {
    path.unshift(curr);
    curr = previous[curr];
  }

  return {
    distance: distances[end],
    path: path
  };
}

/**
 * Finds the nearest landmark to a set of coordinates
 * @param {number} lat 
 * @param {number} lng 
 * @returns {string} Landmark name
 */
export function getNearestLandmark(lat, lng) {
  let nearest = null;
  let minDist = Infinity;

  for (let name in LANDMARKS) {
    const l = LANDMARKS[name];
    const d = Math.sqrt(Math.pow(lat - l.lat, 2) + Math.pow(lng - l.lng, 2));
    if (d < minDist) {
      minDist = d;
      nearest = name;
    }
  }
  return nearest;
}

/**
 * Calculates graph-based distance between two coordinates using Dijkstra
 */
export function getShortestPathDistance(lat1, lng1, lat2, lng2) {
  const startNode = getNearestLandmark(lat1, lng1);
  const endNode = getNearestLandmark(lat2, lng2);

  if (startNode === endNode) {
    // If both are near the same landmark, use straight distance as fallback
    const d = Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2)) * 111; // approx km
    return parseFloat(d.toFixed(2));
  }

  const result = dijkstra(AHMEDABAD_GRAPH, startNode, endNode);
  return result.distance === Infinity ? 0 : parseFloat(result.distance.toFixed(2));
}
