/* eslint-disable no-unused-vars */
import React from 'react';
import { motion } from 'framer-motion';
import { Home, LayoutGrid, Bell, Search, User, Users, Truck } from 'lucide-react';
import { isFeatureEnabled } from '../launchConfig';
import './BottomNav.css';

const BottomNav = ({ activeTab, onTabChange, user }) => {
  const allTabs = [
    { id: 'DASHBOARD',       icon: Home,        label: 'Home',      title: 'Home' },
    { id: 'TRACKING',        icon: Truck,        label: 'Orders',    title: 'Track Orders',     launchFeature: 'shopping' },
    { id: 'NEIGHBORS',       icon: Users,        label: 'Community', title: 'Community',         launchFeature: 'community' },
    { id: 'EXPERT_SERVICES', icon: LayoutGrid,   label: 'Expert',    title: 'Expert Services',  launchFeature: 'services' },
    { id: 'PROFILE',         icon: User,         label: 'Profile',   title: 'My Profile' },
  ];
  // Hide tabs for features not yet launched (code preserved, never removed)
  const tabs = allTabs.filter(tab => !tab.launchFeature || isFeatureEnabled(tab.launchFeature));

  return (
    <div className="bottom-nav-container" role="navigation" aria-label="Main navigation">

      {/* Brand header — visible only on desktop sidebar */}
      <div className="nav-brand-section">
        <img src="/logo.png" alt="Passwala" className="nav-brand-logo" />
        <span className="nav-brand-name">Passwala</span>
      </div>

      {/* Nav items */}
      <div className="bottom-nav-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
              title={tab.title}
              aria-label={tab.title}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="icon-wrapper">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="nav-label">{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="active-indicator"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Profile Card — desktop only */}
      <div className="nav-sidebar-profile" onClick={() => onTabChange('PROFILE')} title="My Profile">
        <div className="nav-sidebar-avatar">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'white' }}>
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : '👤'}
            </span>
          )}
        </div>
        <div className="nav-sidebar-info">
          <span className="nav-sidebar-name">{user?.displayName || 'My Account'}</span>
          <span className="nav-sidebar-link">View Profile →</span>
        </div>
      </div>

    </div>
  );
};

export default BottomNav;
