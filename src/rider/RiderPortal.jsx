import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Wallet, UserCircle, IndianRupee, Bike, Bell } from 'lucide-react';
import RiderDashboard from './RiderDashboard';
import RiderEarnings from './RiderEarnings';
import RiderWallet from './RiderWallet';
import RiderProfile from './RiderProfile';
import RiderRideBookings from './RiderRideBookings';
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

  // 🔔 Global notification state — works on ANY tab
  const [globalNotif, setGlobalNotif] = useState(null); // { type: 'ride'|'order', label, sub, count }
  const [notifCount, setNotifCount] = useState(0);
  const lastNotifIdRef = useRef(null);
  const notifTimerRef = useRef(null);

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
      let uid = user?.id || user?.uid || user?.user_id;
      const isUUID = uid && uid.length === 36;
      let resolvedUserId = uid;

      if (!isUUID && uid) {
        // Resolve from database
        const phoneNo = user.phoneNumber?.replace('+91', '') || user.phone?.replace('+91', '');
        const orFilters = [];
        if (user.uid) orFilters.push(`uid.eq.${user.uid}`);
        if (user.email) orFilters.push(`email.eq.${user.email}`);
        if (phoneNo) {
          orFilters.push(`phone.eq.${phoneNo}`);
          orFilters.push(`phone.eq.+91${phoneNo}`);
        }
        
        if (orFilters.length > 0) {
          const { data: usr } = await supabase
            .from('users')
            .select('id')
            .or(orFilters.join(','))
            .maybeSingle();
          if (usr) {
            resolvedUserId = usr.id;
          }
        }
      }

      let rid = '';
      if (resolvedUserId && resolvedUserId.length === 36) {
        const { data } = await supabase.from('riders').select('id, is_active').eq('user_id', resolvedUserId).maybeSingle();
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

  // 🔔 Global background poller — detects new rides/orders on ANY tab
  useEffect(() => {
    if (!isOnline) {
      setGlobalNotif(null);
      setNotifCount(0);
      return;
    }

    const playPing = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch(e) {
        console.warn("AudioContext play error:", e);
      }
    };

    const checkForNew = async () => {
      let uid = user?.id || user?.uid || user?.user_id;
      if (!uid) return;

      try {
        // Poll for pending unassigned ride requests
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${baseUrl}/api/city-rides/pending-rides`);
        const json = await res.json();
        const pending = json.bookings || [];

        if (pending.length > 0) {
          const newest = pending[0];
          if (lastNotifIdRef.current !== newest.id) {
            lastNotifIdRef.current = newest.id;
            setNotifCount(pending.length);
            setGlobalNotif({
              type: 'ride',
              label: `🛵 New Ride Request!`,
              sub: `${newest.pickup_area} → ${newest.drop_area}  •  ₹${newest.total_price?.toFixed(0)}`,
              count: pending.length
            });
            playPing();
            // Auto-dismiss after 15s if rider doesn't tap
            clearTimeout(notifTimerRef.current);
            notifTimerRef.current = setTimeout(() => setGlobalNotif(null), 15000);
          }
          return;
        }

        // Also check for active-ride (someone already booked this rider)
        if (riderId) {
          const { data: tracking } = await supabase
            .from('delivery_tracking')
            .select('order_id, status')
            .eq('rider_id', riderId)
            .eq('status', 'ASSIGNED')
            .limit(1)
            .maybeSingle();

          if (tracking?.order_id) {
            const key = `order-${tracking.order_id}`;
            if (lastNotifIdRef.current !== key) {
              lastNotifIdRef.current = key;
              setNotifCount(1);
              setGlobalNotif({
                type: 'order',
                label: `📦 New Delivery Order!`,
                sub: `Order assigned to you — tap to view`,
                count: 1
              });
              playPing();
              clearTimeout(notifTimerRef.current);
              notifTimerRef.current = setTimeout(() => setGlobalNotif(null), 15000);
            }
          }
        }
      } catch (e) {
        console.warn('Global notif poll error:', e);
      }
    };

    checkForNew();
    const interval = setInterval(checkForNew, 5000);
    return () => {
      clearInterval(interval);
      clearTimeout(notifTimerRef.current);
    };
  }, [isOnline, riderId, user]);


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

  const [sessionStartTime, setSessionStartTime] = useState(() => {
    const saved = localStorage.getItem(`passwala_rider_session_start_${riderId}`);
    return saved ? parseInt(saved) : null;
  });

  const [gpsBlocked, setGpsBlocked] = useState(false);

  // 🛰️ Real-time Location Tracking Sync (watchPosition for Uber/Zepto-style tracking)
  useEffect(() => {
    let watchId = null;

    const startTracking = () => {
      if (!navigator.geolocation) {
        console.warn('Geolocation API not available on this device.');
        return;
      }

      // GPS requires HTTPS (or localhost) — check secure context first
      if (!window.isSecureContext) {
        console.warn('⚠️ GPS blocked: app is running over HTTP. Use HTTPS for live location tracking.');
        setGpsBlocked(true);
        return;
      }

      setGpsBlocked(false);
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
       setGpsBlocked(false);
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isOnline, riderId]);


  useEffect(() => {
    if (isOnline) {
      if (!sessionStartTime) {
        const now = Date.now();
        setSessionStartTime(now);
        if (riderId) {
          localStorage.setItem(`passwala_rider_session_start_${riderId}`, now.toString());
        }
      }
    } else {
      setSessionStartTime(null);
      if (riderId) {
        localStorage.removeItem(`passwala_rider_session_start_${riderId}`);
      }
    }
  }, [isOnline, sessionStartTime, riderId]);

  const renderContent = () => {
    const commonProps = { user, riderId, stats, setStats, isOnline, sessionStartTime, setShowLocationDisclosure };
    switch (activeTab) {
      case 'DASHBOARD': return <RiderDashboard {...commonProps} setIsOnline={setIsOnline} riderLocation={location} setRiderLocation={setLocation} isDetecting={isDetecting} setIsDetecting={setIsDetecting} userCoords={currentCoords || userCoords} />;
      case 'EARNINGS': return <RiderEarnings {...commonProps} />;
      case 'RIDES': return <RiderRideBookings {...commonProps} />;
      case 'WALLET': return <RiderWallet {...commonProps} />;
      case 'PROFILE': return <RiderProfile {...commonProps} onLogout={onLogout} />;
      default: return <RiderDashboard {...commonProps} setIsOnline={setIsOnline} riderLocation={location} setRiderLocation={setLocation} isDetecting={isDetecting} setIsDetecting={setIsDetecting} userCoords={currentCoords || userCoords} />;
    }
  };

  const handleNotifTap = () => {
    setGlobalNotif(null);
    setNotifCount(0);
    lastNotifIdRef.current = null;
    setActiveTab('DASHBOARD');
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
                supabase.from('city_vehicles').update({ is_active: nextStatus }).eq('driver_id', id).then();
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

      {/* GPS Blocked Warning Banner */}
      {gpsBlocked && isOnline && (
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
          borderBottom: '2px solid #f59e0b',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: '0.78rem',
          color: '#92400e',
          fontWeight: 600,
          zIndex: 100,
          position: 'relative'
        }}>
          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 800 }}>GPS Tracking Blocked</div>
            <div style={{ fontWeight: 500 }}>Use HTTPS to enable live location:{' '}
              <a href={`https://${window.location.hostname}:3003`}
                style={{ color: '#92400e', textDecoration: 'underline', fontWeight: 700 }}>
                https://{window.location.hostname}:3003
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main ref={mainScrollRef} className="rider-main-scroll">
        {renderContent()}
      </main>


      {/* 🔔 Global Floating Notification Banner — shows on ANY tab */}
      {globalNotif && activeTab !== 'DASHBOARD' && (
        <div
          onClick={handleNotifTap}
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom) + 80px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            color: 'white',
            borderRadius: 20,
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            boxShadow: '0 8px 32px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,118,34,0.5)',
            cursor: 'pointer',
            maxWidth: 'calc(100vw - 3rem)',
            minWidth: 260,
            animation: 'slideUpBounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            border: '1.5px solid rgba(255,118,34,0.4)',
          }}
        >
          {/* Pulse ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff7622, #ef4444)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.3rem'
            }}>
              {globalNotif.type === 'ride' ? '🛵' : '📦'}
            </div>
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: '#ef4444', color: 'white',
              fontSize: '0.6rem', fontWeight: 900,
              width: 18, height: 18, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #1a1a2e',
              animation: 'pulse 1s infinite'
            }}>{globalNotif.count}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '0.875rem', color: '#ff7622', letterSpacing: '0.01em' }}>{globalNotif.label}</p>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{globalNotif.sub}</p>
          </div>
          <div style={{ background: '#ff7622', color: 'white', borderRadius: 10, padding: '6px 12px', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>View →</div>
        </div>
      )}

      {/* Bottom Navigation / Desktop Sidebar */}
      <nav className="rider-bottom-nav">

          {/* Profile identity — visible inside sidebar on desktop */}
          <div className="rider-sidebar-profile">
            <div className="rider-sidebar-avatar">
              <img
                src={user?.photoURL || user?.photo || '/logo.png'}
                alt="Rider"
                style={{
                  width: (user?.photoURL || user?.photo) ? '100%' : '26px',
                  height: (user?.photoURL || user?.photo) ? '100%' : '26px',
                  objectFit: (user?.photoURL || user?.photo) ? 'cover' : 'contain'
                }}
              />
            </div>
            <div className="rider-sidebar-identity">
              <span className="rider-sidebar-name">Passwala Rider</span>
              <span className={`rider-sidebar-status ${isOnline ? 'online' : 'offline'}`}>
                <span className="status-dot" />
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          <NavItem
            icon={
              <div style={{ position: 'relative' }}>
                <LayoutDashboard size={22} />
                {notifCount > 0 && activeTab !== 'DASHBOARD' && (
                  <span style={{
                    position: 'absolute', top: -6, right: -6,
                    background: '#ef4444', color: 'white',
                    fontSize: '0.55rem', fontWeight: 900,
                    width: 15, height: 15, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'pulse 1s infinite'
                  }}>{notifCount}</span>
                )}
              </div>
            }
            label="Orders"
            isActive={activeTab === 'DASHBOARD'}
            onClick={() => { setActiveTab('DASHBOARD'); setGlobalNotif(null); setNotifCount(0); }}
          />
          <NavItem
            icon={<IndianRupee size={22} />}
            label="Earnings"
            isActive={activeTab === 'EARNINGS'}
            onClick={() => setActiveTab('EARNINGS')}
          />
          <NavItem
            icon={<Bike size={22} />}
            label="Rides"
            isActive={activeTab === 'RIDES'}
            onClick={() => setActiveTab('RIDES')}
          />
          <NavItem
            icon={<Wallet size={22} />}
            label="Wallet"
            isActive={activeTab === 'WALLET'}
            onClick={() => setActiveTab('WALLET')}
          />
          <NavItem
            icon={<UserCircle size={22} />}
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
                    supabase.from('city_vehicles').update({ is_active: true }).eq('driver_id', id).then();
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
