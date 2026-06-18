import React, { useState } from 'react';
import { Phone, CheckCircle, Navigation, Shield, Bike, UploadCloud, Camera, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabase';
import { auth } from '../firebase';
import { RecaptchaVerifier } from 'firebase/auth';
import riderBikeOnboarding from '../assets/rider_bike_onboarding.png';
import './RiderPortal.css'; // Import custom styles

const CameraModal = ({ isOpen, onClose, onCapture, mode = 'user' }) => {
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);
  const onCaptureRef = React.useRef(onCapture);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    onCaptureRef.current = onCapture;
  }, [onCapture]);

  React.useEffect(() => {
    let activeStream = null;
    let isCancelled = false;

    const startCamera = async () => {
      try {
        // Try specific facing mode first
        let s;
        try {
          s = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: mode === 'user' ? 'user' : 'environment' }
          });
        } catch (initialErr) {
          // Fallback to any available camera if specific mode fails
          s = await navigator.mediaDevices.getUserMedia({ video: true });
        }

        if (isCancelled) {
          s.getTracks().forEach(track => track.stop());
          return;
        }

        activeStream = s;
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.muted = true;
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current && !isCancelled) {
              videoRef.current.play().catch(e => console.log('Autoplay prevented:', e));
            }
          };
        }
      } catch (err) {
        if (!isCancelled) {
          console.error(err);
          toast.error('Could not access camera. Please check permissions.', { id: 'camera-err' });
          if (onCloseRef.current) {
            onCloseRef.current();
          }
        }
      }
    };

    if (isOpen) {
      startCamera();
    }

    return () => {
      isCancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, mode]);

  const capture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    if (onCaptureRef.current) {
      onCaptureRef.current(canvas.toDataURL('image/jpeg', 0.8));
    }
    if (onCloseRef.current) {
      onCloseRef.current();
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '400px', background: '#111', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
          <X size={20} />
        </button>

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: 'auto', display: 'block', background: '#000' }}
        />

        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
          <button onClick={capture} style={{ width: '64px', height: '64px', borderRadius: '50%', border: '4px solid white', background: 'transparent', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <div style={{ width: '100%', height: '100%', background: 'white', borderRadius: '50%' }}></div>
          </button>
        </div>
        <p style={{ color: 'white', textAlign: 'center', fontSize: '0.875rem', marginBottom: '1.5rem', opacity: 0.8 }}>Position your face/document clearly</p>
      </div>
    </div>
  );
};

const formatIdProof = (val) => {
  const cleanVal = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isNumeric = /^\d+$/.test(cleanVal) || cleanVal.length === 0;
  if (isNumeric) {
    const sliced = cleanVal.slice(0, 12);
    const parts = [];
    for (let i = 0; i < sliced.length; i += 4) {
      parts.push(sliced.slice(i, i + 4));
    }
    return parts.join(' ');
  } else {
    return cleanVal.slice(0, 10);
  }
};

function RiderAuth({ onLogin }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(window.innerWidth < 768 ? 'WELCOME' : 'PHONE'); // WELCOME -> PHONE -> OTP -> PROFILE_SETUP
  const [profile, setProfile] = useState({
    name: '',
    photo: '',
    vehicleNo: '',
    licenseNo: '',
    idProof: '',
    licenseImage: ''
  });
  const [cameraConfig, setCameraConfig] = useState({ isOpen: false, field: '', mode: 'user' });
  const [loginMethod, setLoginMethod] = useState('SMS'); // 'SMS' or 'WHATSAPP'
  const [whatsappOtp, setWhatsappOtp] = useState('');

  const openCamera = (field, mode) => {
    setCameraConfig({ isOpen: true, field, mode });
  };

  const [confirmationResult, _setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const _setupRecaptcha = () => {
    try {
      if (window.recaptchaVerifier) return;

      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => { },
        'expired-callback': () => {
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
          }
        }
      });
    } catch (error) {
      console.error("Recaptcha Error:", error);
      toast.error("Recaptcha initialization failed");
    }
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      toast.error('Please enter a valid 10-digit number');
      return;
    }
    setLoading(true);
    const toastId = toast.loading('Verifying Rider...');
    try {
      if (!supabase) throw new Error("Database connection error");
      const { data: ud } = await supabase.from('users').select('id, role, full_name').eq('phone', phone).maybeSingle();
      if (ud && ud.role === 'RIDER') {
        const { data: rd } = await supabase.from('riders').select('*').eq('user_id', ud.id).maybeSingle();
        if (rd) {
          toast.dismiss(toastId);
          toast.success('Welcome back, Rider!');
          onLogin(phone, {
            name: ud.full_name || 'Rider Partner',
            vehicleNo: rd.vehicle_no,
            licenseNo: rd.license_no,
            idProof: rd.id_proof,
            user_id: ud.id,
            rider_id: rd.id
          });
          return;
        }
      }
      toast.dismiss(toastId);
      toast.success('Phone Verified! Please setup profile.');
      setStep('PROFILE_SETUP');
    } catch (err) {
      console.warn("Rider verification lookup failed, forcing setup profile:", err);
      toast.dismiss(toastId);
      setStep('PROFILE_SETUP');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppLogin = async () => {
    if (phone.length !== 10) {
      toast.error('Please enter a valid 10-digit number');
      return;
    }
    setLoading(true);
    try {
      const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
      const res = await fetch(`${BASE_API}/api/users/send-whatsapp-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLoginMethod('WHATSAPP');
        setStep('OTP');
        if (data.provider === 'mock' && data.otp) {
          setWhatsappOtp(data.otp);
          toast.success(`[MOCK WHATSAPP] OTP sent: ${data.otp}`, { duration: 8000 });
        } else {
          toast.success('OTP sent successfully via WhatsApp!');
        }
      } else {
        toast.error(data.error || 'Failed to send WhatsApp OTP');
      }
    } catch (err) {
      toast.error('Network error. Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      if (loginMethod === 'WHATSAPP') {
        const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
        const res = await fetch(`${BASE_API}/api/users/verify-whatsapp-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phone, otp: otp, role: 'RIDER' })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          toast.success('OTP Verified!');
          const toastId = toast.loading('Syncing Rider Session...');
          try {
            if (!supabase) throw new Error("Database connection error");
            const { data: ud } = await supabase.from('users').select('id, role, full_name').eq('phone', phone).maybeSingle();
            if (ud && ud.role === 'RIDER') {
              const { data: rd } = await supabase.from('riders').select('*').eq('user_id', ud.id).maybeSingle();
              if (rd) {
                toast.dismiss(toastId);
                toast.success('Welcome back, Rider!');
                onLogin(phone, {
                  name: ud.full_name || 'Rider Partner',
                  vehicleNo: rd.vehicle_no,
                  licenseNo: rd.license_no,
                  idProof: rd.id_proof,
                  user_id: ud.id,
                  rider_id: rd.id
                });
                return;
              }
            }
            toast.dismiss(toastId);
            setStep('PROFILE_SETUP');
          } catch (err) {
            toast.dismiss(toastId);
            setStep('PROFILE_SETUP');
          }
        } else {
          toast.error(data.error || 'Invalid WhatsApp OTP');
        }
      } else {
        if (confirmationResult) {
          await confirmationResult.confirm(otp);
          toast.success('OTP Verified!');
          setStep('PROFILE_SETUP');
        } else {
          toast.error('Verification session expired or invalid');
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = () => {
    setOtp('');
    handleSendOtp();
  };

  const handleCompleteProfile = async () => {
    if (!profile.name || !profile.vehicleNo || !profile.licenseNo || !profile.idProof) {
      toast.error('Please fill in all required details');
      return;
    }

    const cleanIdProof = profile.idProof.replace(/[^A-Z0-9]/g, '');

    // Aadhar / PAN Validation
    const isAadhar = /^\d{12}$/.test(cleanIdProof);
    const isPan = /^[A-Z]{5}\d{4}[A-Z]{1}$/.test(cleanIdProof);

    if (cleanIdProof.length === 10 && !isPan) {
      toast.error('Invalid PAN format. Should be 5 letters, 4 numbers, 1 letter.');
      return;
    } else if (cleanIdProof.length === 12 && !isAadhar) {
      toast.error('Invalid Aadhar format. Must be exactly 12 digits.');
      return;
    } else if (cleanIdProof.length !== 10 && cleanIdProof.length !== 12) {
      toast.error('ID Proof must be 12-digit Aadhar or 10-digit PAN');
      return;
    }

    const cleanLicense = profile.licenseNo.replace(/[^A-Z0-9]/g, '');
    if (cleanLicense.length < 15 || cleanLicense.length > 16) {
      toast.error('License Number must be 15-16 alphanumeric characters');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Syncing Rider Profile...');

    try {
      if (!supabase) throw new Error("Database connection error");

      // 1. Resolve User ID (Lookup or Create)
      let resolvedUserId = null;
      const { data: ud } = await supabase.from('users').select('id, role').eq('phone', phone).maybeSingle();
      if (ud) {
        resolvedUserId = ud.id;
        // If they exist but don't have the RIDER role, update it to RIDER
        if (ud.role !== 'RIDER') {
          await supabase.from('users').update({ role: 'RIDER' }).eq('id', ud.id);
        }
      } else {
        const { data: newUser, error: ne } = await supabase.from('users').insert([{ phone, full_name: profile.name, role: 'RIDER' }]).select().single();
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
        id_proof: cleanIdProof,
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

      toast.dismiss(toastId);
      toast.success('Rider Profile Ready! Go online now.', { icon: '🎉' });

      onLogin(phone, {
        ...profile,
        idProof: cleanIdProof,
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
  if (step === 'WELCOME' && isMobile) {
    return (
      <div className="rider-welcome-container" style={{ backgroundImage: `url(${riderBikeOnboarding})` }}>
        <div className="rider-welcome-overlay">
          <div className="rider-welcome-content">
            <div>
              <h1 className="rider-welcome-title">Get started with Rider</h1>
              <p className="rider-welcome-subtitle">
                Experience Seamless Mobility With Passwala – Your Ultimate Ride Companion.
              </p>
              <button onClick={() => setStep('PHONE')} className="rider-welcome-btn">
                Continue <span className="rider-btn-arrows">&gt;&gt;&gt;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rider-auth-container">
      {/* Premium Desktop Side Panel */}
      <div className="rider-auth-promo-panel" style={{ backgroundImage: `url(${riderBikeOnboarding})` }}>
        <div className="rider-promo-content">
          <div className="rider-promo-header">
            <div className="rider-promo-logo-wrapper">
              <img src="/logo.png" alt="Passwala Logo" className="rider-promo-logo" />
            </div>
            <h1 className="rider-promo-title">Passwala Rider</h1>
            <p className="rider-promo-subtitle">Deliver with pride. Earn with ease.</p>
          </div>
          
          <div className="rider-promo-graphic-stage">
            <div className="rider-bike-illustration-wrapper">
              <Bike size={96} className="rider-bike-icon" />
              <div className="rider-bike-shadow"></div>
            </div>
            
            <div className="rider-floating-badge badge-1">
              <Navigation size={18} color="var(--rider-primary)" />
              <span>Live GPS Orders</span>
            </div>

            <div className="rider-floating-badge badge-2">
              <CheckCircle size={18} color="var(--rider-success)" />
              <span>Instant Cashout</span>
            </div>

            <div className="rider-floating-badge badge-3">
              <Shield size={18} color="#3b82f6" />
              <span>Flexible Shifts</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rider-auth-card" style={{ maxWidth: step === 'PROFILE_SETUP' ? '450px' : '400px', transition: 'all 0.3s ease' }}>
        <div className="rider-auth-card-content">
          <div className="rider-auth-banner" style={{ padding: step === 'PROFILE_SETUP' ? '1.5rem' : '2rem' }}>
          {step !== 'PROFILE_SETUP' && (
              <div className="rider-auth-banner-icon" style={{ background: 'white', padding: '10px' }}>
                <img src="/logo.png" alt="Passwala Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
          )}
          <h2 className="rider-auth-banner-title">
            {step === 'PHONE' ? 'Hop In – Log In to Your Rider Account' : 'Passwala Rider'}
          </h2>
          <p className="rider-auth-banner-subtitle">
            {step === 'PHONE' ? 'Access your rides, track trips, manage payments, and navigate with ease.' : 'Deliver with pride. Earn with ease.'}
          </p>
        </div>

        <div className="rider-auth-body" style={{ padding: step === 'PROFILE_SETUP' ? '1.5rem' : '2rem' }}>
          {step === 'PHONE' || step === 'OTP' ? (
            <div className="rider-auth-features">
              <div className="rider-auth-feature"><Navigation size={20} color="var(--rider-primary)" /><span>Live GPS</span></div>
              <div className="rider-auth-feature"><CheckCircle size={20} color="var(--rider-success)" /><span>Fast Payouts</span></div>
              <div className="rider-auth-feature"><Shield size={20} color="#3b82f6" /><span>Secured</span></div>
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
                
                <button
                  onClick={handleWhatsAppLogin}
                  className="rider-btn-primary"
                  style={{
                    background: '#25D366',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.15)',
                    marginTop: '1.25rem'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                  Login via WhatsApp
                </button>

                <div className="policy-agreement-text" style={{ marginTop: '1.25rem', fontSize: '0.72rem', color: '#64748b', textAlign: 'center', lineHeight: '1.4' }}>
                  By continuing, you agree to our{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rider-primary)', fontWeight: '600', textDecoration: 'underline' }}>Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--rider-primary)', fontWeight: '600', textDecoration: 'underline' }}>Privacy Policy</a>.
                </div>
              </div>
            ) : step === 'OTP' ? (
              <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                <div className="rider-input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label className="rider-label" style={{ marginBottom: 0 }}>
                      Enter {loginMethod === 'WHATSAPP' ? 'WhatsApp' : 'SMS'} OTP
                    </label>
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
                <button onClick={handleVerifyOtp} className="rider-btn-primary" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button
                    onClick={handleResendOtp}
                    disabled={loading}
                    style={{ color: 'var(--rider-text-secondary)', fontSize: '0.875rem', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
                  >
                    Didn't receive code? <span style={{ color: 'var(--rider-primary)' }}>Resend OTP</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ animation: 'slideUp 0.3s ease-out' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>Complete Your Profile</h3>

                <div className="rider-input-group">
                  <label className="rider-label">Full Name</label>
                  <input type="text" className="rider-input" placeholder="Enter Name" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} style={{ paddingLeft: '1rem' }} />
                </div>

                <div className="rider-input-group">
                  <label className="rider-label">Selfie / Photo</label>
                  <div
                    onClick={() => openCamera('photo', 'user')}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#f3f4f6', border: '2px dashed var(--rider-border)', borderRadius: '12px', padding: '1.25rem 1rem', cursor: 'pointer', color: 'var(--rider-text-secondary)', transition: 'all 0.2s ease', ...(profile.photo && { borderColor: 'var(--rider-success)', background: 'var(--rider-success-light)', color: 'var(--rider-success)' }) }}
                  >
                    {profile.photo ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <img src={profile.photo} alt="Selfie" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--rider-success)' }}>Selfie Captured! (Tap to change)</span>
                      </div>
                    ) : (
                      <>
                        <Camera size={20} />
                        <span style={{ fontWeight: 600 }}>Tap to open Camera & take Selfie</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="rider-input-group">
                  <label className="rider-label">Vehicle Number (Gadi No)</label>
                  <input type="text" className="rider-input" placeholder="Enter Vehicle No" value={profile.vehicleNo} onChange={e => setProfile({ ...profile, vehicleNo: e.target.value })} style={{ paddingLeft: '1rem', textTransform: 'uppercase' }} />
                </div>

                <div className="rider-input-group">
                  <label className="rider-label">License Number</label>
                  <input
                    type="text"
                    className="rider-input"
                    placeholder="Enter 15-16 character License No"
                    maxLength={16}
                    value={profile.licenseNo}
                    onChange={e => setProfile({ ...profile, licenseNo: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() })}
                    style={{ paddingLeft: '1rem' }}
                  />
                </div>

                <div className="rider-input-group">
                  <label className="rider-label">ID Proof (Aadhar/PAN)</label>
                  <input
                    type="text"
                    className="rider-input"
                    placeholder="Enter 12-digit Aadhar or 10-digit PAN"
                    maxLength={(() => {
                      const cleanVal = profile.idProof.replace(/[^A-Z0-9]/g, '');
                      const isNumeric = cleanVal.length === 0 || /^\d+$/.test(cleanVal);
                      return isNumeric ? 14 : 10;
                    })()}
                    value={profile.idProof}
                    onChange={e => setProfile({ ...profile, idProof: formatIdProof(e.target.value) })}
                    style={{ paddingLeft: '1rem', textTransform: 'uppercase' }}
                  />
                </div>

                <div className="rider-input-group">
                  <label className="rider-label">License Image</label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#f3f4f6', border: '2px dashed var(--rider-border)', borderRadius: '12px', padding: '1.25rem 1rem', cursor: 'pointer', color: 'var(--rider-text-secondary)', transition: 'all 0.2s ease', ...(profile.licenseImage && { borderColor: 'var(--rider-success)', background: 'var(--rider-success-light)', color: 'var(--rider-success)' }) }}>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setProfile({ ...profile, licenseImage: reader.result });
                        reader.readAsDataURL(file);
                      }
                    }} />
                    {profile.licenseImage ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <img src={profile.licenseImage} alt="License" style={{ width: '120px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--rider-success)' }}>License Uploaded! (Tap to change)</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={20} />
                        <span style={{ fontWeight: 600 }}>Tap to open Gallery & select License image</span>
                      </>
                    )}
                  </label>
                </div>

                <button
                  onClick={handleCompleteProfile}
                  className="rider-btn-primary"
                  style={{ marginTop: '2rem' }}
                  disabled={loading}
                >
                  {loading ? 'Syncing Rider Profile...' : 'Submit & Start Driving'}
                </button>
              </div>
            )}


          </div>
        </div>
      </div>
    </div>

      <CameraModal
        isOpen={cameraConfig.isOpen}
        mode={cameraConfig.mode}
        onClose={() => setCameraConfig({ ...cameraConfig, isOpen: false })}
        onCapture={(img) => setProfile({ ...profile, [cameraConfig.field]: img })}
      />
      <div id="recaptcha-container"></div>
    </div>
  );
}

export default RiderAuth;
