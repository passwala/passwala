import React, { useState, useEffect } from 'react';
import { User, MapPin, Mail, Home, Building2, Save, Sparkles, AlertCircle, Navigation } from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';
/* eslint-disable no-unused-vars */
import { motion } from 'framer-motion';
import './CustomerDetails.css';

const CustomerDetails = ({ user, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.displayName || '',
    email: user?.email || '',
    phone: user?.phoneNumber || '',
    houseName: '',
    houseNo: '',
    floor: '',
    society: '',
    landmark: '',
    city: '',
    pincode: '',
    lat: null,
    lng: null
  });
  const [activeAreas, setActiveAreas] = useState([]);

  // Fetch active areas from Admin Panel settings
  useEffect(() => {
    const fetchAreas = async () => {
      const { data } = await supabase
        .from('service_areas')
        .select('area_name')
        .eq('is_active', true);
      if (data) setActiveAreas(data.map(a => a.area_name));
    };
    fetchAreas();
  }, []);

  // Fetch existing data on mount
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      const userId = user.id || user.uid;
      
      // 1. Fetch User Profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('uid', userId)
        .or(`phone.eq.${user.phoneNumber}`)
        .single();
        
      if (profile) {
        setFormData(prev => ({
          ...prev,
          fullName: profile.full_name || prev.fullName,
          email: profile.email || prev.email,
          phone: profile.phone || prev.phone
        }));
      }

      // 2. Fetch Default Address
      const { data: address } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', profile?.id || userId)
        .eq('is_default', true)
        .maybeSingle();

      if (address) {
        // Robust parsing of address_line_1
        // Format: [HouseName, ]HouseNo, [Floor X, ]Society
        const rawLine = address.address_line_1 || '';
        const parts = rawLine.split(', ').map(p => p.trim());
        
        let hName = '';
        let hNo = '';
        let fl = '';
        let soc = '';

        if (parts.length === 4) {
          [hName, hNo, fl, soc] = parts;
          fl = fl.replace('Floor ', '');
        } else if (parts.length === 3) {
          // Could be "HouseNo, Floor X, Society" OR "HouseName, HouseNo, Society"
          if (parts[1].startsWith('Floor ')) {
            [hNo, fl, soc] = parts;
            fl = fl.replace('Floor ', '');
          } else {
            [hName, hNo, soc] = parts;
          }
        } else if (parts.length === 2) {
          [hNo, soc] = parts;
        }

        setFormData(prev => ({
          ...prev,
          houseName: hName,
          houseNo: hNo,
          floor: fl,
          society: soc,
          landmark: address.address_line_2 || '',
          city: address.city || '',
          pincode: address.pincode || ''
        }));
      }
    };

    fetchProfileData();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse geocoding to fill address fields
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const addr = data.address || {};
          
          // Try to match detected area with our activeAreas list
          const detectedSociety = (addr.road || addr.residential || addr.suburb || addr.neighbourhood || '').toLowerCase();
          const matchedArea = activeAreas.find(a => 
            detectedSociety.includes(a.toLowerCase()) || a.toLowerCase().includes(detectedSociety)
          );

          setFormData(prev => ({
            ...prev,
            lat: latitude,
            lng: longitude,
            city: addr.city || addr.town || addr.village || addr.state_district || prev.city,
            pincode: addr.postcode || prev.pincode,
            landmark: addr.suburb || addr.neighbourhood || addr.amenity || prev.landmark,
            society: matchedArea || prev.society
          }));
          
          toast.success('Location & Address details captured! 📍');
        } catch (err) {
          console.error('Reverse Geocode Error:', err);
          setFormData(prev => ({ ...prev, lat: latitude, lng: longitude }));
          toast.success('Coordinates captured, but address lookup failed.');
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('GPS Error:', error);
        toast.error('Could not get precise location. Please enter address manually.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.society || !formData.houseNo) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const userId = user?.id || user?.uid;
      
      // 1. Update/Upsert User Table
      const { data: updatedUser, error: userError } = await supabase
        .from('users')
        .upsert([{ 
          id: userId.length === 36 ? userId : undefined,
          phone: formData.phone || user?.phoneNumber,
          full_name: formData.fullName,
          email: formData.email 
        }], { onConflict: 'phone' })
        .select()
        .single();

      // Attempt Sync through Backend
      const response = await fetch(`http://${window.location.hostname}:3004/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid || userId,
          email: formData.email,
          displayName: formData.fullName,
          authProvider: 'google',
          address: {
            address_line_1: `${formData.houseName ? formData.houseName + ', ' : ''}${formData.houseNo}, ${formData.floor ? 'Floor ' + formData.floor + ', ' : ''}${formData.society}`,
            address_line_2: formData.landmark,
            city: formData.city,
            pincode: formData.pincode
          }
        })
      });

      // 2. Update/Upsert Addresses Table directly in Supabase
      const { data: savedAddr, error: addressError } = await supabase
        .from('addresses')
        .upsert([{
          user_id: updatedUser?.id || userId,
          address_line_1: `${formData.houseName ? formData.houseName + ', ' : ''}${formData.houseNo}, ${formData.floor ? 'Floor ' + formData.floor + ', ' : ''}${formData.society}`,
          address_line_2: formData.landmark,
          city: formData.city,
          pincode: formData.pincode,
          lat: formData.lat,
          lng: formData.lng,
          is_default: true,
          // Store these in separate columns if they exist, or just rely on address_line_1
          house_no: formData.houseNo,
          floor: formData.floor,
          society: formData.society
        }], { onConflict: 'user_id' })
        .select()
        .single();

      if (addressError) {
        console.warn('Supabase address save error (continuing):', addressError.message);
      }

      if (response && !response.ok) {
        console.warn('Backend sync failed, but Supabase updated.');
      }

      toast.success('Profile & Address saved! ✨');
      if (onComplete) onComplete(savedAddr || {
        house_no: formData.houseNo,
        floor: formData.floor,
        society: formData.society
      });
    } catch (error) {
      console.error('Update profile error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to update profile. Please try again.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-details-page">
      <motion.div 
        className="details-container glass shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="details-header">
          <div className="sparkle-title">
            <Sparkles className="icon-sparkle" />
            <h1>Complete Your Profile</h1>
          </div>
          <p>Help us serve you better in your neighborhood</p>
        </div>

        <form onSubmit={handleSubmit} className="details-form">
          {/* Identity Section */}
          <section className="form-section">
            <h3 className="section-title"><User size={18} /> Basic Identity</h3>
            <div className="input-row">
              <div className="input-group-v2">
                <label>Full Name *</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input 
                    name="fullName" 
                    value={formData.fullName} 
                    onChange={handleChange} 
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>
              <div className="input-group-v2">
                <label>Email Address</label>
                <div className={`input-with-icon ${user?.email ? 'disabled' : ''}`}>
                  <Mail size={18} />
                  <input 
                    name="email" 
                    type="email"
                    value={formData.email} 
                    onChange={handleChange} 
                    placeholder="Enter your email address"
                    disabled={user?.email} // Disable if already have verified email from Google/Firebase
                  />
                </div>
              </div>
            </div>
          </section>
          {/* Location Section */}
          <section className="form-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="section-title" style={{ margin: 0 }}><MapPin size={18} /> Delivery Address</h3>
              <button 
                type="button" 
                onClick={detectLocation}
                className="detect-loc-btn"
                style={{ 
                  fontSize: '0.75rem', 
                  padding: '6px 12px', 
                  borderRadius: '10px', 
                  background: formData.lat ? '#22c55e' : '#ff7622',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >
                <Navigation size={14} style={{ transform: 'rotate(45deg)' }} />
                {formData.lat ? 'Location Captured' : 'Detect My Location'}
              </button>
            </div>
            
            <div className="input-group-v2" style={{ marginBottom: '1.2rem' }}>
              <label>House / Bungalow Name</label>
              <div className="input-with-icon">
                <Home size={18} />
                <input 
                  name="houseName" 
                  value={formData.houseName} 
                  onChange={handleChange} 
                  placeholder="e.g. Silver Oak / Harmony"
                />
              </div>
            </div>

            <div className="input-grid-v2">
              <div className="input-group-v2">
                <label>House / Flat No *</label>
                <div className="input-with-icon">
                  <Home size={18} />
                  <input 
                    name="houseNo" 
                    value={formData.houseNo} 
                    onChange={handleChange} 
                    placeholder="e.g. A-101"
                    required
                  />
                </div>
              </div>
              <div className="input-group-v2">
                <label>Floor</label>
                <div className="input-with-icon">
                  <Building2 size={18} />
                  <input 
                    name="floor" 
                    value={formData.floor} 
                    onChange={handleChange} 
                    placeholder="e.g. 1st Floor"
                  />
                </div>
              </div>
            </div>

            <div className="input-group-v2">
              <label>Select Neighborhood / Area *</label>
              <div className="input-with-icon">
                <Building2 size={18} />
                <select 
                  name="society" 
                  value={formData.society} 
                  onChange={handleChange} 
                  required
                  className="area-select-v2"
                >
                  <option value="">-- Choose your Area --</option>
                  {activeAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                  {activeAreas.length === 0 && (
                    <>
                      <option value="Satellite">Satellite</option>
                      <option value="Paldi">Paldi</option>
                      <option value="Bopal">Bopal</option>
                      <option value="Sindhu Bhavan">Sindhu Bhavan</option>
                    </>
                  )}
                </select>
              </div>
              <p className="field-tip-v2">Choose from our verified service regions</p>
            </div>

            <div className="input-group-v2">
              <label>Landmark (Optional)</label>
              <div className="input-with-icon">
                <MapPin size={18} />
                <input 
                  name="landmark" 
                  value={formData.landmark} 
                  onChange={handleChange} 
                  placeholder="e.g. Opposite City Mall"
                />
              </div>
            </div>

            <div className="input-row">
              <div className="input-group-v2">
                <label>City</label>
                <div className="input-with-icon">
                  <MapPin size={18} />
                  <input 
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City Name"
                  />
                </div>
              </div>
              <div className="input-group-v2">
                <label>Pincode</label>
                <div className="input-with-icon">
                  <span className="pincode-icon">🏢</span>
                  <input 
                    name="pincode" 
                    value={formData.pincode} 
                    onChange={handleChange} 
                    placeholder="6-digit Pincode"
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="details-footer">
            <div className="privacy-msg">
              <AlertCircle size={14} />
              <span>Only used for delivery verification.</span>
            </div>
            <button type="submit" className="save-btn-v5" disabled={loading}>
              {loading ? (
                <div className="details-spinner" />
              ) : (
                <><Save size={18} /> Save Details</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CustomerDetails;
