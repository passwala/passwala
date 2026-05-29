import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, MapPin, Search, Navigation } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './CityTicketBooking.css';

// Fix for default Leaflet markers in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Ahmedabad approximate bounding box
const AHMEDABAD_BOUNDS = {
  minLat: 22.9,
  maxLat: 23.25,
  minLng: 72.4,
  maxLng: 72.7
};

const POPULAR_ROUTES = [
  { name: 'CG Road', lat: 23.0375, lng: 72.5567 },
  { name: 'Maninagar', lat: 22.9996, lng: 72.6021 },
  { name: 'Naroda', lat: 23.0694, lng: 72.6560 },
  { name: 'Chandkheda', lat: 23.1091, lng: 72.5855 },
  { name: 'Bopal', lat: 23.0333, lng: 72.4632 },
  { name: 'Satellite', lat: 23.0284, lng: 72.5239 },
  { name: 'SG Highway', lat: 23.0566, lng: 72.5218 }
];

function SetMapBounds({ pickup, dropoff }) {
  const map = useMap();
  useEffect(() => {
    if (pickup && dropoff) {
      const bounds = L.latLngBounds([pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (pickup) {
      map.setView([pickup.lat, pickup.lng], 14);
    }
  }, [pickup, dropoff, map]);
  return null;
}

const CityTicketBooking = ({ onBack, user }) => {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeInput, setActiveInput] = useState('pickup');
  const [routePath, setRoutePath] = useState(null);

  // Default center to Ahmedabad
  const center = [23.0225, 72.5714];

  const handleLocationSelect = (loc) => {
    if (activeInput === 'pickup') {
      setPickup(loc);
      setActiveInput('dropoff');
    } else {
      setDropoff(loc);
    }
  };

  useEffect(() => {
    if (pickup && dropoff) {
      const fetchRoute = async () => {
        try {
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`);
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            // OSRM returns [lng, lat], Leaflet needs [lat, lng]
            const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
            setRoutePath(coords);
          }
        } catch (e) {
          console.error('Failed to fetch route:', e);
        }
      };
      fetchRoute();
    } else {
      setRoutePath(null);
    }
  }, [pickup, dropoff]);

  const handleSearchRide = async () => {
    if (!pickup || !dropoff) {
      toast.error('Please select both pickup and drop-off locations');
      return;
    }
    
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/city-rides/search?pickupLat=${pickup.lat}&pickupLng=${pickup.lng}&dropLat=${dropoff.lat}&dropLng=${dropoff.lng}`);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to search rides');
      }

      if (data.vehicles && data.vehicles.length === 0) {
        toast.error('No vehicles currently available for this route.');
        setLoading(false);
        return;
      }

      // Navigate to checkout with search data
      navigate('/ride-checkout', { 
        state: { 
          pickup, 
          dropoff, 
          rideData: data,
          user
        } 
      });
      
    } catch (err) {
      console.error(err);
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

      <div className="cr-map-area">
        <MapContainer center={center} zoom={12} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pickup && <Marker position={[pickup.lat, pickup.lng]}><Popup>Pickup: {pickup.name}</Popup></Marker>}
          {dropoff && <Marker position={[dropoff.lat, dropoff.lng]}><Popup>Dropoff: {dropoff.name}</Popup></Marker>}
          {pickup && dropoff && (
            <Polyline 
              positions={routePath || [
                [pickup.lat, pickup.lng],
                [dropoff.lat, dropoff.lng]
              ]} 
              color="#ff6b00" 
              weight={5}
              opacity={0.8}
            />
          )}
          <SetMapBounds pickup={pickup} dropoff={dropoff} />
        </MapContainer>
      </div>

      <div className="cr-booking-panel">
        <div className="cr-badge">Strictly Ahmedabad Only</div>
        
        <div className="cr-input-group">
          <div className={`cr-input-field ${activeInput === 'pickup' ? 'active' : ''}`} onClick={() => setActiveInput('pickup')}>
            <div className="cr-dot pickup-dot"></div>
            <div className="cr-input-content">
              <label>Pickup Location</label>
              <span>{pickup ? pickup.name : 'Select from map or list'}</span>
            </div>
          </div>
          
          <div className="cr-route-line"></div>
          
          <div className={`cr-input-field ${activeInput === 'dropoff' ? 'active' : ''}`} onClick={() => setActiveInput('dropoff')}>
            <div className="cr-dot dropoff-dot"></div>
            <div className="cr-input-content">
              <label>Drop-off Location</label>
              <span>{dropoff ? dropoff.name : 'Select from map or list'}</span>
            </div>
          </div>
        </div>

        <div className="cr-popular-areas">
          <h4>Popular Areas in Ahmedabad</h4>
          <div className="cr-area-chips">
            {POPULAR_ROUTES.map((route, i) => (
              <button 
                key={i} 
                className="cr-area-chip"
                onClick={() => handleLocationSelect(route)}
              >
                <MapPin size={12} /> {route.name}
              </button>
            ))}
          </div>
        </div>

        <button 
          className="cr-search-btn" 
          onClick={handleSearchRide}
          disabled={loading || !pickup || !dropoff}
        >
          {loading ? (
            <div className="animate-spin cr-spinner"></div>
          ) : (
            <>Search Available Rides <Search size={18} /></>
          )}
        </button>
      </div>
    </div>
  );
};

export default CityTicketBooking;
