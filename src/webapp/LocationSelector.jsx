/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Navigation, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useSecureLocation } from '../hooks/useSecureLocation';
import { AHMEDABAD_AREAS as ahmedabadAreas } from '../utils/constants';
import './LocationSelector.css';

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

const LocationSelector = ({ currentLocation, onLocationChange }) => {
  const navigate = useNavigate();

  const handleSelect = (areaObj) => {
    onLocationChange(areaObj.name, { lat: areaObj.lat, lng: areaObj.lng });
    toast.success(`Location set to ${areaObj.name.split(',')[0]}`);
  };

  const handleBack = () => {
    if (!currentLocation) {
      toast.error('Location is compulsory for real-time services!');
      return;
    }
    navigate(-1);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchDebounceRef = React.useRef(null);

  const handleSearchChange = (val) => {
    setSearchTerm(val);
    if (!val || val.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    setSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const suffix = val.toLowerCase().includes('ahmedabad') ? '' : ', Ahmedabad, Gujarat';
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val + suffix)}&countrycodes=in&limit=20`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)'
            }
          }
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          const filtered = data.filter(place => 
            isWithinAhmedabad(parseFloat(place.lat), parseFloat(place.lon))
          ).map(place => ({
            name: place.display_name,
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon)
          }));
          setSearchResults(filtered);
        }
      } catch (err) {
        console.error('Nominatim search failed in LocationSelector:', err);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  
  const { lat, lng, error, errorCode, isMock, address, loading, startTracking, stopTracking } = useSecureLocation();

  const fallbackToIP = React.useCallback(async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${baseUrl}/api/ip-location`);
      if (!res.ok) throw new Error('Proxied IP Location failed');
      const data = await res.json();
      if (data && data.cityName && data.regionName) {
        const full = `${data.cityName}, ${data.regionName}`;
        onLocationChange(full, { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) });
        toast.success(`Approximated: ${full}`, { id: 'geo', duration: 3000 });
      } else {
        throw new Error('IP failed');
      }
    } catch (err) {
      toast.error('Automatic detection unavailable. Please select your area manually.', { id: 'geo' });
    }
  }, [onLocationChange]);

  React.useEffect(() => {
    if (lat && lng && address) {
      onLocationChange(address, { lat, lng });
      toast.success(`Securely Located: ${address}`, { id: 'geo' });
      stopTracking();
    }
  }, [lat, lng, address, onLocationChange, stopTracking]);

  React.useEffect(() => {
    if (error) {
      if (errorCode === 'MOCK_DETECTED') {
        toast.error('❌ Fake GPS App Detected! Please disable mock locations.', { id: 'geo', duration: 5000 });
      } else {
        toast.error(`Error: ${error}`, { id: 'geo' });
      }
      stopTracking();
      fallbackToIP();
    }
  }, [error, errorCode, stopTracking, fallbackToIP]);

  React.useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

  const filteredAreas = ahmedabadAreas.filter(area => {
    const q = searchTerm.toLowerCase();
    return area.name.toLowerCase().includes(q) || 
      (area.aliases || []).some(alias => alias.toLowerCase().includes(q));
  });

  const detectLocation = () => {
    if (loading) return;
    toast.loading('Initializing secure GPS tracker...', { id: 'geo' });
    startTracking();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="location-selector-page"
    >
      <div className="location-header-premium">
        <div className="header-top-row">
          <button className="back-mini-circle" onClick={handleBack}>
            <ChevronLeft size={24} />
          </button>
          <div className="header-title-stack">
            <h1>Neighborhood Hub</h1>
            <span>Find your local expert today</span>
          </div>
        </div>

        <div className="location-search-box">
          <Search size={20} className="search-icon-v3" />
          <input 
            type="text" 
            placeholder="Search neighborhood, shop, or address..." 
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="location-scroll-content">
        <div className="auto-detect-card" onClick={detectLocation}>
          <div className="detect-visual">
             <div className="pulse-ripple"></div>
             <Navigation size={24} color="#ff7622" />
          </div>
          <div className="detect-info">
             <strong>{loading ? 'Locating...' : 'Detect My Exact Neighborhood'}</strong>
             <span>Enable GPS for high accuracy</span>
          </div>
        </div>

        <div className="privacy-notice" style={{ 
          fontSize: '11px', 
          color: '#64748b', 
          textAlign: 'center', 
          marginTop: '12px', 
          padding: '8px 16px',
          background: 'rgba(99, 102, 241, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(99, 102, 241, 0.1)',
          lineHeight: '1.4'
        }}>
          🔒 <strong>Privacy Guard Active:</strong> Your IP address is proxied securely through our backend server to prevent sharing your connection details with third-party tracking networks.
        </div>

        <div className="neighborhood-list-container">
           <h3 className="section-label-v3">EXPLORE AHMEDABAD</h3>
           
           <div className="neighborhood-grid">
             {filteredAreas.length > 0 || searchResults.length > 0 ? (
               <>
                 {filteredAreas.map((area) => (
                   <button 
                     key={area.name} 
                     className={`neighborhood-item ${currentLocation === area.name ? 'selected' : ''}`}
                     onClick={() => handleSelect(area)}
                   >
                     <div className="neighborhood-icon-box">
                        <MapPin size={18} />
                     </div>
                     <div className="neighborhood-meta">
                        <strong>{area.name.split(',')[0]}</strong>
                        <span>Ahmedabad</span>
                     </div>
                     {currentLocation === area.name && <CheckCircle2 size={20} className="selection-tick" />}
                   </button>
                 ))}

                 {searchResults.map((area, idx) => (
                   <button 
                     key={`ext-${idx}`} 
                     className={`neighborhood-item ${currentLocation === area.name ? 'selected' : ''}`}
                     onClick={() => handleSelect(area)}
                   >
                     <div className="neighborhood-icon-box" style={{ background: 'rgba(255, 118, 34, 0.1)', color: '#ff7622' }}>
                        <MapPin size={18} />
                     </div>
                     <div className="neighborhood-meta">
                        <strong>{area.name.split(',')[0]}</strong>
                        <span style={{ fontSize: '10px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                          {area.name.split(',').slice(1, 4).join(',')}
                        </span>
                     </div>
                     {currentLocation === area.name && <CheckCircle2 size={20} className="selection-tick" />}
                   </button>
                 ))}
               </>
             ) : (
               <div className="no-results-location">
                  <p>{searching ? 'Searching addresses...' : `No neighborhoods or addresses found matching "${searchTerm}"`}</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LocationSelector;

