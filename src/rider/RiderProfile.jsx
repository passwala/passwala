import React, { useState } from 'react';
import { supabase } from '../supabase.js';
import { toast } from 'react-hot-toast';
import { Bike, FileText, Star, LogOut, Info, CheckCircle, XCircle, Bell, Headset, ChevronRight, ArrowLeft, CheckCircle2, ShieldCheck, Image as ImageIcon, Trash2 } from 'lucide-react';
import './RiderPortal.css'; // Import custom styles

function DocumentsSubpage({ user, onBack }) {
  return (
    <div className="rider-screen" style={{ animation: 'slideUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'white', border: '1px solid var(--rider-border)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--rider-shadow)' }}>
           <ArrowLeft size={20} />
        </button>
        <h2 className="rider-title" style={{ margin: 0 }}>My Documents</h2>
      </div>

      <div style={{ background: 'var(--rider-success-light)', padding: '1rem', borderRadius: '12px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.5rem', border: '1px solid #a7f3d0' }}>
         <ShieldCheck size={24} color="var(--rider-success)" style={{ flexShrink: 0 }} />
         <div>
            <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--rider-success)', fontWeight: 700 }}>Documents Verified</h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--rider-text)' }}>Your identity and vehicle documents have been securely verified by Passwala.</p>
         </div>
      </div>

      <div className="rider-card" style={{ marginBottom: '1rem' }}>
         <h4 style={{ margin: '0 0 1rem 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="var(--rider-success)" /> Personal ID</h4>
         <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '12px' }}>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Aadhar / PAN</p>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.125rem', letterSpacing: '0.05em' }}>{user?.idProof || 'Not Provided'}</p>
         </div>
      </div>

      <div className="rider-card">
         <h4 style={{ margin: '0 0 1rem 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="var(--rider-success)" /> Driving License</h4>
         <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>License Number</p>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.125rem', letterSpacing: '0.05em' }}>{user?.licenseNo || 'Not Provided'}</p>
         </div>
         
         <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
               <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>License Image</p>
               <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem' }}>Uploaded Successfully</p>
            </div>
            <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--rider-shadow)' }}>
               <ImageIcon size={20} color="var(--rider-primary)" />
            </div>
         </div>
      </div>
    </div>
  );
}

function VehicleSubpage({ user, onBack }) {
  return (
    <div className="rider-screen" style={{ animation: 'slideUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'white', border: '1px solid var(--rider-border)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--rider-shadow)' }}>
           <ArrowLeft size={20} />
        </button>
        <h2 className="rider-title" style={{ margin: 0 }}>Vehicle Details</h2>
      </div>

      <div className="rider-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1rem' }}>
         <div style={{ width: '80px', height: '80px', background: 'var(--rider-primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
            <Bike size={40} color="var(--rider-primary)" />
         </div>
         <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>{user?.vehicleNo || 'Bajaj Pulsar (GJ-01-AB-1234)'}</h3>
         <span style={{ background: 'var(--rider-success-light)', color: 'var(--rider-success)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #a7f3d0' }}>Active Vehicle</span>
      </div>

      <div className="rider-card">
         <h4 style={{ margin: '0 0 1rem 0', fontWeight: 700 }}>Vehicle Type</h4>
         <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '12px' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Two-Wheeler</p>
         </div>
      </div>
    </div>
  );
}

function NotificationsSubpage({ onBack }) {
  return (
    <div className="rider-screen" style={{ animation: 'slideUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'white', border: '1px solid var(--rider-border)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--rider-shadow)' }}>
           <ArrowLeft size={20} />
        </button>
        <h2 className="rider-title" style={{ margin: 0 }}>Notifications</h2>
      </div>

      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div style={{ width: '64px', height: '64px', background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Bell size={28} color="#9ca3af" />
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>No New Notifications</h3>
          <p style={{ color: 'var(--rider-text-secondary)', fontSize: '0.875rem' }}>You're all caught up! Check back later for updates on orders and payouts.</p>
      </div>
    </div>
  );
}

function HelpSupportSubpage({ onBack }) {
  return (
    <div className="rider-screen" style={{ animation: 'slideUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'white', border: '1px solid var(--rider-border)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--rider-shadow)' }}>
           <ArrowLeft size={20} />
        </button>
        <h2 className="rider-title" style={{ margin: 0 }}>Help & Support</h2>
      </div>

      <div className="rider-card" style={{ marginBottom: '1rem' }}>
         <h4 style={{ margin: '0 0 1rem 0', fontWeight: 700 }}>Contact Support</h4>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className="rider-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
               <Headset size={20} /> Call Partner Support
            </button>
         </div>
      </div>

      <div className="rider-card">
         <h4 style={{ margin: '0 0 1rem 0', fontWeight: 700 }}>Frequently Asked Questions</h4>
         <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '12px', marginBottom: '0.5rem' }}>
            <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700, fontSize: '0.875rem' }}>How are payouts calculated?</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--rider-text-secondary)' }}>Payouts are calculated based on base pay, distance, and tips.</p>
         </div>
         <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '12px' }}>
            <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700, fontSize: '0.875rem' }}>What if customer rejects order?</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--rider-text-secondary)' }}>Contact support immediately. You will still receive base compensation.</p>
         </div>
      </div>
    </div>
  );
}

function AboutSubpage({ onBack }) {
  return (
    <div className="rider-screen" style={{ animation: 'slideUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'white', border: '1px solid var(--rider-border)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--rider-shadow)' }}>
           <ArrowLeft size={20} />
        </button>
        <h2 className="rider-title" style={{ margin: 0 }}>About Passwala</h2>
      </div>

      <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'white', borderRadius: '24px', boxShadow: 'var(--rider-shadow)', border: '1px solid var(--rider-border)' }}>
          <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #fb923c, #ef4444)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.4)' }}>
              <Bike size={40} color="white" />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--rider-text)' }}>Passwala Rider App</h3>
          <p style={{ color: 'var(--rider-text-secondary)', fontSize: '0.875rem', fontWeight: 600, margin: '0 0 2rem 0' }}>Version 1.0.0 (Production)</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
             <div style={{ padding: '0.75rem 1rem', background: '#f3f4f6', borderRadius: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem' }}>Terms of Service</p>
                <ChevronRight size={16} color="#9ca3af" />
             </div>
             <div style={{ padding: '0.75rem 1rem', background: '#f3f4f6', borderRadius: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem' }}>Privacy Policy</p>
                <ChevronRight size={16} color="#9ca3af" />
             </div>
          </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', marginTop: '2rem' }}>© 2026 Passwala Technologies Inc.</p>
    </div>
  );
}

function RiderProfile({ user, onLogout, stats }) {
  const [activeSubpage, setActiveSubpage] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    try {
      setIsDeleting(true);
      
      if (supabase && user?.uid) {
        const { error } = await supabase.from('riders').delete().eq('user_id', user.uid);
        if (error) throw error;
      }
      
      toast.success('Rider Account deleted successfully.');
      localStorage.removeItem('rOnboardingStep');
      localStorage.removeItem('rProfileCompleted');
      if (onLogout) onLogout(true);
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (activeSubpage === 'documents') return <DocumentsSubpage user={user} onBack={() => setActiveSubpage(null)} />;
  if (activeSubpage === 'vehicle') return <VehicleSubpage user={user} onBack={() => setActiveSubpage(null)} />;
  if (activeSubpage === 'notifications') return <NotificationsSubpage onBack={() => setActiveSubpage(null)} />;
  if (activeSubpage === 'help') return <HelpSupportSubpage onBack={() => setActiveSubpage(null)} />;
  if (activeSubpage === 'about') return <AboutSubpage onBack={() => setActiveSubpage(null)} />;

  return (
    <div className="rider-screen">
      <h2 className="rider-title">My Profile</h2>

      {/* Header Profile Info */}
      <div className="rider-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, width: '100%', height: '6rem', background: 'linear-gradient(90deg, #fb923c, #ef4444)', zIndex: 0 }}></div>
        <div style={{ position: 'relative', zIndex: 10, width: '6rem', height: '6rem', background: 'white', borderRadius: '50%', padding: '4px', boxShadow: 'var(--rider-shadow)', marginBottom: '0.75rem', marginTop: '1rem' }}>
           <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName || 'rider'}`} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--rider-primary-light)', objectFit: 'cover' }} />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, position: 'relative', zIndex: 10 }}>{user?.displayName || 'Demo Rider'}</h3>
        <p style={{ color: 'var(--rider-text-secondary)', fontSize: '0.875rem', fontWeight: 500, margin: 0, position: 'relative', zIndex: 10 }}>{user?.phoneNumber || '+91 88888 88888'}</p>
        <span style={{ marginTop: '0.5rem', background: 'var(--rider-success-light)', color: 'var(--rider-success)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #a7f3d0' }}>Verified Partner</span>
      </div>

      {/* Performance & Ratings */}
      <div className="rider-grid-2">
         <div className="rider-card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Rating</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '1.5rem', fontWeight: 900 }}>
               - <Star size={20} color="var(--rider-text-secondary)" />
            </div>
         </div>
         <div className="rider-card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Deliveries</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '1.5rem', fontWeight: 900 }}>
               {stats?.deliveries || 0}
            </div>
         </div>
         <div className="rider-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Acceptance</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={20} color="var(--rider-text-secondary)" />
                <span style={{ fontSize: '1.25rem', fontWeight: 900 }}>-</span>
            </div>
         </div>
         <div className="rider-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Cancellation</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <XCircle size={20} color="var(--rider-text-secondary)" />
                <span style={{ fontSize: '1.25rem', fontWeight: 900 }}>-</span>
            </div>
         </div>
      </div>

      {/* Details List */}
      <div style={{ background: 'white', borderRadius: '24px', border: '1px solid var(--rider-border)', overflow: 'hidden', boxShadow: 'var(--rider-shadow)' }}>
        <MenuItem icon={<Bike />} title="Vehicle Details" subtitle={user?.vehicleNo || "Bajaj Pulsar (GJ-01-AB-1234)"} onClick={() => setActiveSubpage('vehicle')} />
        <MenuItem icon={<FileText />} title="Documents" subtitle={`${user?.licenseNo || 'Driving License'}, ${user?.idProof || 'Aadhar Card'} (Verified)`} onClick={() => setActiveSubpage('documents')} />
        <MenuItem icon={<Bell />} title="Notifications" subtitle="Alerts on new orders & payments" onClick={() => setActiveSubpage('notifications')} />
        <MenuItem icon={<Headset />} title="Help & Support" subtitle="Chat with support, report issues" onClick={() => setActiveSubpage('help')} />
        <MenuItem icon={<Info />} title="About Passwala" subtitle="Terms, policies" onClick={() => setActiveSubpage('about')} />
        
        <button 
          onClick={onLogout}
          className="rider-menu-btn"
          style={{ color: 'var(--rider-text)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="rider-menu-icon" style={{ background: '#f3f4f6', color: 'var(--rider-text)' }}>
              <LogOut size={20} />
            </div>
            <span style={{ fontWeight: 700 }}>Log Out</span>
          </div>
        </button>

        <button 
          onClick={() => setShowDeleteModal(true)}
          disabled={isDeleting}
          className="rider-menu-btn"
          style={{ color: 'var(--rider-danger)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="rider-menu-icon" style={{ background: 'var(--rider-danger-light)', color: 'var(--rider-danger)' }}>
              <Trash2 size={20} />
            </div>
            <span style={{ fontWeight: 700 }}>{isDeleting ? 'Deleting...' : 'Delete Account'}</span>
          </div>
        </button>
      </div>

      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', padding: '1rem 0' }}>
         Passwala Rider App v1.0.0
      </div>

      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={() => setShowDeleteModal(false)}>
          <div 
            style={{ background: 'white', borderRadius: '16px', padding: '2rem', maxWidth: '400px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', textAlign: 'center', animation: 'scaleIn 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--rider-danger-light)', color: 'var(--rider-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--rider-text)' }}>Delete Account?</h3>
            <p style={{ margin: '0 0 2rem 0', color: 'var(--rider-text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>This will permanently remove your rider profile, vehicle details, and earning history. This action cannot be undone.</p>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: '#f3f4f6', color: 'var(--rider-text)', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: 'var(--rider-danger)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                onClick={handleDeleteAccount}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, title, subtitle, onClick }) {
    return (
        <button className="rider-menu-btn" onClick={onClick}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="rider-menu-icon">
                   {React.cloneElement(icon, { size: 20 })}
                </div>
                <div style={{ textAlign: 'left' }}>
                    <h4 className="rider-menu-title" style={{ margin: '0 0 0.125rem 0' }}>{title}</h4>
                    <p className="rider-menu-subtitle" style={{ margin: 0 }}>{subtitle}</p>
                </div>
            </div>
            <ChevronRight size={20} color="#d1d5db" />
        </button>
    )
}

export default RiderProfile;
