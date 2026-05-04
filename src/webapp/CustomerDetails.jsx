import React, { useState, useEffect } from 'react';
import { User, MapPin, Mail, Home, Building2, Save, Sparkles, AlertCircle } from 'lucide-react';
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
    houseNo: '',
    floor: '',
    society: '',
    landmark: '',
    city: 'Ahmedabad',
    pincode: ''
  });

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
        // Parse address_line_1 (assuming "House, Society" format)
        const parts = address.address_line_1.split(', ');
        setFormData(prev => ({
          ...prev,
          houseNo: parts[0] || '',
          society: parts[1] || '',
          landmark: address.address_line_2 || '',
          city: address.city || 'Ahmedabad',
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
      const response = await fetch('http://localhost:3004/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          email: formData.email,
          displayName: formData.fullName,
          authProvider: 'google', // Typically for CustomerDetails it's Google
          address: {
            address_line_1: `${formData.houseNo}, ${formData.floor ? 'Floor ' + formData.floor + ', ' : ''}${formData.society}`,
            address_line_2: formData.landmark,
            city: formData.city,
            pincode: formData.pincode
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Backend sync failed');
      }

      toast.success('Profile & Address saved! ✨');
      if (onComplete) onComplete();
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
                    placeholder="E.g. Ramesh Bhai Patel"
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
            <h3 className="section-title"><MapPin size={18} /> Delivery Address</h3>
            <div className="input-grid-v2">
              <div className="input-group-v2">
                <label>House / Flat No *</label>
                <div className="input-with-icon">
                  <Home size={18} />
                  <input 
                    name="houseNo" 
                    value={formData.houseNo} 
                    onChange={handleChange} 
                    placeholder="Flat No (e.g. B-402)"
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
                    placeholder="Floor No (e.g. 4th)"
                  />
                </div>
              </div>
            </div>

            <div className="input-group-v2">
              <label>Society / Apartment Name *</label>
              <div className="input-with-icon">
                <Building2 size={18} />
                <input 
                  name="society" 
                  value={formData.society} 
                  onChange={handleChange} 
                  placeholder="Society / Apartment / Area Name"
                  required
                />
              </div>
            </div>

            <div className="input-group-v2">
              <label>Landmark (Optional)</label>
              <div className="input-with-icon">
                <MapPin size={18} />
                <input 
                  name="landmark" 
                  value={formData.landmark} 
                  onChange={handleChange} 
                  placeholder="Near Hanuman Temple"
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
                    placeholder="Ahmedabad"
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
                    placeholder="Pincode (e.g. 380015)"
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
