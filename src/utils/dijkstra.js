/**
 * Real OSRM (Open Source Routing Machine) API Implementation
 * Used for finding actual road network distances and ETAs.
 */

// Fallback straight-line distance using Haversine formula
export function getStraightLineDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 0;
  const d = Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2)) * 111; // approx km
  return parseFloat(d.toFixed(2));
}

// Ensure backward compatibility where synchronous calculation is unavoidable initially
export function getShortestPathDistance(lat1, lng1, lat2, lng2) {
  return getStraightLineDistance(lat1, lng1, lat2, lng2);
}

/**
 * Fetch real routing data from OSRM via backend proxy
 * @param {number} startLat 
 * @param {number} startLng 
 * @param {number} endLat 
 * @param {number} endLng 
 * @param {string} profile - 'driving', 'cycling', or 'foot'
 * @returns {Promise<Object>} { distanceKm, durationMins, polyline, success }
 */
export async function getOSRMRoute(startLat, startLng, endLat, endLng, profile = 'driving') {
  const fallback = {
    distanceKm: getStraightLineDistance(startLat, startLng, endLat, endLng),
    durationMins: Math.round(getStraightLineDistance(startLat, startLng, endLat, endLng) * 4 + 2), // Rough estimate: 15km/h
    polyline: [],
    success: false
  };

  if (!startLat || !startLng || !endLat || !endLng) return fallback;

  try {
    const url = `/api/route?startLat=${startLat}&startLng=${startLng}&endLat=${endLat}&endLng=${endLng}&profile=${profile}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Proxy API returned ' + res.status);
    
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coords = route.geometry.coordinates.map(pt => [pt[1], pt[0]]);
      return {
        distanceKm: parseFloat((route.distance / 1000).toFixed(1)),
        durationMins: Math.round(route.duration / 60),
        polyline: coords,
        success: true
      };
    }
  } catch (err) {
    console.warn("OSRM Proxy failed, falling back to Haversine:", err.message);
  }

  return fallback;
}
