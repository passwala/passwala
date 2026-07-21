/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Navigation, ChevronLeft, CheckCircle2, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AHMEDABAD_AREAS as ahmedabadAreas } from '../utils/constants';
import './LocationSelector.css';

const LocationSelector = ({ currentLocation, onLocationChange }) => {
  const navigate = useNavigate();
  const [gpsLoading, setGpsLoading] = useState(false);

  const handleSelect = (areaObj) => {
    onLocationChange(areaObj.name, { lat: areaObj.lat, lng: areaObj.lng });
    toast.success(`Location set to ${areaObj.name.split(',')[0]}`);
    navigate(-1); // return to previous screen immediately after selection
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
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&countrycodes=in&limit=20`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)'
            }
          }
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          const filtered = data.map(place => ({
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

  // ── IP fallback (used when GPS fails) ──────────────────────────────────────
  const fallbackToIP = React.useCallback(async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${baseUrl}/api/ip-location`);
      if (!res.ok) throw new Error('IP Location failed');
      const data = await res.json();

      // 🔒 On local network, private IPs can't be geolocated.
      // Server returns isLocal:true — prompt user to enable GPS or select manually.
      if (data.isLocal) {
        toast('Enable GPS above for precise location, or tap an area below 📍', {
          icon: '📍',
          id: 'geo',
          duration: 5000
        });
        return;
      }

      if (data && data.cityName && data.regionName) {
        const full = `${data.cityName}, ${data.regionName}`;
        onLocationChange(full, {
          lat: parseFloat(data.latitude) || 23.0225,
          lng: parseFloat(data.longitude) || 72.5714
        });
        toast.success(`Approximated: ${full}`, { id: 'geo', duration: 3000 });
      } else {
        throw new Error('IP returned no city');
      }
    } catch (err) {
      toast.error('Automatic detection unavailable. Please select your area manually.', { id: 'geo' });
    }
  }, [onLocationChange]);

  // ── Standard GPS detect (works reliably on all real mobile devices) ────────
  const detectLocation = () => {
    if (gpsLoading) return;

    if (!navigator.geolocation) {
      toast.error('GPS not supported on this device. Please select manually.');
      return;
    }
    setGpsLoading(true);
    toast.loading('Detecting your location...', { id: 'geo' });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`,
            { headers: { 'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)' } }
          );
          const data = await res.json();
          const area  = data.address?.suburb || data.address?.neighbourhood || data.address?.city_district || data.address?.residential || data.address?.road || data.address?.village || '';
          const city  = data.address?.city || data.address?.town || data.address?.state_district || '';
          const label = area && city ? `${area}, ${city}` : city || 'Your Location';
          onLocationChange(label, { lat: latitude, lng: longitude });
          toast.success(`Located: ${label.split(',')[0]}`, { id: 'geo' });
          navigate(-1);
        } catch (err) {
          console.warn('Reverse geocode failed, falling to IP', err);
          await fallbackToIP();
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        console.warn('GPS error:', err.code, err.message);
        setGpsLoading(false);
        fallbackToIP();
      },
      {
        timeout: 10000,         // ⏱️ Give up after 10 sec on mobile
        maximumAge: 60000,      // ♻️ Accept cached fix up to 1 min old
        enableHighAccuracy: false // 🔋 Network-level is enough; saves battery
      }
    );
  };

  const filteredAreas = ahmedabadAreas.filter(area => {
    const q = searchTerm.toLowerCase();
    return area.name.toLowerCase().includes(q) ||
      (area.aliases || []).some(alias => alias.toLowerCase().includes(q));
  });

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
        <div className="auto-detect-card" onClick={detectLocation} style={{ opacity: gpsLoading ? 0.75 : 1 }}>
          <div className="detect-visual">
             {gpsLoading ? (
               <Loader size={24} color="#ff7622" style={{ animation: 'spin 1s linear infinite' }} />
             ) : (
               <>
                 <div className="pulse-ripple"></div>
                 <Navigation size={24} color="#ff7622" />
               </>
             )}
          </div>
          <div className="detect-info">
             <strong>{gpsLoading ? 'Locating you...' : 'Detect My Exact Neighborhood'}</strong>
             <span>{gpsLoading ? 'Please wait, acquiring GPS signal...' : 'Enable GPS for high accuracy'}</span>
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

