import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search, Navigation, ArrowRight, Map, LocateFixed, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './CityTicketBooking.css';

// Fix for default Leaflet markers in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom colored markers
const createColoredMarker = (color) =>
  new L.DivIcon({
    className: '',
    html: `<div style="
      width:22px; height:22px;
      background:${color};
      border:3px solid white;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 3px 10px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22],
  });

const pickupIcon = createColoredMarker('#22c55e');
const dropoffIcon = createColoredMarker('#ef4444');

const POPULAR_ROUTES = [
  { name: 'CG Road', lat: 23.0375, lng: 72.5567 },
  { name: 'Maninagar', lat: 22.9996, lng: 72.6021 },
  { name: 'Naroda', lat: 23.0694, lng: 72.6560 },
  { name: 'Chandkheda', lat: 23.1091, lng: 72.5855 },
  { name: 'Bopal', lat: 23.0333, lng: 72.4632 },
  { name: 'Satellite', lat: 23.0284, lng: 72.5239 },
  { name: 'SG Highway', lat: 23.0566, lng: 72.5218 },
];

// Reverse geocode a lat/lng to a human-readable name
async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
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
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

// Fetch real road route from OSRM
async function fetchRoadRoute(pickup, dropoff) {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson&steps=false`
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

// Component to handle map clicks
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      onMapClick(lat, lng);
    },
  });
  return null;
}

// Auto-fit map bounds
function FitBounds({ pickup, dropoff }) {
  const map = useMap();
  useEffect(() => {
    if (pickup && dropoff) {
      const bounds = L.latLngBounds(
        [pickup.lat, pickup.lng],
        [dropoff.lat, dropoff.lng]
      );
      map.fitBounds(bounds, { padding: [60, 60] });
    } else if (pickup) {
      map.setView([pickup.lat, pickup.lng], 15);
    } else if (dropoff) {
      map.setView([dropoff.lat, dropoff.lng], 15);
    }
  }, [pickup, dropoff, map]);
  return null;
}

const CityTicketBooking = ({ user }) => {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeInput, setActiveInput] = useState('pickup');
  const [routePath, setRoutePath] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [locating, setLocating] = useState(false);
  const [dbRoutes, setDbRoutes] = useState([]);
  const [dbVehicles, setDbVehicles] = useState([]);

  const center = [23.0225, 72.5714];

  // Fetch admin routes
  useEffect(() => {
    const fetchDbRoutes = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${baseUrl}/api/city-rides/routes`);
        const data = await res.json();
        if (data.success) {
          setDbRoutes(data.routes || []);
          setDbVehicles(data.vehicles || []);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchDbRoutes();
  }, []);

  // Fetch real road route whenever both points are set
  useEffect(() => {
    if (pickup && dropoff) {
      fetchRoadRoute(pickup, dropoff).then((result) => {
        if (result) {
          setRoutePath(result.coords);
          setDistanceKm(result.distanceKm);
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
          setDistanceKm((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
        }
      });
    } else {
      setRoutePath(null);
      setDistanceKm(null);
    }
  }, [pickup, dropoff]);

  // Handle map click
  const handleMapClick = useCallback(
    async (lat, lng) => {
      const name = await reverseGeocode(lat, lng);
      const loc = { lat, lng, name };
      if (activeInput === 'pickup') {
        setPickup(loc);
        setActiveInput('dropoff');
        toast.success(`Pickup: ${name}`, { icon: '🟢', duration: 2000 });
      } else {
        setDropoff(loc);
        toast.success(`Drop-off: ${name}`, { icon: '🔴', duration: 2000 });
      }
    },
    [activeInput]
  );

  // Handle chip click
  const handleLocationSelect = (loc) => {
    if (activeInput === 'pickup') {
      setPickup(loc);
      setActiveInput('dropoff');
      toast.success(`Pickup: ${loc.name}`, { icon: '🟢', duration: 2000 });
    } else {
      setDropoff(loc);
      toast.success(`Drop-off: ${loc.name}`, { icon: '🔴', duration: 2000 });
    }
  };

  // Use current location as pickup
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const name = await reverseGeocode(latitude, longitude);
        setPickup({ lat: latitude, lng: longitude, name });
        setActiveInput('dropoff');
        setLocating(false);
        toast.success(`Your location: ${name}`, { icon: '📍', duration: 2500 });
      },
      () => {
        setLocating(false);
        toast.error('Could not get your location');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleBookAdminRoute = (route) => {
    if (dbVehicles.length === 0) {
      toast.error('No vehicles currently available.');
      return;
    }
    const mockPickup = { name: route.start_area, lat: 23.0225, lng: 72.5714 };
    const mockDropoff = { name: route.end_area, lat: 23.0300, lng: 72.5800 };
    const rideData = {
      vehicles: dbVehicles,
      distanceKm: route.distance_km,
      estimatedPrice: route.base_price,
    };
    navigate('/ride-checkout', { state: { pickup: mockPickup, dropoff: mockDropoff, rideData, user } });
  };

  const handleSearchRide = async () => {
    if (!pickup || !dropoff) {
      toast.error('Please select both pickup and drop-off locations');
      return;
    }
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(
        `${baseUrl}/api/city-rides/search?pickupLat=${pickup.lat}&pickupLng=${pickup.lng}&dropLat=${dropoff.lat}&dropLng=${dropoff.lng}`
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

  return (
    <div className="city-rides-container">
      <div className="cr-header">
        <h2>Book City Ride</h2>
      </div>

      {/* Map hint banner */}
      <div className="cr-map-hint">
        <MapPin size={13} />
        {activeInput === 'pickup'
          ? 'Tap on the map to set your Pickup Location'
          : 'Tap on the map to set your Drop-off Location'}
      </div>

      <div className="cr-map-area" style={{ cursor: 'crosshair' }}>
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <MapClickHandler onMapClick={handleMapClick} />
          <FitBounds pickup={pickup} dropoff={dropoff} />

          {pickup && (
            <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
              <Popup>
                <strong>🟢 Pickup</strong><br />{pickup.name}
              </Popup>
            </Marker>
          )}
          {dropoff && (
            <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
              <Popup>
                <strong>🔴 Drop-off</strong><br />{dropoff.name}
              </Popup>
            </Marker>
          )}
          {routePath && routePath.length > 1 && (
            <Polyline
              positions={routePath}
              color="#ff6b00"
              weight={5}
              opacity={0.85}
              dashArray={null}
            />
          )}
        </MapContainer>

        {/* Distance badge on map */}
        {distanceKm && (
          <div className="cr-distance-badge">
            <Navigation size={12} /> {distanceKm} km road distance
          </div>
        )}
      </div>

      <div className="cr-booking-panel">
        {/* Input Group */}
        <div className="cr-input-group">
          <div
            className={`cr-input-field ${activeInput === 'pickup' ? 'active' : ''}`}
            onClick={() => setActiveInput('pickup')}
          >
            <div className="cr-dot pickup-dot"></div>
            <div className="cr-input-content">
              <label>PICKUP LOCATION</label>
              <span className={pickup ? 'has-value' : ''}>
                {pickup ? pickup.name : 'Tap map or choose below'}
              </span>
            </div>
            {pickup && (
              <button
                className="cr-clear-btn"
                onClick={(e) => { e.stopPropagation(); setPickup(null); setActiveInput('pickup'); }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="cr-route-line"></div>

          <div
            className={`cr-input-field ${activeInput === 'dropoff' ? 'active' : ''}`}
            onClick={() => setActiveInput('dropoff')}
          >
            <div className="cr-dot dropoff-dot"></div>
            <div className="cr-input-content">
              <label>DROP-OFF LOCATION</label>
              <span className={dropoff ? 'has-value' : ''}>
                {dropoff ? dropoff.name : 'Tap map or choose below'}
              </span>
            </div>
            {dropoff && (
              <button
                className="cr-clear-btn"
                onClick={(e) => { e.stopPropagation(); setDropoff(null); }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Use My Location */}
        <button className="cr-locate-btn" onClick={handleUseMyLocation} disabled={locating}>
          <LocateFixed size={16} />
          {locating ? 'Detecting location...' : 'Use My Current Location as Pickup'}
        </button>

        {/* Popular Areas */}
        <div className="cr-popular-areas">
          <h4>Popular Areas in Ahmedabad</h4>
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
            <>Search Available Rides <Search size={18} /></>
          )}
        </button>

        {/* Admin / Verified Routes */}
        <div className="admin-routes-container">
          <h4><Map size={18} color="var(--primary)" /> Premium Verified Routes</h4>
          {dbRoutes.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              No active verified routes found.
            </p>
          ) : (
            <div className="admin-routes-list">
              {dbRoutes.map((route) => (
                <div key={route.id} className="admin-route-card">
                  <div className="admin-route-info">
                    <div className="admin-route-locations">
                      {route.start_area} <ArrowRight size={14} className="admin-route-arrow" /> {route.end_area}
                    </div>
                    <div className="admin-route-meta">
                      <span className="admin-route-badge">
                        <Navigation size={12} color="var(--primary)" /> {route.distance_km} km
                      </span>
                      <span className="admin-route-badge" style={{ color: '#22c55e', background: 'rgba(34,197,94,0.1)' }}>
                        ₹{route.base_price}
                      </span>
                    </div>
                  </div>
                  <button className="admin-route-book-btn" onClick={() => handleBookAdminRoute(route)}>
                    Book Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CityTicketBooking;
