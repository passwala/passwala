import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Wallet, UserCircle, IndianRupee, Bike } from 'lucide-react';
import RiderDashboard from './RiderDashboard';
import RiderEarnings from './RiderEarnings';
import RiderWallet from './RiderWallet';
import RiderProfile from './RiderProfile';
import './RiderPortal.css'; // Import custom styles
import { supabase } from '../supabase';

function RiderPortal({ user, onLogout, location, setLocation, userCoords }) {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [isOnline, setIsOnline] = useState(false);
  const [riderId, setRiderId] = useState(user?.rider_id || 'demo-rider-123');
  const [stats, setStats] = useState({ earnings: 0, deliveries: 0 });
  const [loading, setLoading] = useState(true);
  const mainScrollRef = useRef(null);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo(0, 0);
      }
      // Fallback for some mobile browsers
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    };
    
    resetScroll();
    const timer = setTimeout(resetScroll, 50);
    return () => clearTimeout(timer);
  }, [activeTab]);

  useEffect(() => {
    const initRider = async () => {
      let rid = riderId;
      let uid = user?.id || user?.uid;

      if (!rid && uid) {
        const { data } = await supabase.from('riders').select('id, is_active').eq('user_id', uid).maybeSingle();
        if (data) {
          rid = data.id;
          setRiderId(rid);
          setIsOnline(data.is_active || false);
        }
      }

      if (rid && rid !== 'demo-rider-123' && rid.length > 20) { // Simple UUID check
        try {
          // Fetch stats
          const { data: earningsData, error } = await supabase
            .from('rider_earnings')
            .select('amount')
            .eq('rider_id', rid);
          
          if (error) throw error;

          if (earningsData) {
            const total = earningsData.reduce((sum, item) => sum + Number(item.amount), 0);
            setStats({
              earnings: total,
              deliveries: earningsData.length
            });
          }
        } catch (err) {
          console.warn("Using mock stats for rider portal");
          setStats({
            earnings: 1250,
            deliveries: 28
          });
        }
      } else {
        // For demo or invalid IDs, use mock stats
        setStats({
          earnings: 1250,
          deliveries: 28
        });
      }
      setLoading(false);
    };

    initRider();
    
    // Subscribe to earnings updates
    const channel = supabase
      .channel('rider_stats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rider_earnings', filter: `rider_id=eq.${riderId}` }, 
        () => initRider())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, riderId]);

  useEffect(() => {
    // Check initial active status from DB
    const checkStatus = async () => {
      let id = user?.id || user?.uid;
      // Fallback for stale local sessions that only have phoneNumber
      if (!id && user?.phoneNumber) {
        const phoneNo = user.phoneNumber.replace('+91', '');
        const { data } = await supabase.from('users').select('id').eq('phone', phoneNo).maybeSingle();
        if (data) id = data.id;
      }
      
      if (!id) return;
      try {
        const { data, error } = await supabase.from('riders').select('is_active').eq('user_id', id).single();
        if (!error && data) {
          setIsOnline(data.is_active || false);
        }
      } catch (e) {
        console.error("Error loading rider active status");
      }
    };
    checkStatus();
  }, [user]);

  const [sessionStartTime, setSessionStartTime] = useState(null);

  // 🛰️ Real-time Location Tracking Sync
  useEffect(() => {
    let trackingInterval;
    
    const syncLocation = async () => {
      // Only sync if online and we have a valid rider ID
      if (isOnline && riderId && riderId !== 'demo-rider-123') {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Upsert to rider_locations table
            const { error } = await supabase
              .from('rider_locations')
              .upsert({
                rider_id: riderId,
                lat: latitude,
                lng: longitude,
                status: 'ONLINE',
                updated_at: new Date().toISOString()
              }, { onConflict: 'rider_id' }); // Ensure unique rider_id in table
            
            if (error) console.warn("Location sync failed:", error.message);
          } catch (err) {
            console.error("Critical location tracking error:", err);
          }
        }, (err) => console.warn("GPS tracking blocked"), { enableHighAccuracy: true });
      }
    };

    if (isOnline) {
      syncLocation(); // Initial sync
      trackingInterval = setInterval(syncLocation, 3000); // 🚀 Zepto-speed: Sync every 3 seconds
    } else if (riderId && riderId !== 'demo-rider-123') {
       // Update status to OFFLINE when rider goes off
       supabase.from('rider_locations').upsert({ 
         rider_id: riderId, 
         status: 'OFFLINE',
         updated_at: new Date().toISOString()
       }, { onConflict: 'rider_id' });
    }

    return () => {
      if (trackingInterval) clearInterval(trackingInterval);
    };
  }, [isOnline, riderId]);

  useEffect(() => {
    if (isOnline && !sessionStartTime) {
      setSessionStartTime(Date.now());
    } else if (!isOnline) {
      setSessionStartTime(null);
    }
  }, [isOnline]);

  const renderContent = () => {
    const commonProps = { user, riderId, stats, setStats, isOnline, sessionStartTime };
    switch (activeTab) {
      case 'DASHBOARD': return <RiderDashboard {...commonProps} setIsOnline={setIsOnline} riderLocation={location} setRiderLocation={setLocation} isDetecting={isDetecting} setIsDetecting={setIsDetecting} userCoords={userCoords} />;
      case 'EARNINGS': return <RiderEarnings {...commonProps} />;
      case 'WALLET': return <RiderWallet {...commonProps} />;
      case 'PROFILE': return <RiderProfile {...commonProps} onLogout={onLogout} />;
      default: return <RiderDashboard {...commonProps} setIsOnline={setIsOnline} riderLocation={location} setRiderLocation={setLocation} isDetecting={isDetecting} setIsDetecting={setIsDetecting} />;
    }
  };

  return (
    <div className="rider-app">
      {/* Top Header */}
      <header className="rider-header" style={{ borderBottom: 'none', background: 'transparent', padding: '1.25rem 1rem' }}>
        <div className="rider-header-profile">
          <div className="rider-header-avatar" style={{ background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.04)' }}>
             <img src="/logo.png" alt="Passwala Logo" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--rider-text)' }}>Passwala Rider</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0, fontWeight: 600 }}>Welcome back, {user?.displayName || 'Partner'}</p>
          </div>
        </div>
        <div 
          onClick={() => setIsOnline(!isOnline)} 
          style={{ 
            cursor: 'pointer',
            padding: '0.4rem 0.8rem',
            borderRadius: '10px',
            background: isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
            border: isOnline ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(100, 116, 139, 0.2)',
            transition: 'all 0.3s'
          }}
          title={isOnline ? "Tap to go Offline" : "Tap to go Online"}
        >
            {isOnline ? (
              <span style={{ color: 'var(--rider-success)', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="rider-pulse-dot"></span> Online
              </span>
            ) : (
              <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#94a3b8' }}></div> Offline
              </span>
            )}
        </div>
      </header>

      {/* Main Content Area */}
      <main ref={mainScrollRef} className="rider-main-scroll">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="rider-bottom-nav">
          <NavItem 
            icon={<LayoutDashboard size={24} />} 
            label="Orders" 
            isActive={activeTab === 'DASHBOARD'} 
            onClick={() => setActiveTab('DASHBOARD')} 
          />
          <NavItem 
            icon={<IndianRupee size={24} />} 
            label="Earnings" 
            isActive={activeTab === 'EARNINGS'} 
            onClick={() => setActiveTab('EARNINGS')} 
          />
          <NavItem 
            icon={<Wallet size={24} />} 
            label="Wallet" 
            isActive={activeTab === 'WALLET'} 
            onClick={() => setActiveTab('WALLET')} 
          />
          <NavItem 
            icon={<UserCircle size={24} />} 
            label="Profile" 
            isActive={activeTab === 'PROFILE'} 
            onClick={() => setActiveTab('PROFILE')} 
          />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`rider-nav-item ${isActive ? 'active' : ''}`}
    >
      {isActive && <div className="rider-nav-indicator"></div>}
      <div style={{ transform: isActive ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.3s ease' }}>
        {icon}
      </div>
      <span className="rider-nav-label" style={{ fontWeight: isActive ? 700 : 500 }}>{label}</span>
    </button>
  );
}

export default RiderPortal;
