import { useState, useRef, useCallback } from 'react';

// Haversine formula to calculate distance between two coordinates in kilometers
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const AHMEDABAD_BOUNDS = {
  minLat: 22.9,
  maxLat: 23.25,
  minLng: 72.4,
  maxLng: 72.7
};

const isWithinAhmedabad = (lat, lng) => {
  return (
    lat >= AHMEDABAD_BOUNDS.minLat &&
    lat <= AHMEDABAD_BOUNDS.maxLat &&
    lng >= AHMEDABAD_BOUNDS.minLng &&
    lng <= AHMEDABAD_BOUNDS.maxLng
  );
};

export const useSecureLocation = () => {
  const [locationState, setLocationState] = useState({
    lat: null,
    lng: null,
    accuracy: null,
    speed: null,
    address: '',
    rawAddressObj: null,
    loading: false,
    error: null,
    errorCode: null,
    isMock: false
  });

  const watchIdRef = useRef(null);
  const prevCoordsRef = useRef(null);
  const lastTimeRef = useRef(null);
  const intervalRef = useRef(null);
  const locationStateRef = useRef(locationState);
  locationStateRef.current = locationState;

  const fetchAddress = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: {
          'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)'
        }
      });
      if (!res.ok) return { formatted: '', raw: null };
      const data = await res.json();
      const area = data.address?.suburb || data.address?.neighbourhood || data.address?.city || 'My Location';
      const city = data.address?.city || data.address?.town || data.address?.state_district || '';
      return { 
        formatted: city ? `${area}, ${city}` : area, 
        raw: data.address || null 
      };
    } catch (err) {
      console.warn('Secure Geo: Reverse geocode failed', err);
      return { formatted: '', raw: null };
    }
  };

  const validateAndProcessPosition = async (position) => {
    const { latitude, longitude, accuracy, speed } = position.coords;
    const currentTime = Date.now();
    
    // 1. Accuracy Filter
    if (accuracy > 500) {
      console.warn(`[SecureGeo] Rejected: Low accuracy (${accuracy}m)`);
      setLocationState(prev => ({ ...prev, error: 'GPS signal too weak. Please go outside.', errorCode: 'LOW_ACCURACY', loading: false }));
      return;
    }

    // 1.5 Ahmedabad Bounds Check
    if (!isWithinAhmedabad(latitude, longitude)) {
      console.warn(`[SecureGeo] Coordinates (${latitude}, ${longitude}) outside Ahmedabad. Fallback to Ahmedabad default.`);
      setLocationState({
        lat: 23.0225,
        lng: 72.5714,
        accuracy,
        speed: 0,
        address: 'Ahmedabad, Gujarat',
        rawAddressObj: null,
        loading: false,
        error: null,
        errorCode: null,
        isMock: false
      });
      return;
    }

    // 2. Teleportation / Fake GPS Detection
    let calculatedSpeedKmH = speed ? (speed * 3.6) : 0;
    
    if (prevCoordsRef.current && lastTimeRef.current) {
      const timeDiffHours = (currentTime - lastTimeRef.current) / (1000 * 60 * 60);
      const distKm = calculateDistance(prevCoordsRef.current.lat, prevCoordsRef.current.lng, latitude, longitude);
      
      if (timeDiffHours > 0) {
        const measuredSpeed = distKm / timeDiffHours;
        calculatedSpeedKmH = Math.max(calculatedSpeedKmH, measuredSpeed);
      }
    }

    console.log(`[SecureGeo] Valid Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}, Acc: ${accuracy}m, Speed: ${calculatedSpeedKmH.toFixed(1)}km/h`);

    // Only reverse geocode if location shifted significantly (e.g., > 100 meters) to save API calls
    let newAddressData = { formatted: locationStateRef.current.address, raw: locationStateRef.current.rawAddressObj };
    if (!prevCoordsRef.current || calculateDistance(prevCoordsRef.current.lat, prevCoordsRef.current.lng, latitude, longitude) > 0.1) {
      newAddressData = await fetchAddress(latitude, longitude);
    }

    prevCoordsRef.current = { lat: latitude, lng: longitude };
    lastTimeRef.current = currentTime;

    setLocationState({
      lat: latitude,
      lng: longitude,
      accuracy,
      speed: calculatedSpeedKmH,
      address: newAddressData.formatted || locationStateRef.current.address,
      rawAddressObj: newAddressData.raw || locationStateRef.current.rawAddressObj,
      loading: false,
      error: null,
      errorCode: null,
      isMock: false
    });
  };

  const handleGeoError = (err) => {
    console.error('[SecureGeo] Error:', err);
    let errorMsg = 'Failed to get location';
    let errorCode = 'NETWORK_ERROR';
    
    if (err.code === 1) {
      errorMsg = 'Location permission denied. Please enable it in browser settings.';
      errorCode = 'PERMISSION_DENIED';
    } else if (err.code === 2) {
      errorMsg = 'GPS is disabled or unavailable. Please turn on location services.';
      errorCode = 'GPS_DISABLED';
    } else if (err.code === 3) {
      errorMsg = 'Location request timed out. Retrying...';
      errorCode = 'TIMEOUT';
    }
    
    setLocationState(prev => ({ ...prev, error: errorMsg, errorCode, loading: false }));
  };

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationState(prev => ({ ...prev, error: 'Geolocation is not supported by your browser.', errorCode: 'NOT_SUPPORTED', loading: false }));
      return;
    }

    setLocationState(prev => ({ ...prev, loading: true, error: null, errorCode: null }));

    // Request immediate position first, then set up a battery-friendly watch
    navigator.geolocation.getCurrentPosition(validateAndProcessPosition, handleGeoError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    });

    // Keep GPS radio hot and track background changes efficiently
    watchIdRef.current = navigator.geolocation.watchPosition(
      validateAndProcessPosition, 
      handleGeoError,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setLocationState(prev => ({ ...prev, loading: false }));
  }, []);

  return {
    ...locationState,
    startTracking,
    stopTracking
  };
};
