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
    const autoDetectLocation = async () => {
      const savedLoc = localStorage.getItem('passwala_location');
      // If location is already set to something specific (not the default neutral 'India' or generic placeholder), skip detection
      if (savedLoc && savedLoc !== 'Detecting Location...' && savedLoc !== DEFAULT_LOCATION && savedLoc !== 'Ahmedabad, Gujarat') return;

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              updateCoords({ lat: latitude, lng: longitude });
              
              // We reverse-geocode coordinates using openstreetmap (public API)
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`, {
                headers: {
                  'User-Agent': 'Passwala/1.0 (karan@example.com)'
                }
              });
              const data = await res.json();
              if (data.address) {
                const area = data.address.suburb || data.address.neighbourhood || data.address.residential || data.address.village || '';
                const city = data.address.city || data.address.town || data.address.state_district || '';

                if (area && city) {
                  const preUpdateLoc = localStorage.getItem('passwala_location');
                  updateLocation(`${area}, ${city}`);
                  if (!preUpdateLoc || preUpdateLoc === 'Detecting Location...' || preUpdateLoc === DEFAULT_LOCATION || preUpdateLoc === 'Ahmedabad, Gujarat') {
                    toast.success(`Located: ${area}`, { icon: '📍', id: 'auto-geo' });
                  }
                  return;
                } else if (city) {
                  const state = data.address.state || '';
                  updateLocation(`${city}${state ? `, ${state}` : ''}`);
                  return;
                }
              }
            } catch (err) {
              console.warn('GPS Reverse Geocode failed, falling back to IP');
              fetchIPLocation();
            }
          },
          (error) => {
            console.warn('GPS Denied or Failed:', error);
            fetchIPLocation();
          },
        );
      } else {
        fetchIPLocation();
      }
    };

    const fetchIPLocation = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        
        // PRIVACY ENHANCEMENT: Proxy the IP location request through our Express backend to protect user privacy
        const res = await fetch(`${baseUrl}/api/ip-location`);
        if (!res.ok) throw new Error('Proxied IP Location failed');
        
        const data = await res.json();
        if (data && data.cityName && data.regionName) {
          updateLocation(`${data.cityName}, ${data.regionName}`);
          if (data.latitude && data.longitude) {
            updateCoords({ lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) });
          }
        }
      } catch (e) {
        console.warn('Proxied IP Location fallbacks failed, keeping default location');
      }
    };

    autoDetectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    location,
    userCoords,
    updateLocation,
    updateCoords
  };
};
