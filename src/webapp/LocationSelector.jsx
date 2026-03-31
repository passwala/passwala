import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Navigation, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './LocationSelector.css';

const LocationSelector = ({ currentLocation, onLocationChange }) => {
  const navigate = useNavigate();

  const ahmedabadAreas = [
    'Satellite, Ahmedabad',
    'Prahlad Nagar, Ahmedabad',
    'Bopal, Ahmedabad',
    'South Bopal, Ahmedabad',
    'Vastrapur, Ahmedabad',
    'Bodakdev, Ahmedabad',
    'S.G. Highway, Ahmedabad',
    'Thaltej, Ahmedabad',
    'Gota, Ahmedabad',
    'Ghatlodia, Ahmedabad',
    'Chandkheda, Ahmedabad',
    'Maninagar, Ahmedabad',
    'Navrangpura, Ahmedabad',
    'C.G. Road, Ahmedabad'
  ];

  const handleSelect = (area) => {
    onLocationChange(area);
    toast.success(`Location set to ${area.split(',')[0]}`);
    navigate(-1);
  };

  const detectLocation = async () => {
    toast.loading('Detecting area...', { id: 'geo' });
    
    // First, try browser Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const area = data.address.suburb || data.address.neighbourhood || data.address.city || 'Ahmedabad';
          const full = `${area}, Ahmedabad`;
          onLocationChange(full);
          toast.success(`Located: ${full}`, { id: 'geo' });
          navigate(-1);
        } catch (err) {
          fallbackToIP();
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
      // Fallback to IP-based location (No HTTPS requirement)
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data.city) {
        const full = `${data.city}, ${data.region}`;
        onLocationChange(full);
        toast.success(`Approximated: ${full}`, { id: 'geo', duration: 3000 });
        navigate(-1);
      } else {
        throw new Error('IP failed');
      }
    } catch (err) {
      toast.error('Could not detect automatically. Please select from the list below.', { id: 'geo' });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      className="location-selector-page"
    >
      <div className="location-header">
        <button className="back-btn-v3" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <h1>Ahmedabad Areas</h1>
      </div>

      <div className="location-content">
        <button className="current-loc-action-v2" onClick={detectLocation}>
          <div className="pulse-circle"></div>
          <Navigation size={20} />
          <span>Detect My Exact Neighborhood</span>
        </button>

        <h3 className="location-section-title">CHOOSE YOUR AREA</h3>
        <div className="cities-list">
          {ahmedabadAreas.map((area) => (
            <button 
              key={area} 
              className={`city-item ${currentLocation === area ? 'active' : ''}`}
              onClick={() => handleSelect(area)}
            >
              <div className="city-info">
                 <div className="area-gps-icon">
                    <MapPin size={16} />
                 </div>
                 <span>{area.split(',')[0]}</span>
              </div>
              {currentLocation === area && <CheckCircle2 size={18} className="check-icon" />}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default LocationSelector;
