/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Navigation, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useSecureLocation } from '../hooks/useSecureLocation';
import { AHMEDABAD_AREAS as ahmedabadAreas } from '../utils/constants';
import './LocationSelector.css';

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

  const [detecting, setDetecting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
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
    } finally {
      setDetecting(false);
    }
  }, [onLocationChange]);
  React.useEffect(() => {
    if (lat && lng && address) {
      onLocationChange(address, { lat, lng });
      toast.success(`Securely Located: ${address}`, { id: 'geo' });
      stopTracking();
      setDetecting(false);
    }
  }, [lat, lng, address, onLocationChange, stopTracking]);

  React.useEffect(() => {
    if (error) {
      if (errorCode === 'MOCK_DETECTED') {
        toast.error('❌ Fake GPS App Detected! Please disable mock locations.', { id: 'geo', duration: 5000 });
      } else {
        toast.error(`Error: ${error}`, { id: 'geo' });
      }
      setDetecting(false);
      stopTracking();
      fallbackToIP();
    }
  }, [error, errorCode, stopTracking, fallbackToIP]);

  React.useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

  const filteredAreas = ahmedabadAreas.filter(area => 
    area.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const detectLocation = () => {
    if (detecting || loading) return;
    setDetecting(true);
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
            placeholder="Search neighborhood..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
             <strong>{detecting ? 'Locating...' : 'Detect My Exact Neighborhood'}</strong>
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
             {filteredAreas.length > 0 ? (
               filteredAreas.map((area) => (
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
               ))
             ) : (
               <div className="no-results-location">
                  <p>No neighborhoods found matching "{searchTerm}"</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LocationSelector;
