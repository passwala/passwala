import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GoogleMapWrapper from '../../utils/GoogleMapWrapper';
import { MapPin, Search, Navigation, ArrowRight, Map, LocateFixed, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AHMEDABAD_AREAS as ahmedabadAreas } from '../../utils/constants';
import { useTranslation } from '../LanguageContext';
import './CityTicketBooking.css';

const POPULAR_ROUTES = [
  { name: 'CG Road', lat: 23.0375, lng: 72.5567 },
  { name: 'Maninagar', lat: 22.9996, lng: 72.6021 },
  { name: 'Naroda', lat: 23.0694, lng: 72.6560 },
  { name: 'Chandkheda', lat: 23.1091, lng: 72.5855 },
  { name: 'Bopal', lat: 23.0333, lng: 72.4632 },
  { name: 'Satellite', lat: 23.0284, lng: 72.5239 },
  { name: 'SG Highway', lat: 23.0566, lng: 72.5218 },
];

const AHMEDABAD_BOUNDS = {
  minLat: 22.9,
  maxLat: 23.25,
  minLng: 72.4,
  maxLng: 72.7
};

function isWithinAhmedabad(lat, lng) {
  return (
    lat >= AHMEDABAD_BOUNDS.minLat &&
    lat <= AHMEDABAD_BOUNDS.maxLat &&
    lng >= AHMEDABAD_BOUNDS.minLng &&
    lng <= AHMEDABAD_BOUNDS.maxLng
  );
}

// Closest area helper
function getClosestAreaName(lat, lng) {
  let closestName = 'Ahmedabad';
  let minDistance = Infinity;
  for (const route of POPULAR_ROUTES) {
    const d = Math.sqrt((route.lat - lat) ** 2 + (route.lng - lng) ** 2);
    if (d < minDistance) {
      minDistance = d;
      closestName = route.name;
    }
  }
  return `${closestName} Area`;
}

// Reverse geocode a lat/lng to a human-readable name
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { 
        headers: { 
          'Accept-Language': 'en',
          'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)'
        } 
      }
    );
    const data = await res.json();
    if (data && data.display_name) {
      const addr = data.address;
      // Build a short, readable name
      const parts = [
        addr.road || addr.pedestrian || addr.footway,
        addr.suburb || addr.neighbourhood || addr.village || addr.town,
        addr.city || addr.county,
      ].filter(Boolean);
      return parts.slice(0, 2).join(', ') || data.display_name.split(',').slice(0, 2).join(',');
    }
  } catch (e) {
    console.error('Geocode error:', e);
  }
  return getClosestAreaName(lat, lng);
}

// Fetch real road route from OSRM
async function fetchRoadRoute(pickup, dropoff) {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson&steps=false`,
      {
        headers: {
          'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)'
        }
      }
    );
    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coords = route.geometry.coordinates.map((c) => [c[1], c[0]]);
      const distanceKm = (route.distance / 1000).toFixed(1);
      return { coords, distanceKm };
    }
  } catch (e) {
    console.error('OSRM error:', e);
  }
  return null;
}



const CityTicketBooking = ({ user, userCoords }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeInput, setActiveInput] = useState('pickup');
  const [routePath, setRoutePath] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  // const [locating, setLocating] = useState(false);
  // const [dbRoutes, setDbRoutes] = useState([]);
  const [dbVehicles, setDbVehicles] = useState([]);
  const [pickupSearchQuery, setPickupSearchQuery] = useState('');
  const [dropoffSearchQuery, setDropoffSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchDebounceRef = React.useRef(null);

  const handleLocationSearch = (query, type) => {
    if (type === 'pickup') {
      setPickupSearchQuery(query);
    } else {
      setDropoffSearchQuery(query);
    }
    
    if (!query || query.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    
    const q = query.toLowerCase().trim().replace(/[.,]/g, '');
    const queryTerms = q.split(/\s+/).filter(Boolean);
    
    // 1. Instant local matching from constants.js to provide 0ms autocomplete
    const localMatches = ahmedabadAreas.filter(area => {
      const areaName = area.name.toLowerCase();
      const areaAliases = (area.aliases || []).map(alias => alias.toLowerCase());
      return queryTerms.every(term => 
        areaName.includes(term) || 
        areaAliases.some(alias => alias.includes(term))
      );
    }).map(area => ({
      display_name: `${area.name}, Ahmedabad, Gujarat, India`,
      lat: area.lat.toString(),
      lon: area.lng.toString(),
      is_local: true
    }));

    setSearchResults(localMatches);


    // 2. Debounce external Nominatim calls by 500ms to avoid keypress rate-limit blocks
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (query.trim().length >= 3) {
      searchDebounceRef.current = setTimeout(async () => {
        try {
          const suffix = query.toLowerCase().includes('ahmedabad') ? '' : ', Ahmedabad, Gujarat';
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + suffix)}&countrycodes=in&limit=20`,
            { 
              headers: { 
                'Accept-Language': 'en',
                'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)'
              } 
            }
          );
          if (res.status === 429) {
            console.warn('Nominatim rate limit (429) hit. Displaying local cache matches only.');
            return;
          }
          const data = await res.json();
          if (Array.isArray(data)) {
            const filtered = data.filter(item => 
              isWithinAhmedabad(parseFloat(item.lat), parseFloat(item.lon))
            );
            const externalResults = filtered.length > 0 ? filtered : data;
            
            setSearchResults(prev => {
              const merged = [...prev];
              externalResults.forEach(ext => {
                const extName = ext.display_name.split(',')[0].toLowerCase();
                const exists = merged.some(local => local.display_name.split(',')[0].toLowerCase() === extName);
                if (!exists) {
                  merged.push(ext);
                }
              });
              return merged;
            });
          }
        } catch (e) {
          console.error('Search error:', e);
        }
      }, 500);
    }
  };

  const triggerSearch = async (query, type) => {
    if (!query) return;
    try {
      const suffix = query.toLowerCase().includes('ahmedabad') ? '' : ', Ahmedabad, Gujarat';
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + suffix)}&countrycodes=in&limit=10`,
        { 
          headers: { 
            'Accept-Language': 'en',
            'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)'
          } 
        }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const match = data.find(item => isWithinAhmedabad(parseFloat(item.lat), parseFloat(item.lon)));
        if (match) {
          handleSearchResultSelect(match, type);
        } else {
          toast.error('Location found is outside Ahmedabad city limits.');
        }
      } else {
        toast.error('No locations found matching search term');
      }
    } catch (e) {
      console.error('Search trigger error:', e);
    }
  };



  const handleSearchResultSelect = (result, type) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    if (!isWithinAhmedabad(lat, lng)) {
      toast.error('Passwala City Rides are strictly available within Ahmedabad city limits only.');
      return;
    }
    
    const parts = result.display_name.split(',');
    const name = parts.slice(0, 3).join(', ').trim();
    const loc = { lat, lng, name };
    
    if (type === 'pickup') {
      setPickup(loc);
      setPickupSearchQuery(name);
      setActiveInput('dropoff');
      toast.success(`Pickup set: ${name}`, { icon: '🟢' });
    } else {
      setDropoff(loc);
      setDropoffSearchQuery(name);
      toast.success(`Drop-off set: ${name}`, { icon: '🔴' });
    }
    setSearchResults([]);
  };

  const [mapCenter, setMapCenter] = useState([23.0225, 72.5714]);

  // Fetch admin routes
  useEffect(() => {
    const fetchDbRoutes = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${baseUrl}/api/city-rides/routes`);
        const data = await res.json();
        if (data.success) {
          // setDbRoutes(data.routes || []);
          setDbVehicles(data.vehicles || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchDbRoutes();
  }, []);

  // Automatically fetch current location on mount as pickup location
  useEffect(() => {
    const resolveInitialLocation = async () => {
      // If app-level coords already resolved (from useLocation hook), use them directly
      if (userCoords && userCoords.lat && userCoords.lng &&
          (userCoords.lat !== 23.0225 || userCoords.lng !== 72.5714)) {
        const name = await reverseGeocode(userCoords.lat, userCoords.lng);
        setPickup({ lat: userCoords.lat, lng: userCoords.lng, name });
        setPickupSearchQuery(name);
        setMapCenter([userCoords.lat, userCoords.lng]);
        setActiveInput('dropoff');
        return;
      }

      // Try GPS directly (only works on HTTPS or localhost)
      if (navigator.geolocation && window.isSecureContext) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            const name = await reverseGeocode(latitude, longitude);
            setPickup({ lat: latitude, lng: longitude, name });
            setPickupSearchQuery(name);
            setMapCenter([latitude, longitude]);
            setActiveInput('dropoff');
          },
          (error) => {
            console.log('GPS unavailable:', error.code, error.message);
            if (error.code === 1) {
              // Permission denied — user said no
              toast('📍 GPS denied. Tap the map or search to set pickup.', { duration: 4000 });
            } else {
              // Timeout or unavailable — show gentle prompt
              toast('📍 Could not get GPS. Tap the map to set pickup location.', { duration: 3000 });
            }
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      } else if (!window.isSecureContext) {
        // HTTP context — GPS blocked by browser, prompt user to use map
        toast('📍 Tap the map to set your pickup location.', { duration: 3000 });
      }
    };
    resolveInitialLocation();
  }, [userCoords]);


  // Fetch real road route whenever both points are set
  useEffect(() => {
    if (pickup && dropoff) {
      fetchRoadRoute(pickup, dropoff).then((result) => {
        let finalDist = null;
        if (result) {
          setRoutePath(result.coords);
          finalDist = result.distanceKm;
        } else {
          // Straight-line fallback
          setRoutePath([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]);
          const R = 6371;
          const dLat = ((dropoff.lat - pickup.lat) * Math.PI) / 180;
          const dLng = ((dropoff.lng - pickup.lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((pickup.lat * Math.PI) / 180) *
              Math.cos((dropoff.lat * Math.PI) / 180) *
              Math.sin(dLng / 2) ** 2;
          finalDist = (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
        }

        setDistanceKm(finalDist);
      });
    } else {
      setRoutePath(null);
      setDistanceKm(null);
    }
  }, [pickup, dropoff]);

  // Handle map click
  const handleMapClick = useCallback(
    async (lat, lng) => {
      if (!isWithinAhmedabad(lat, lng)) {
        toast.error('Passwala City Rides are strictly available within Ahmedabad city limits only.');
        return;
      }
      const name = await reverseGeocode(lat, lng);
      const loc = { lat, lng, name };
      if (activeInput === 'pickup') {
        setPickup(loc);
        setPickupSearchQuery(name);
        setActiveInput('dropoff');
        toast.success(`Pickup: ${name}`, { icon: '🟢', duration: 2000 });
      } else {
        setDropoff(loc);
        setDropoffSearchQuery(name);
        toast.success(`Drop-off: ${name}`, { icon: '🔴', duration: 2000 });
      }
    },
    [activeInput]
  );

  // Handle chip click
  const handleLocationSelect = (loc) => {
    if (activeInput === 'pickup') {
      setPickup(loc);
      setPickupSearchQuery(loc.name);
      setActiveInput('dropoff');
      toast.success(`Pickup: ${loc.name}`, { icon: '🟢', duration: 2000 });
    } else {
      setDropoff(loc);
      setDropoffSearchQuery(loc.name);
      toast.success(`Drop-off: ${loc.name}`, { icon: '🔴', duration: 2000 });
    }
  };

  // Use current location as pickup
  // const handleUseMyLocation = () => {
  //   if (userCoords && userCoords.lat && userCoords.lng) {
  //     setLocating(true);
  //     if (!isWithinAhmedabad(userCoords.lat, userCoords.lng)) {
  //       toast.error('Passwala City Rides are strictly available within Ahmedabad city limits only.');
  //       setLocating(false);
  //       return;
  //     }
  //     reverseGeocode(userCoords.lat, userCoords.lng).then((name) => {
  //       setPickup({ lat: userCoords.lat, lng: userCoords.lng, name });
  //       setPickupSearchQuery(name);
  //       setActiveInput('dropoff');
  //       setLocating(false);
  //       toast.success(`Your location: ${name}`, { icon: '📍', duration: 2500 });
  //     });
  //     return;
  //   }
  // 
  //   if (!navigator.geolocation) {
  //     toast.error('Geolocation not supported');
  //     return;
  //   }
  //   setLocating(true);
  //   navigator.geolocation.getCurrentPosition(
  //     async (pos) => {
  //       const { latitude, longitude } = pos.coords;
  //       if (!isWithinAhmedabad(latitude, longitude)) {
  //         toast.error('Passwala City Rides are strictly available within Ahmedabad city limits only.');
  //         setLocating(false);
  //         return;
  //       }
  //       const name = await reverseGeocode(latitude, longitude);
  //       setPickup({ lat: latitude, lng: longitude, name });
  //       setPickupSearchQuery(name);
  //       setActiveInput('dropoff');
  //       setLocating(false);
  //       toast.success(`Your location: ${name}`, { icon: '📍', duration: 2500 });
  //     },
  //     () => {
  //       setLocating(false);
  //       toast.error('Could not get your location');
  //     },
  //     { enableHighAccuracy: true }
  //   );
  // };
  // 
  // const handleBookAdminRoute = (route) => {
  //   if (dbVehicles.length === 0) {
  //     toast.error('No vehicles currently available.');
  //     return;
  //   }
  //   const mockPickup = { name: route.start_area, lat: 23.0225, lng: 72.5714 };
  //   const mockDropoff = { name: route.end_area, lat: 23.0300, lng: 72.5800 };
  //   const rideData = {
  //     vehicles: dbVehicles,
  //     distanceKm: route.distance_km,
  //     estimatedPrice: route.base_price,
  //   };
  //   navigate('/ride-checkout', { state: { pickup: mockPickup, dropoff: mockDropoff, rideData, user } });
  // };

  const handleSearchRide = async () => {
    if (!pickup || !dropoff) {
      toast.error('Please select both pickup and drop-off locations');
      return;
    }
    setLoading(true);
    try {
      const platformSettings = (() => {
        try {
          const saved = localStorage.getItem('passwala_platform_settings');
          return saved ? JSON.parse(saved) : { ridePricePerKm: 8 };
        } catch(e) {
          return { ridePricePerKm: 8 };
        }
      })();
      const pricePerKm = platformSettings.ridePricePerKm !== undefined ? platformSettings.ridePricePerKm : 8;

      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(
        `${baseUrl}/api/city-rides/search?pickupLat=${pickup.lat}&pickupLng=${pickup.lng}&dropLat=${dropoff.lat}&dropLng=${dropoff.lng}&pricePerKm=${pricePerKm}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to search rides');
      if (data.vehicles && data.vehicles.length === 0) {
        toast.error('No vehicles currently available for this route.');
        return;
      }
      navigate('/ride-checkout', { state: { pickup, dropoff, rideData: data, user } });
    } catch (err) {
      toast.error(err.message || 'Error searching for rides');
    } finally {
      setLoading(false);
    }
  };

  const formatLocationDisplay = (loc) => {
    if (!loc) return 'Tap map or choose below';
    const coordsStr = `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
    if (loc.name && loc.name !== coordsStr && !loc.name.includes(loc.lat.toFixed(4))) {
      return `${coordsStr} (${loc.name})`;
    }
    return coordsStr;
  };

  return (
    <div className="city-rides-container">
      <div className="cr-header">
        <h2>Book City Ride</h2>
      </div>

      <div className="cr-map-area" style={{ cursor: 'crosshair' }}>
        {/* Map hint banner */}
        <div className="cr-map-hint">
          <MapPin size={13} />
          {activeInput === 'pickup'
            ? 'Tap on the map to set your Pickup Location'
            : 'Tap on the map to set your Drop-off Location'}
        </div>

        {(() => {
          const googleMarkers = [];
          if (pickup) {
            googleMarkers.push({
              position: [pickup.lat, pickup.lng],
              title: `🟢 Pickup: ${pickup.name}`,
              svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="#22c55e" stroke="white" stroke-width="2.5" /></svg>`,
              iconSize: [22, 22],
              iconAnchor: [11, 11]
            });
          }
          if (dropoff) {
            googleMarkers.push({
              position: [dropoff.lat, dropoff.lng],
              title: `🔴 Drop-off: ${dropoff.name}`,
              svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="9" fill="#ef4444" stroke="white" stroke-width="2.5" /></svg>`,
              iconSize: [22, 22],
              iconAnchor: [11, 11]
            });
          }
          dbVehicles.forEach(vehicle => {
            const lat = parseFloat(vehicle.current_lat || vehicle.lat);
            const lng = parseFloat(vehicle.current_lng || vehicle.lng);
            if (isNaN(lat) || isNaN(lng) || lat === 0) return;
            googleMarkers.push({
              position: [lat, lng],
              title: `Available Vehicle (${vehicle.vehicle_type || 'Bike'})`,
              svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38"><circle cx="19" cy="19" r="17" fill="#ff6b00" stroke="white" stroke-width="3" /><g transform="translate(9, 9)"><polygon points="3,11 22,2 13,21 11,13" fill="none" stroke="white" stroke-width="2" style="transform: rotate(45deg); transform-origin: 11px 11px;"/></g></svg>`,
              iconSize: [38, 38],
              iconAnchor: [19, 19]
            });
          });

          const googlePolylines = [];
          if (routePath && routePath.length > 1) {
            googlePolylines.push({
              path: routePath,
              color: '#ff6b00',
              weight: 5
            });
          }

          const fitPoints = [];
          if (pickup) fitPoints.push([pickup.lat, pickup.lng]);
          if (dropoff) fitPoints.push([dropoff.lat, dropoff.lng]);

          return (
            <GoogleMapWrapper
              center={mapCenter}
              zoom={13}
              markers={googleMarkers}
              polylines={googlePolylines}
              fitBoundsPoints={fitPoints}
              onClick={({ lat, lng }) => handleMapClick(lat, lng)}
              style={{ height: '100%', width: '100%' }}
            />
          );
        })()}

        {/* Distance badge on map */}
        {distanceKm && (
          <div className="cr-distance-badge">
            <Navigation size={12} /> {distanceKm} km {t('route_details')}
          </div>
        )}
      </div>

      <div className="cr-booking-panel">
        <div className="cr-input-group">
          {/* Pickup Input Selector */}
          <div 
            className={`cr-input-field ${activeInput === 'pickup' ? 'active' : ''}`}
            onClick={() => setActiveInput('pickup')}
          >
            <div className="cr-dot pickup-dot"></div>
            <div className="cr-input-content">
              <label>{t('pickup_location')}</label>
              <input
                type="text"
                className="cr-real-input"
                placeholder={t('search_pickup_placeholder')}
                value={activeInput === 'pickup' ? pickupSearchQuery : (pickup ? formatLocationDisplay(pickup) : '')}
                onChange={(e) => handleLocationSearch(e.target.value, 'pickup')}
                onFocus={() => {
                  setActiveInput('pickup');
                  setPickupSearchQuery(pickup ? pickup.name : '');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    triggerSearch(pickupSearchQuery, 'pickup');
                  }
                }}
              />
            </div>
            {(pickupSearchQuery || pickup) && activeInput === 'pickup' && (
              <button
                className="cr-clear-btn"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setPickup(null); 
                  setPickupSearchQuery(''); 
                  setSearchResults([]); 
                }}
              >
                <X size={14} />
              </button>
            )}
            
            {/* Pickup Results Dropdown */}
            {activeInput === 'pickup' && searchResults.length > 0 && (
              <div className="cr-search-results-dropdown">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="cr-search-result-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSearchResultSelect(result, 'pickup');
                    }}
                  >
                    <MapPin size={14} className="cr-pin-icon" />
                    <div className="cr-result-text">
                      <span className="cr-result-title">{result.display_name.split(',')[0]}</span>
                      <span className="cr-result-subtitle">{result.display_name.split(',').slice(1).join(',')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="cr-route-line"></div>

          {/* Drop-off Input Selector */}
          <div 
            className={`cr-input-field ${activeInput === 'dropoff' ? 'active' : ''}`}
            onClick={() => setActiveInput('dropoff')}
          >
            <div className="cr-dot dropoff-dot"></div>
            <div className="cr-input-content">
              <label>{t('dropoff_location')}</label>
              <input
                type="text"
                className="cr-real-input"
                placeholder={t('search_dropoff_placeholder')}
                value={activeInput === 'dropoff' ? dropoffSearchQuery : (dropoff ? formatLocationDisplay(dropoff) : '')}
                onChange={(e) => handleLocationSearch(e.target.value, 'dropoff')}
                onFocus={() => {
                  setActiveInput('dropoff');
                  setDropoffSearchQuery(dropoff ? dropoff.name : '');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    triggerSearch(dropoffSearchQuery, 'dropoff');
                  }
                }}
              />
            </div>
            {(dropoffSearchQuery || dropoff) && activeInput === 'dropoff' && (
              <button
                className="cr-clear-btn"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setDropoff(null); 
                  setDropoffSearchQuery(''); 
                  setSearchResults([]); 
                }}
              >
                <X size={14} />
              </button>
            )}
            
            {/* Drop-off Results Dropdown */}
            {activeInput === 'dropoff' && searchResults.length > 0 && (
              <div className="cr-search-results-dropdown">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="cr-search-result-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSearchResultSelect(result, 'dropoff');
                    }}
                  >
                    <MapPin size={14} className="cr-pin-icon" />
                    <div className="cr-result-text">
                      <span className="cr-result-title">{result.display_name.split(',')[0]}</span>
                      <span className="cr-result-subtitle">{result.display_name.split(',').slice(1).join(',')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>



        {/* Popular Areas */}
        <div className="cr-popular-areas">
          <h4>{t('popular_areas')}</h4>
          <div className="cr-area-chips">
            {POPULAR_ROUTES.map((route, i) => (
              <button
                key={i}
                className={`cr-area-chip ${
                  (activeInput === 'pickup' && pickup?.name === route.name) ||
                  (activeInput === 'dropoff' && dropoff?.name === route.name)
                    ? 'selected'
                    : ''
                }`}
                onClick={() => handleLocationSelect(route)}
              >
                <MapPin size={12} /> {route.name}
              </button>
            ))}
          </div>
        </div>

        {/* Search Button */}
        <button
          className="cr-search-btn"
          onClick={handleSearchRide}
          disabled={loading || !pickup || !dropoff}
        >
          {loading ? (
            <div className="cr-spinner"></div>
          ) : (
            <>{t('search_available_rides')} <Search size={18} /></>
          )}
        </button>


      </div>
    </div>
  );
};

export default CityTicketBooking;
