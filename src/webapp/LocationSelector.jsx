/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Navigation, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './LocationSelector.css';

const LocationSelector = ({ currentLocation, onLocationChange }) => {
  const navigate = useNavigate();

  const ahmedabadAreas = [
    { name: 'Satellite, Ahmedabad', lat: 23.0305, lng: 72.5075 },
    { name: 'Prahlad Nagar, Ahmedabad', lat: 23.0120, lng: 72.5108 },
    { name: 'Bopal, Ahmedabad', lat: 23.0350, lng: 72.4397 },
    { name: 'South Bopal, Ahmedabad', lat: 23.0158, lng: 72.4566 },
    { name: 'Vastrapur, Ahmedabad', lat: 23.0393, lng: 72.5244 },
    { name: 'Bodakdev, Ahmedabad', lat: 23.0416, lng: 72.5133 },
    { name: 'S.G. Highway, Ahmedabad', lat: 23.0257, lng: 72.5033 },
    { name: 'Thaltej, Ahmedabad', lat: 23.0497, lng: 72.5107 },
    { name: 'Gota, Ahmedabad', lat: 23.0753, lng: 72.5258 },
    { name: 'Ghatlodia, Ahmedabad', lat: 23.0645, lng: 72.5413 },
    { name: 'Chandkheda, Ahmedabad', lat: 23.1119, lng: 72.5854 },
    { name: 'Maninagar, Ahmedabad', lat: 22.9972, lng: 72.6014 },
    { name: 'Navrangpura, Ahmedabad', lat: 23.0333, lng: 72.5621 },
    { name: 'C.G. Road, Ahmedabad', lat: 23.0269, lng: 72.5599 }
  ];

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

  const filteredAreas = ahmedabadAreas.filter(area => 
    area.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const detectLocation = async () => {
    // ... same detection logic ...
    if (detecting) return;
    setDetecting(true);
    toast.loading('Finding your location...', { id: 'geo' });
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const area = data.address?.suburb || data.address?.neighbourhood || data.address?.city || data.address?.town || 'My Location';
          const city = data.address?.city || data.address?.town || data.address?.state_district || '';
          const full = city ? `${area}, ${city}` : area;
          onLocationChange(full, { lat: latitude, lng: longitude });
          toast.success(`Located: ${full}`, { id: 'geo' });
        } catch (err) {
          fallbackToIP();
        } finally {
          setDetecting(false);
        }
      }, () => {
        fallbackToIP();
      }, { timeout: 10000 });
    } else {
      fallbackToIP();
    }
  };

  const fallbackToIP = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data.city) {
        const full = `${data.city}, ${data.region}`;
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
