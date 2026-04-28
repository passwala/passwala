import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Wallet, UserCircle, IndianRupee, Bike } from 'lucide-react';
import RiderDashboard from './RiderDashboard';
import RiderEarnings from './RiderEarnings';
import RiderWallet from './RiderWallet';
import RiderProfile from './RiderProfile';
import './RiderPortal.css'; // Import custom styles
import { supabase } from '../supabase';

function RiderPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [isOnline, setIsOnline] = useState(false);
  const [riderId, setRiderId] = useState(user?.rider_id || 'demo-rider-123');
  const [stats, setStats] = useState({ earnings: 0, deliveries: 0 });
  const [loading, setLoading] = useState(true);

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

      if (rid) {
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

  const renderContent = () => {
    const commonProps = { user, riderId, stats, setStats };
    switch (activeTab) {
      case 'DASHBOARD': return <RiderDashboard {...commonProps} isOnline={isOnline} setIsOnline={setIsOnline} />;
      case 'EARNINGS': return <RiderEarnings {...commonProps} />;
      case 'WALLET': return <RiderWallet {...commonProps} />;
      case 'PROFILE': return <RiderProfile {...commonProps} onLogout={onLogout} />;
      default: return <RiderDashboard {...commonProps} isOnline={isOnline} setIsOnline={setIsOnline} />;
    }
  };

  return (
    <div className="rider-app">
      {/* Top Header */}
      <header className="rider-header">
        <div className="rider-header-profile">
          <div className="rider-header-avatar" style={{background: 'transparent'}}>
             <img src="/logo.png" alt="P" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: 'var(--rider-text)' }}>Passwala Rider</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0 }}>Hello, {user?.displayName || 'Partner'}</p>
          </div>
        </div>
        <div>
            {isOnline ? (
              <span className="rider-badge-online">
                  <span className="rider-pulse-dot"></span> Online
              </span>
            ) : (
              <span className="rider-badge-online" style={{ background: '#f1f5f9', color: '#64748b' }}>
                  Offline
              </span>
            )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="rider-main-scroll">
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
