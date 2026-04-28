/* eslint-disable no-unused-vars */
import React from 'react';
import { motion } from 'framer-motion';
import { Home, LayoutGrid, Bell, Search, User, Users, Truck } from 'lucide-react';
import './BottomNav.css';

const BottomNav = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'DASHBOARD', icon: Home, label: 'Home' },
    { id: 'NEAR_SHOPS', icon: Search, label: 'Shops' },
    { id: 'TRACKING', icon: Truck, label: 'Track' },
    { id: 'NEIGHBORS', icon: Users, label: 'Comm' },
    { id: 'EXPERT_SERVICES', icon: LayoutGrid, label: 'Expert' },
    { id: 'PROFILE', icon: User, label: 'Profile' }
  ];

  return (
    <div className="bottom-nav-container">
      <div className="bottom-nav-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button 
              key={tab.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              <div className="icon-wrapper">
                <Icon size={24} />
                {isActive && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="active-indicator"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
