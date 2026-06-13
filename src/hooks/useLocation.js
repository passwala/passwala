import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { DEFAULT_LOCATION, DEFAULT_COORDS } from '../utils/constants';

export const useLocation = () => {
  const [location, setLocation] = useState(() => localStorage.getItem('passwala_location') || DEFAULT_LOCATION);
  const [userCoords, setUserCoords] = useState(() => {
    const saved = localStorage.getItem('passwala_coords');
    return saved ? JSON.parse(saved) : DEFAULT_COORDS;
  });

  const updateLocation = (newLoc, coords) => {
    setLocation(newLoc);
    localStorage.setItem('passwala_location', newLoc);
    if (coords) updateCoords(coords);
  };

  const updateCoords = (newCoords) => {
    setUserCoords(newCoords);
    localStorage.setItem('passwala_coords', JSON.stringify(newCoords));
  };

  useEffect(() => {
    let cancelled = false;

    const autoDetectLocation = async () => {
      const savedLoc = localStorage.getItem('passwala_location');
      
      // Check if permission is already granted
      let hasPermission = false;
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          if (status.state === 'granted') {
            hasPermission = true;
          }
        }
      } catch (e) {
        console.warn('Permissions API query failed:', e);
      }

      // If they have manually chosen a specific non-mock location, and we don't have explicit permission, keep it.
      // Otherwise, if it's a mock location (Ambawadi, Ahmedabad, etc.) or default, or if we have permission, auto-detect.
      const isMockOrGeneric = !savedLoc || 
                              savedLoc === 'Detecting Location...' || 
                              savedLoc === DEFAULT_LOCATION || 
                              savedLoc === 'Ahmedabad, Gujarat' || 
                              savedLoc.includes('Ambawadi') || 
                              savedLoc === 'India';

      if (!isMockOrGeneric && !hasPermission) {
        return;
      }

      // Geolocation works on localhost even over HTTP (browsers treat localhost as secure).
      // On non-localhost (phone via local IP), GPS may be blocked by the browser — the
      // error callback below catches that and falls back to IP / manual selection.

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;

              if (!cancelled) updateCoords({ lat: latitude, lng: longitude });
              
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`, {
                headers: {
                  'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)'
                }
              });
              const data = await res.json();
              if (data.address) {
                const area = data.address.suburb || data.address.neighbourhood || data.address.residential || data.address.village || '';
                const city = data.address.city || data.address.town || data.address.state_district || '';

                if (area && city) {
                  const preUpdateLoc = localStorage.getItem('passwala_location');
                  if (!cancelled) updateLocation(`${area}, ${city}`);
                  if (!cancelled && (!preUpdateLoc || preUpdateLoc === 'Detecting Location...' || preUpdateLoc === DEFAULT_LOCATION || isMockOrGeneric)) {
                    toast.success(`Located: ${area}`, { icon: '📍', id: 'auto-geo' });
                  }
                  return;
                } else if (city) {
                  const state = data.address.state || '';
                  if (!cancelled) updateLocation(`${city}${state ? `, ${state}` : ''}`);
                  return;
                }
              }
            } catch (err) {
              console.warn('GPS Reverse Geocode failed, falling back to IP');
              if (!cancelled) fetchIPLocation();
            }
          },
          (error) => {
            console.warn('GPS Denied or Failed:', error.code, error.message);
            if (!cancelled) fetchIPLocation();
          },
          {
            timeout: 10000,        // ⏱️ Give up after 10 sec — critical for mobile
            maximumAge: 60000,     // ♻️ Accept a cached position up to 1 min old
            enableHighAccuracy: false // 🔋 Don't drain battery on mobile
          }
        );
      } else {
        if (!cancelled) fetchIPLocation();
      }
    };

    const fetchIPLocation = async () => {
      try {
        // Try fetching public geolocation directly from client browser first for real IP
        const directRes = await fetch('https://freeipapi.com/api/json/');
        if (directRes.ok) {
          const data = await directRes.json();
          if (data && data.cityName && data.regionName) {
            const lat = data.latitude ? parseFloat(data.latitude) : 23.0225;
            const lng = data.longitude ? parseFloat(data.longitude) : 72.5714;
            if (!cancelled) {
              updateLocation(`${data.cityName}, ${data.regionName}`);
              updateCoords({ lat, lng });
            }
            return;
          }
        }
      } catch (directErr) {
        console.warn("Direct IP Geolocation failed, trying backend proxy:", directErr);
      }

      try {
        const baseUrl = window.location.protocol === 'https:' ? '' : (import.meta.env.VITE_API_URL || '');
        const res = await fetch(`${baseUrl}/api/ip-location`);
        if (!res.ok) throw new Error('Proxied IP Location failed');
        
        const data = await res.json();

        if (data && !data.isLocal && data.cityName && data.regionName) {
          const lat = data.latitude ? parseFloat(data.latitude) : 23.0225;
          const lng = data.longitude ? parseFloat(data.longitude) : 72.5714;

          if (!cancelled) updateLocation(`${data.cityName}, ${data.regionName}`);
          if (data.latitude && data.longitude) {
            if (!cancelled) updateCoords({ lat, lng });
          }
        } else {
          throw new Error('IP failed or is local');
        }
      } catch (e) {
        console.warn('IP Location fallbacks failed, keeping default location');
        if (!cancelled) {
          updateCoords({ lat: 23.0225, lng: 72.5714 });
          updateLocation('Ahmedabad, Gujarat');
        }
      }
    };

    autoDetectLocation();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    location,
    userCoords,
    updateLocation,
    updateCoords
  };
};
