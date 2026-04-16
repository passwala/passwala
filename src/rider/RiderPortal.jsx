import React, { useState } from 'react';
import { LayoutDashboard, Wallet, UserCircle, IndianRupee, Bike } from 'lucide-react';
import RiderDashboard from './RiderDashboard';
import RiderEarnings from './RiderEarnings';
import RiderWallet from './RiderWallet';
import RiderProfile from './RiderProfile';
import './RiderPortal.css'; // Import custom styles

function RiderPortal({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('DASHBOARD');

  const renderContent = () => {
    switch (activeTab) {
      case 'DASHBOARD': return <RiderDashboard user={user} />;
      case 'EARNINGS': return <RiderEarnings user={user} />;
      case 'WALLET': return <RiderWallet user={user} />;
      case 'PROFILE': return <RiderProfile user={user} onLogout={onLogout} />;
      default: return <RiderDashboard user={user} />;
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
            <span className="rider-badge-online">
                <span className="rider-pulse-dot"></span> Online
            </span>
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
