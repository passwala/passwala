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

  const detectLocation = async () => {
    toast.loading('Detecting area...', { id: 'geo' });
    
    // First, try browser Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const area = data.address?.suburb || data.address?.neighbourhood || data.address?.city || data.address?.town || 'My Location';
          const city = data.address?.city || data.address?.town || data.address?.state_district || '';
          const full = city ? `${area}, ${city}` : area;
          onLocationChange(full);
          toast.success(`Located: ${full}`, { id: 'geo' });
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
        <button className="back-btn-v3" onClick={handleBack}>
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
              key={area.name} 
              className={`city-item ${currentLocation === area.name ? 'active' : ''}`}
              onClick={() => handleSelect(area)}
            >
              <div className="city-info">
                 <div className="area-gps-icon">
                    <MapPin size={16} />
                 </div>
                 <span>{area.name.split(',')[0]}</span>
              </div>
              {currentLocation === area.name && <CheckCircle2 size={18} className="check-icon" />}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default LocationSelector;
