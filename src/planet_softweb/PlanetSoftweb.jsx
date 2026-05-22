import React, { useState, useEffect } from 'react';
import GroceryStore from './GroceryStore';
import InvoicePage from './InvoicePage';
import OrderTracking from './OrderTracking';
import AdminDashboard from './AdminDashboard';
import { ShoppingBag, FileText, MapPin, LayoutDashboard, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './PlanetSoftweb.css';

export default function PlanetSoftweb() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('STORE'); // STORE, TRACK, INVOICE, ADMIN
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [user] = useState(() => {
    const stored = localStorage.getItem('passwala_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // fall through
      }
    }
    return {
      id: 'usr_softweb_123456789012345678901234',
      full_name: 'Premium Customer',
      phone: '9988776655',
      email: 'customer@planetsoftweb.com',
      role: 'ADMIN' // Allow testing admin dashboard by default
    };
  });

  useEffect(() => {
    const stored = localStorage.getItem('passwala_user');
    if (!stored) {
      localStorage.setItem('passwala_user', JSON.stringify(user));
    }
  }, [user]);

  const handleCheckoutSuccess = (orderId) => {
    setSelectedOrderId(orderId);
    setActiveTab('INVOICE');
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrderId(orderId);
    setActiveTab('INVOICE');
  };

  return (
    <div className="planet-portal">
      {/* 1. Brand header & Navigation tabs */}
      <header className="planet-header">
        <div className="planet-brand" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('STORE')}>
          🪐 Planet <span>Softweb</span> Grocery
        </div>
        
        <nav className="planet-nav">
          <button className={`planet-nav-btn ${activeTab === 'STORE' ? 'active' : ''}`} onClick={() => setActiveTab('STORE')}>
            <ShoppingBag size={16} />
            <span>Storefront</span>
          </button>
          
          {selectedOrderId && (
            <>
              <button className={`planet-nav-btn ${activeTab === 'INVOICE' ? 'active' : ''}`} onClick={() => setActiveTab('INVOICE')}>
                <FileText size={16} />
                <span>GST Tax Invoice</span>
              </button>
              <button className={`planet-nav-btn ${activeTab === 'TRACK' ? 'active' : ''}`} onClick={() => setActiveTab('TRACK')}>
                <MapPin size={16} />
                <span>Order Tracking</span>
              </button>
            </>
          )}

          {user?.role === 'ADMIN' && (
            <button className={`planet-nav-btn ${activeTab === 'ADMIN' ? 'active' : ''}`} onClick={() => setActiveTab('ADMIN')}>
              <LayoutDashboard size={16} />
              <span>Admin Dashboard</span>
            </button>
          )}

          <button className="planet-nav-btn" onClick={() => navigate('/')} style={{ color: 'var(--planet-danger)' }}>
            <LogOut size={16} />
            <span>Exit Portal</span>
          </button>
        </nav>
      </header>

      {/* 2. Main Tab Screen Renderers */}
      <main style={{ minHeight: 'calc(100vh - 160px)' }}>
        {activeTab === 'STORE' && (
          <GroceryStore 
            onCheckoutSuccess={handleCheckoutSuccess} 
            userId={user?.id}
          />
        )}
        
        {activeTab === 'INVOICE' && selectedOrderId && (
          <InvoicePage 
            orderId={selectedOrderId} 
            onBack={() => setActiveTab('STORE')}
          />
        )}

        {activeTab === 'TRACK' && selectedOrderId && (
          <OrderTracking 
            orderId={selectedOrderId} 
            onBack={() => setActiveTab('STORE')}
          />
        )}

        {activeTab === 'ADMIN' && (
          <AdminDashboard 
            onSelectOrder={handleSelectOrder}
          />
        )}
      </main>
    </div>
  );
}
