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
  const [showLocationDisclosure, setShowLocationDisclosure] = useState(false);
  const [riderId, setRiderId] = useState(user?.rider_id || '');
  const [stats, setStats] = useState({ earnings: 0, deliveries: 0, acceptanceRate: 100, cancellationRate: 0 });
  const mainScrollRef = useRef(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);

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
      let uid = user?.id || user?.uid || user?.user_id;

      if (!rid && uid) {
        const { data } = await supabase.from('riders').select('id, is_active').eq('user_id', uid).maybeSingle();
        if (data) {
          rid = data.id;
          setRiderId(rid);
          setIsOnline(data.is_active || false);
        }
      }

      if (rid && rid.length > 20) { // Simple UUID check
        try {
          // Fetch earnings
          const { data: earningsData, error: earningsError } = await supabase
            .from('rider_earnings')
            .select('amount')
            .eq('rider_id', rid);
          
          if (earningsError) throw earningsError;

          // Fetch delivery tracking to calculate acceptance and cancellation rates
          const { data: trackingData } = await supabase
            .from('delivery_tracking')
            .select('order_id, status, orders(status)')
            .eq('rider_id', rid);

          let rejectedOrderIds = [];
          try {
            const saved = localStorage.getItem(`passwala_rejected_orders_${rid}`);
            if (saved) {
              rejectedOrderIds = JSON.parse(saved);
            }
          } catch (e) {
            console.warn("Failed to parse rejected order IDs from localStorage", e);
          }

          const acceptedCount = trackingData ? trackingData.length : 0;
          const rejectedCount = rejectedOrderIds.length;
          const totalOffers = acceptedCount + rejectedCount;
          const acceptanceRate = totalOffers > 0 ? Math.round((acceptedCount / totalOffers) * 100) : 100;

          const cancelledCount = trackingData ? trackingData.filter(item => 
            item.status === 'CANCELLED' || item.orders?.status === 'CANCELLED'
          ).length : 0;
          const cancellationRate = acceptedCount > 0 ? Math.round((cancelledCount / acceptedCount) * 100) : 0;

          if (earningsData) {
            const total = earningsData.reduce((sum, item) => sum + Number(item.amount), 0);
            setStats({
              earnings: total,
              deliveries: earningsData.length,
              acceptanceRate,
              cancellationRate
            });
          }
        } catch (err) {
          console.warn("Stats fetch failed, defaulting to zero", err);
          setStats({
            earnings: 0,
            deliveries: 0,
            acceptanceRate: 100,
            cancellationRate: 0
          });
        }
      } else {
        // Default to zero for new or invalid riders
        setStats({
          earnings: 0,
          deliveries: 0,
          acceptanceRate: 100,
          cancellationRate: 0
        });
      }
    };

    initRider();
    
    // Subscribe to earnings updates and order updates
    const channel = supabase
      .channel('rider_stats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rider_earnings', filter: `rider_id=eq.${riderId}` }, 
        () => initRider())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `rider_id=eq.${riderId}` }, 
        () => initRider())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_tracking', filter: `rider_id=eq.${riderId}` }, 
        () => initRider())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, riderId]);

  useEffect(() => {
    // Check initial active status from DB
    const checkStatus = async () => {
      let id = user?.id || user?.uid || user?.user_id;
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

  // 🛰️ Real-time Location Tracking Sync (watchPosition for Uber/Zepto-style tracking)
  useEffect(() => {
    let watchId = null;

    const startTracking = () => {
      if (!navigator.geolocation) return;

      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentCoords({ lat: latitude, lng: longitude });

          try {
            // Upsert to rider_locations table without status column
            const { error } = await supabase
              .from('rider_locations')
              .upsert({
                rider_id: riderId,
                lat: latitude,
                lng: longitude,
                updated_at: new Date().toISOString()
              }, { onConflict: 'rider_id' }); // Ensure unique rider_id in table
            
            if (error) console.warn("Location sync failed:", error.message);
          } catch (err) {
            console.error("Critical location tracking error:", err);
          }
        },
        (error) => console.warn("GPS tracking error/blocked:", error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    };

    if (isOnline && riderId) {
      startTracking();
    } else if (riderId) {
       // Delete location row when rider goes off
       supabase.from('rider_locations').delete().eq('rider_id', riderId);
       setCurrentCoords(null);
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isOnline, riderId]);

  useEffect(() => {
    if (isOnline && !sessionStartTime) {
      setSessionStartTime(Date.now());
    } else if (!isOnline) {
      setSessionStartTime(null);
    }
  }, [isOnline, sessionStartTime]);

  const renderContent = () => {
    const commonProps = { user, riderId, stats, setStats, isOnline, sessionStartTime, setShowLocationDisclosure };
    switch (activeTab) {
      case 'DASHBOARD': return <RiderDashboard {...commonProps} setIsOnline={setIsOnline} riderLocation={location} setRiderLocation={setLocation} isDetecting={isDetecting} setIsDetecting={setIsDetecting} userCoords={currentCoords || userCoords} />;
      case 'EARNINGS': return <RiderEarnings {...commonProps} />;
      case 'WALLET': return <RiderWallet {...commonProps} />;
      case 'PROFILE': return <RiderProfile {...commonProps} onLogout={onLogout} />;
      default: return <RiderDashboard {...commonProps} setIsOnline={setIsOnline} riderLocation={location} setRiderLocation={setLocation} isDetecting={isDetecting} setIsDetecting={setIsDetecting} userCoords={currentCoords || userCoords} />;
    }
  };

  return (
    <div className="rider-app">
      {/* Top Header */}
      <header className="rider-header" style={{ borderBottom: 'none', background: 'transparent', padding: '1.25rem 1rem' }}>
        <div className="rider-header-profile">
          <div className="rider-header-avatar" style={{ background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
             <img src={user?.photoURL || user?.photo || "/logo.png"} alt="Rider Profile" style={{ width: (user?.photoURL || user?.photo) ? '100%' : '26px', height: (user?.photoURL || user?.photo) ? '100%' : '26px', objectFit: (user?.photoURL || user?.photo) ? 'cover' : 'contain' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--rider-text)' }}>Passwala Rider</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0, fontWeight: 600 }}>Welcome back, {user?.displayName || 'Partner'}</p>
          </div>
        </div>
        <div 
          onClick={() => {
            if (!isOnline && localStorage.getItem('passwala_location_consent') !== 'accepted') {
              setShowLocationDisclosure(true);
            } else {
              const nextStatus = !isOnline;
              setIsOnline(nextStatus);
              let id = user?.id || user?.uid || user?.user_id;
              if (id) {
                supabase.from('riders').update({ is_active: nextStatus }).eq('user_id', id).then();
              }
            }
          }} 
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

      {/* Prominent Disclosure Modal for App Store & Play Store Location Policy Compliance */}
      {showLocationDisclosure && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            textAlign: 'center',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}>
            <div style={{
              background: 'rgba(249, 115, 22, 0.1)',
              color: 'var(--rider-primary, #f97316)',
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto'
            }}>
              <Bike size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.75rem 0' }}>
              Background Location Tracking Disclosure
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, margin: '0 0 1.5rem 0', textAlign: 'left' }}>
              Passwala Rider collects location data to track your coordinates and display live delivery routes to customers in real-time, <strong>even when the app is closed or not in use</strong>, while you are set to <strong>Online</strong>.
            </p>
            <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Features requiring background location:</div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                <li>Real-time order tracking for customers</li>
                <li>Optimal delivery route recommendations</li>
                <li>Accurate estimation of delivery payouts and times</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                onClick={() => setShowLocationDisclosure(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  color: '#475569',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Decline
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('passwala_location_consent', 'accepted');
                  setShowLocationDisclosure(false);
                  setIsOnline(true);
                  let id = user?.id || user?.uid || user?.user_id;
                  if (id) {
                    supabase.from('riders').update({ is_active: true }).eq('user_id', id).then();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--rider-primary, #f97316)',
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Accept & Proceed
              </button>
            </div>
          </div>
        </div>
      )}
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
