/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { User, MapPin, Home, Building2, AlertCircle, Navigation, Phone, Search, ShieldCheck, Share2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSecureLocation } from '../hooks/useSecureLocation';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';
import { auth } from '../firebase';
import { updateProfile } from 'firebase/auth';
import './CustomerDetails.css';

const CustomerDetails = ({ user, onComplete }) => {
  const [formData, setFormData] = useState({
    fullName: user?.displayName || '',
    phone: (user?.phoneNumber || '').replace(/[\s\-().]/g, '').replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, ''),
    email: user?.email || '',
    houseName: '',
    houseNo: 'A-101',
    floor: '1st Floor',
    society: 'Satellite',
    landmark: 'Near Central Plaza',
    city: 'Ahmedabad',
    pincode: '380015',
    lat: null,
    lng: null
  });
  const [view, setView] = useState('identity'); // 'identity' | 'address_selection' | 'address_form'
  const [errors, setErrors] = useState({});
  const [activeAreas, setActiveAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingPromo, setCheckingPromo] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);

  const { lat, lng, error: geoError, errorCode, rawAddressObj, loading: geoLoading, startTracking, stopTracking } = useSecureLocation();

  useEffect(() => {
    if (lat && lng && rawAddressObj) {
      const addr = rawAddressObj;
      const detectedSociety = (addr.road || addr.residential || addr.suburb || addr.neighbourhood || '').toLowerCase();
      const matchedArea = activeAreas.find(a => 
        detectedSociety.includes(a.toLowerCase()) || a.toLowerCase().includes(detectedSociety)
      );

      setFormData(prev => ({
        ...prev,
        lat: lat,
        lng: lng,
        city: addr.city || addr.town || addr.village || addr.state_district || prev.city,
        pincode: addr.postcode || prev.pincode,
        landmark: addr.suburb || addr.neighbourhood || addr.amenity || prev.landmark,
        society: matchedArea || prev.society
      }));
      
      toast.success('Location & Address details secured! 📍', { id: 'geo-detect' });
      stopTracking();
      setLoading(false);
    }
  }, [lat, lng, rawAddressObj, stopTracking, activeAreas]);

  useEffect(() => {
    if (geoError) {
      if (errorCode === 'MOCK_DETECTED') {
        toast.error('❌ Fake GPS detected! Delivery address must be real.', { id: 'geo-error', duration: 5000 });
      } else {
        toast.error(geoError, { id: 'geo-error' });
      }
      stopTracking();
      setLoading(false);
    }
  }, [geoError, errorCode, stopTracking]);

  useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

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

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      const userId = user.id || user.uid;
      const cleanPhone = (user.phoneNumber || user.phone || '').replace(/[\s\-().]/g, '').replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '');
      
      if (!userId && !cleanPhone) return;

      // 1. Fetch User Profile
      let query = supabase.from('users').select('*');
      if (userId && cleanPhone) {
        query = query.or(`uid.eq.${userId},phone.eq.${cleanPhone}`);
      } else if (userId) {
        query = query.eq('uid', userId);
      } else if (cleanPhone) {
        query = query.eq('phone', cleanPhone);
      }
      
      const { data: profile } = await query.maybeSingle();
         
      if (profile) {
        setFormData(prev => ({
          ...prev,
          fullName: profile.full_name || prev.fullName,
          email: profile.email || prev.email,
          phone: profile.phone || prev.phone
        }));
      }

      // 2. Fetch Default Address
      const targetUserId = profile?.id || userId;
      if (!targetUserId) return;

      const { data: address } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', targetUserId)
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
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const detectLocation = () => {
    setLoading(true);
    toast.loading('Activating secure tracker...', { id: 'geo-detect' });
    startTracking();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (view === 'identity') {
      if (!formData.fullName) newErrors.fullName = 'Full Name is required';
      if (!formData.phone) newErrors.phone = 'Phone Number is required';
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        toast.error('Please fill in required fields', { id: 'form-validation' });
        return;
      }
      setView('address_form');
      return;
    }

    if (!formData.fullName) newErrors.fullName = 'Full Name is required';
    if (!formData.phone) newErrors.phone = 'Phone Number is required';
    if (!formData.society) newErrors.society = 'Please select your area';
    if (!formData.houseNo) newErrors.houseNo = 'House / Flat No is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fill in required fields', { id: 'form-validation' });
      return;
    }

    setLoading(true);
    try {
      const userId = user?.id || user?.uid;
      
      // Update Firebase Auth displayName so it displays on header immediately
      try {
        if (auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: formData.fullName });
        }
      } catch (fbErr) {
        console.warn('Firebase profile update failed:', fbErr);
      }

      // 1. Update/Upsert User Table
      // Normalize phone: always store as 10-digit number, no +91 prefix
      const rawPhone = formData.phone || user?.phoneNumber || '';
      const cleanPhone = rawPhone.replace(/[\s\-().]/g, '').replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '');

      const { data: updatedUser, error: userError } = await supabase
        .from('users')
        .upsert([{ 
          id: userId?.length === 36 ? userId : undefined,
          uid: user?.uid || userId, // Ensure UID is stored for Auth lookup
          phone: cleanPhone,
          full_name: formData.fullName,
          email: formData.email,
          role: 'BUYER' // Explicitly set role
        }], { onConflict: 'uid' }) // Sync by UID
        .select()
        .single();

      // Attempt Sync through Backend
      const apiBase = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
      const response = await fetch(`${apiBase}/api/users`, {
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
      const { data: existingAddress } = await supabase
        .from('addresses')
        .select('id')
        .eq('user_id', updatedUser?.id || userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const addrPayload = {
        user_id: updatedUser?.id || userId,
        address_line_1: `${formData.houseName ? formData.houseName + ', ' : ''}${formData.houseNo}, ${formData.floor ? 'Floor ' + formData.floor + ', ' : ''}${formData.society}`,
        address_line_2: formData.landmark,
        city: formData.city,
        pincode: formData.pincode,
        lat: formData.lat,
        lng: formData.lng,
        is_default: true
      };

      let savedAddr, addressError;
      if (existingAddress?.id) {
        const { data, error } = await supabase.from('addresses').update(addrPayload).eq('id', existingAddress.id).select().single();
        savedAddr = data; addressError = error;
      } else {
        const { data, error } = await supabase.from('addresses').insert([addrPayload]).select().single();
        savedAddr = data; addressError = error;
      }

      // Manually augment savedAddr with the society, house_no, and floor fields for UI state sync
      if (savedAddr) {
        savedAddr.house_no = formData.houseNo;
        savedAddr.floor = formData.floor;
        savedAddr.society = formData.society;
      }

      if (addressError) {
        console.warn('Supabase address save error (continuing):', addressError.message);
      }

      if (response && !response.ok) {
        console.warn('Backend sync failed, but Supabase updated.');
      }

      toast.success('Profile & Address saved! ✨');
      
      // 🛡️ Immediate State Sync for UI components (Navbar/Profile)
      const freshProfile = {
        fullName: formData.fullName,
        house_no: formData.houseNo,
        floor: formData.floor,
        society: formData.society,
        address: `${formData.houseNo}, ${formData.society}`
      };
      localStorage.setItem('local_user_profile', JSON.stringify(freshProfile));
      localStorage.setItem('passwala_profile_complete', 'true');
      localStorage.setItem('passwala_user_address', JSON.stringify(savedAddr || freshProfile));

      if (onComplete) onComplete(savedAddr || freshProfile, formData.fullName);
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
        className="details-container shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="right-form-pane">
          <div className="details-header">
            <h1>Complete Profile</h1>
            <p>Welcome to the Hub! Let's set up your identity.</p>
          </div>

          <form onSubmit={handleSubmit} className="details-form">
          {view === 'identity' && (
            <section className="form-section">
              <span className="section-label">Basic Info</span>
              
              <div className={`input-group-v2 ${errors.fullName ? 'has-error' : ''}`}>
                <div className="input-with-icon">
                  <div className="icon-box"><User size={20} /></div>
                  <input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Full Name" />
                </div>
                {errors.fullName && <span className="error-text">{errors.fullName}</span>}
              </div>

              <div className={`input-group-v2 ${errors.phone ? 'has-error' : ''}`}>
                <div className="input-with-icon">
                  <div className="icon-box"><Phone size={20} /></div>
                  <input 
                    name="phone" 
                    value={formData.phone} 
                    onChange={handleChange} 
                    placeholder="Phone Number"
                    readOnly={!!user?.phoneNumber && user?.phoneNumber !== ''}
                    className={!!user?.phoneNumber && user?.phoneNumber !== '' ? "readonly-input" : ""}
                  />
                </div>
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>

              <div className="input-group-v2">
                <div className={`input-with-icon ${user?.email ? 'disabled' : ''}`}>
                  <div className="icon-box"><ShieldCheck size={20} /></div>
                  <input 
                    name="email" 
                    type="email"
                    value={formData.email} 
                    onChange={handleChange} 
                    placeholder="Email Address"
                    disabled={user?.email} 
                  />
                </div>
              </div>
            </section>
          )}

          {view === 'address_selection' && (
            <section className="form-section address-selection-view">
              <span className="section-label">Where to deliver?</span>
              <div className="selection-cards-container">

                <div className="search-location-btn-dashed" onClick={() => setView('address_form')}>
                  <Search size={20} />
                  <span>Search your Location</span>
                </div>
              </div>
            </section>
          )}

          {view === 'address_form' && (
            <section className="form-section">
              <span className="section-label">Delivery Address</span>
              <div className="location-action-row">
                <button 
                  type="button" 
                  className={`detect-btn-v2 ${formData.lat ? 'success' : ''} ${loading ? 'loading' : ''}`}
                  onClick={detectLocation}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="btn-spinner" />
                  ) : formData.lat ? (
                    <ShieldCheck size={14} />
                  ) : (
                    <Navigation size={14} style={{ transform: 'rotate(45deg)' }} />
                  )}
                  {loading ? 'Detecting...' : formData.lat ? 'Location Captured' : 'Detect My Location'}
                </button>
              </div>
              
              <div className="input-group-v2">
                <div className="input-with-icon">
                  <div className="icon-box"><Home size={20} /></div>
                  <input name="houseName" value={formData.houseName} onChange={handleChange} placeholder="House / Bungalow Name" />
                </div>
              </div>

              <div className="input-grid-v2">
                <div className={`input-group-v2 ${errors.houseNo ? 'has-error' : ''}`}>
                  <div className="input-with-icon">
                    <div className="icon-box"><Home size={20} /></div>
                    <input name="houseNo" value={formData.houseNo} onChange={handleChange} placeholder="House / Flat No *" />
                  </div>
                  {errors.houseNo && <span className="error-text">{errors.houseNo}</span>}
                </div>
                <div className="input-group-v2">
                  <div className="input-with-icon">
                    <div className="icon-box"><Building2 size={20} /></div>
                    <input name="floor" value={formData.floor} onChange={handleChange} placeholder="Floor" />
                  </div>
                </div>
              </div>

              <div className={`input-group-v2 ${errors.society ? 'has-error' : ''}`}>
                <div className="input-with-icon">
                  <div className="icon-box"><Building2 size={20} /></div>
                  <select name="society" value={formData.society} onChange={handleChange} className="area-select-v2">
                    <option value="">-- Select Neighborhood --</option>
                    {activeAreas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                    {!activeAreas.includes("Satellite") && <option key="Satellite" value="Satellite">Satellite</option>}
                    {!activeAreas.includes("Paldi") && <option key="Paldi" value="Paldi">Paldi</option>}
                    {!activeAreas.includes("Bopal") && <option key="Bopal" value="Bopal">Bopal</option>}
                    {!activeAreas.includes("Sindhu Bhavan") && <option key="Sindhu Bhavan" value="Sindhu Bhavan">Sindhu Bhavan</option>}
                  </select>
                </div>
                {errors.society ? <span className="error-text">{errors.society}</span> : <p className="field-tip-v2">Choose from our verified service regions</p>}
              </div>

              <div className="input-group-v2">
                <div className="input-with-icon">
                  <div className="icon-box"><MapPin size={20} /></div>
                  <input name="landmark" value={formData.landmark} onChange={handleChange} placeholder="Landmark (Optional)" />
                </div>
              </div>

              <div className="input-row">
                <div className="input-group-v2">
                  <div className="input-with-icon">
                    <div className="icon-box"><MapPin size={20} /></div>
                    <input name="city" value={formData.city} onChange={handleChange} placeholder="City Name" />
                  </div>
                </div>
                <div className="input-group-v2">
                  <div className="input-with-icon">
                    <div className="icon-box"><Building2 size={20} /></div>
                    <input name="pincode" value={formData.pincode} onChange={handleChange} placeholder="6-digit Pincode" />
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="details-footer">
            <div className="privacy-msg">
              <AlertCircle size={14} />
              <span>Only used for delivery verification.</span>
            </div>
            <div className="footer-actions">
              {view !== 'identity' && (
                <button type="button" className="back-btn-v5" onClick={() => setView('identity')}>
                  Back
                </button>
              )}
              <button type="submit" className="save-btn-v5" disabled={loading}>
                {loading ? (
                  <div className="details-spinner" />
                ) : (
                  view === 'identity' ? "Next" : "Start Exploring"
                )}
              </button>
            </div>
          </div>
        </form>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerDetails;
