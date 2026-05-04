/* eslint-disable */
import React, { useState } from 'react';
import { Phone, CheckCircle, Navigation, Shield, Bike, UploadCloud, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabase';
import './RiderPortal.css'; // Import custom styles

function RiderAuth({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('PHONE'); // PHONE -> OTP -> PROFILE_SETUP
  const [profile, setProfile] = useState({
    name: '',
    photo: '',
    vehicleNo: '',
    licenseNo: '',
    idProof: '',
    licenseImage: ''
  });

  const handleSendOtp = () => {
    if (phone.length < 10) {
      toast.error('Please enter a valid 10-digit number');
      return;
    }
    toast.success('OTP Sent! Use 123456');
    setStep('OTP');
  };

  const handleVerifyOtp = () => {
    if (otp === '123456') {
      toast.success('OTP Verified!');
      setStep('PROFILE_SETUP');
    } else {
      toast.error('Invalid OTP. Use 123456');
    }
  };

  const [loading, setLoading] = useState(false);

  const handleCompleteProfile = async () => {
    if (!profile.name || !profile.vehicleNo || !profile.licenseNo || !profile.idProof) {
      toast.error('Please fill in all required details');
      return;
    }

    // Aadhar / PAN Validation
    const isAadhar = /^\d{12}$/.test(profile.idProof);
    const isPan = /^[A-Z]{5}\d{4}[A-Z]{1}$/.test(profile.idProof);
    
    if (profile.idProof.length === 10 && !isPan) {
      toast.error('Invalid PAN format. Should be 5 letters, 4 numbers, 1 letter.');
      return;
    } else if (profile.idProof.length === 12 && !isAadhar) {
      toast.error('Invalid Aadhar format. Must be exactly 12 digits.');
      return;
    } else if (profile.idProof.length !== 10 && profile.idProof.length !== 12) {
      toast.error('ID Proof must be 12-digit Aadhar or 10-digit PAN');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Syncing Rider Profile...');

    try {
      if (!supabase) throw new Error("Database connection error");

      // 1. Resolve User ID (Lookup or Create)
      let resolvedUserId = null;
      const { data: ud } = await supabase.from('users').select('id').eq('phone', phone).maybeSingle();
      if (ud) {
          resolvedUserId = ud.id;
      } else {
          const { data: newUser, error: ne } = await supabase.from('users').insert([{ phone, full_name: profile.name }]).select().single();
          if (ne) throw ne;
          resolvedUserId = newUser.id;
      }

      // 2. Create Linked Rider Profile
      // Check if rider already exists for this user_id
      const { data: existingRider } = await supabase.from('riders').select('*').eq('user_id', resolvedUserId).maybeSingle();
      
      const riderPayload = {
          user_id: resolvedUserId,
          vehicle_no: profile.vehicleNo,
          license_no: profile.licenseNo,
          id_proof: profile.idProof,
          is_active: false,
          is_verified: false
      };

      let finalRiderId = null;
      if (existingRider) {
          const { data: updatedRider, error: ue } = await supabase.from('riders').update(riderPayload).eq('user_id', resolvedUserId).select().single();
          if (ue) throw ue;
          finalRiderId = updatedRider.id;
      } else {
          const { data: newRider, error: re } = await supabase.from('riders').insert([riderPayload]).select().single();
          if (re) throw re;
          finalRiderId = newRider.id;
      }

      toast.success('Rider Profile Ready! Go online now.', { id: toastId, icon: '🎉' });
      
      onLogin(false, phone, {
         ...profile,
         user_id: resolvedUserId,
         rider_id: finalRiderId
      });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Database Synchronization Error', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rider-auth-container">
      <div className="rider-auth-card" style={{ maxWidth: step === 'PROFILE_SETUP' ? '450px' : '400px', transition: 'all 0.3s ease' }}>
        <div className="rider-auth-banner" style={{ padding: step === 'PROFILE_SETUP' ? '1.5rem' : '2rem' }}>
          {step !== 'PROFILE_SETUP' && (
              <div className="rider-auth-banner-icon" style={{ background: 'white', padding: '10px' }}>
                <img src="/logo.png" alt="Passwala Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
          )}
          <h2 className="rider-auth-banner-title">Passwala Rider</h2>
          <p className="rider-auth-banner-subtitle">Deliver with pride. Earn with ease.</p>
        </div>

        <div className="rider-auth-body" style={{ padding: step === 'PROFILE_SETUP' ? '1.5rem' : '2rem' }}>
          {step === 'PHONE' || step === 'OTP' ? (
             <div className="rider-auth-features">
                <div className="rider-auth-feature"><Navigation size={20} color="var(--rider-primary)"/><span>Live GPS</span></div>
                <div className="rider-auth-feature"><CheckCircle size={20} color="var(--rider-success)"/><span>Fast Payouts</span></div>
                <div className="rider-auth-feature"><Shield size={20} color="#3b82f6"/><span>Secured</span></div>
             </div>
          ) : null}

          <div>
            {step === 'PHONE' ? (
              <div>
                <div className="rider-input-group">
                  <label className="rider-label">Mobile Number</label>
                  <div className="rider-input-wrapper">
                    <div className="rider-input-icon">
                      <Phone size={20} />
                    </div>
                    <input
                      type="tel"
                      className="rider-input"
                      placeholder="Enter 10 digit number"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>
                <button onClick={handleSendOtp} className="rider-btn-primary">
                  Get Login OTP
                </button>
              </div>
            ) : step === 'OTP' ? (
              <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                <div className="rider-input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label className="rider-label" style={{ marginBottom: 0 }}>Enter OTP</label>
                    <button onClick={() => setStep('PHONE')} style={{ color: 'var(--rider-primary)', fontSize: '0.875rem', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}>Change Number</button>
                  </div>
                  <input
                    type="text"
                    className="rider-input-otp"
                    placeholder="------"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <button onClick={handleVerifyOtp} className="rider-btn-primary">
                  Verify OTP
                </button>
              </div>
            ) : (
               <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>Complete Your Profile</h3>
                  
                  <div className="rider-input-group">
                    <label className="rider-label">Full Name</label>
                    <input type="text" className="rider-input" placeholder="Enter Name" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} style={{ paddingLeft: '1rem' }} />
                  </div>

                  <div className="rider-input-group">
                    <label className="rider-label">Selfie / Photo</label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#f3f4f6', border: '2px dashed var(--rider-border)', borderRadius: '12px', padding: '1.25rem 1rem', cursor: 'pointer', color: 'var(--rider-text-secondary)', transition: 'all 0.2s ease', ...(profile.photo && { borderColor: 'var(--rider-success)', background: 'var(--rider-success-light)', color: 'var(--rider-success)' }) }}>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                               const reader = new FileReader();
                               reader.onloadend = () => setProfile({...profile, photo: reader.result});
                               reader.readAsDataURL(file);
                            }
                        }} />
                        {profile.photo ? (
                            <>
                               <CheckCircle size={20} />
                               <span style={{ fontWeight: 600 }}>Selfie Uploaded!</span>
                            </>
                        ) : (
                            <>
                               <Camera size={20} />
                               <span style={{ fontWeight: 600 }}>Tap to upload Selfie</span>
                            </>
                        )}
                    </label>
                  </div>

                  <div className="rider-input-group">
                    <label className="rider-label">Vehicle Number (Gadi No)</label>
                    <input type="text" className="rider-input" placeholder="Enter Vehicle No" value={profile.vehicleNo} onChange={e => setProfile({...profile, vehicleNo: e.target.value})} style={{ paddingLeft: '1rem', textTransform: 'uppercase' }} />
                  </div>
                  
                  <div className="rider-input-group">
                    <label className="rider-label">License Number</label>
                    <input type="text" className="rider-input" placeholder="Enter License No" value={profile.licenseNo} onChange={e => setProfile({...profile, licenseNo: e.target.value})} style={{ paddingLeft: '1rem', textTransform: 'uppercase' }} />
                  </div>

                  <div className="rider-input-group">
                    <label className="rider-label">ID Proof (Aadhar/PAN)</label>
                    <input type="text" className="rider-input" placeholder="Enter 12-digit Aadhar or 10-digit PAN" maxLength={12} value={profile.idProof} onChange={e => setProfile({...profile, idProof: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')})} style={{ paddingLeft: '1rem', textTransform: 'uppercase' }} />
                  </div>
                  
                  <div className="rider-input-group">
                    <label className="rider-label">License Image</label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#f3f4f6', border: '2px dashed var(--rider-border)', borderRadius: '12px', padding: '1.25rem 1rem', cursor: 'pointer', color: 'var(--rider-text-secondary)', transition: 'all 0.2s ease', ...(profile.licenseImage && { borderColor: 'var(--rider-success)', background: 'var(--rider-success-light)', color: 'var(--rider-success)' }) }}>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                               const reader = new FileReader();
                               reader.onloadend = () => setProfile({...profile, licenseImage: reader.result});
                               reader.readAsDataURL(file);
                            }
                        }} />
                        {profile.licenseImage ? (
                            <>
                               <CheckCircle size={20} />
                               <span style={{ fontWeight: 600 }}>License Uploaded!</span>
                            </>
                        ) : (
                            <>
                               <UploadCloud size={20} />
                               <span style={{ fontWeight: 600 }}>Tap to upload License image</span>
                            </>
                        )}
                    </label>
                  </div>

                  <button onClick={handleCompleteProfile} className="rider-btn-primary" style={{ marginTop: '2rem' }}>
                    Submit & Start Driving
                  </button>
               </div>
            )}
            
            {step !== 'PROFILE_SETUP' && (
              <>
                <div className="rider-divider">
                   <span className="rider-divider-text">Quick Login for Devs</span>
                </div>
                <button 
                    onClick={() => onLogin(true, '8888888888', { name: 'Demo Rider', vehicle: 'Bike' })}
                    className="rider-btn-secondary"
                >
                  Login as Demo Rider
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiderAuth;
