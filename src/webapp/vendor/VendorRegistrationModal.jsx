import React, { useState } from 'react';
import { X, Building2, Phone, MapPin, Briefcase, CheckCircle, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabase';
import './VendorRegistrationModal.css';

const VendorRegistrationModal = ({ plan, onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: '',
    category: '',
    phone: '',
    address: '',
    experience: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Allow only digits
    if (value.length <= 10) {
      setFormData({ ...formData, phone: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('vendor_applications')
        .insert([{
          business_name: formData.businessName,
          category: formData.category,
          phone: formData.phone,
          address: formData.address,
          plan: plan
        }]);

      if (error) throw error;

      setStep(2);
      toast.success('Registration request submitted successfully!');
    } catch (error) {
      console.error('Error saving application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in">
      <div className="vendor-reg-modal glass shadow-2xl animate-slide-up">
        {step === 1 ? (
          <>
            <div className="modal-header">
              <div className="header-badge">
                <Briefcase size={14} /> <span>Vendor Onboarding</span>
              </div>
              <h3>Join as a {plan} Partner</h3>
              <p>Start growing your neighborhood business today.</p>
              <button className="close-btn" onClick={onClose}><X size={20} /></button>
            </div>

            <form className="registration-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="input-group-modal">
                  <label><Building2 size={16} /> Business/Shop Name</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. Ahmedabad Plumbing Pros"
                    value={formData.businessName}
                    onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                  />
                </div>

                <div className="input-group-modal">
                  <label><Briefcase size={16} /> Service Category</label>
                  <select 
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="cleaning">Home Cleaning</option>
                    <option value="delivery">Daily Essentials</option>
                    <option value="salon">Salon & Spa</option>
                  </select>
                </div>

                <div className="input-group-modal">
                  <label><Phone size={16} /> Contact Number</label>
                  <div className="phone-input-wrapper">
                    <span className="country-code-modal">+91</span>
                    <input 
                      required 
                      type="tel" 
                      placeholder="10 digit mobile number"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                    />
                  </div>
                </div>

                <div className="input-group-modal">
                  <label><MapPin size={16} /> Business Location</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Area, Near Landmark"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
              </div>

              <div className="plan-summary">
                <div className="summary-item">
                  <span>Selected Plan:</span>
                  <strong>{plan}</strong>
                </div>
                <div className="summary-item">
                  <span>Commitment:</span>
                  <strong>Pay as you earn (10-20% comm.)</strong>
                </div>
              </div>

              <button type="submit" className="submit-reg-btn" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Complete Registration'} <ArrowRight size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="success-screen">
            <div className="success-icon animate-bounce">
              <CheckCircle size={60} color="var(--primary)" />
            </div>
            <h2>We've got you!</h2>
            <p>Your application for the <strong>{plan}</strong> plan is being processed by our neighborhood team.</p>
            <div className="next-steps">
               <strong>What's next?</strong>
               <ul>
                 <li>1. Our agent will visit your location in 24-48 hours.</li>
                 <li>2. Profile verification & background check.</li>
                 <li>3. Start receiving Ahmedabad bookings!</li>
               </ul>
            </div>
            <button className="done-btn" onClick={onClose}>Understood</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorRegistrationModal;
