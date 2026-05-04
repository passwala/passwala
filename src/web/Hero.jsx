/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Search, MapPin, TrendingUp, Sparkles, ShieldCheck, CheckCircle2, Users, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSearch } from '../context/SearchContext';
import { supabase } from '../supabase';
import './Hero.css';

const Hero = () => {
  const { addToCart } = useCart();
  const { updateSearch } = useSearch();
  const [heroSearch, setHeroSearch] = useState('');
  const [stats, setStats] = useState({ users: '5k+', experts: 'Verified', orders: 'Rapid' });

  useEffect(() => {
    fetchRealStats();
  }, []);

  const fetchRealStats = async () => {
    try {
      if (!supabase) return;
      const { count: sCount } = await supabase.from('services').select('*', { count: 'exact', head: true });
      const { count: oCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
      setStats({
        users: oCount || '0',
        experts: sCount ? `${sCount} Experts` : 'Verified Experts',
        orders: oCount || '0'
      });
    } catch (err) { console.error('Stats error:', err); }
  };
   
  const handleHeroSearch = (e) => {
    e.preventDefault();
    updateSearch(heroSearch);
    if (heroSearch.trim()) {
      toast.success(`Locating ${heroSearch}...`, { icon: '🔍' });
    }
    const servicesEl = document.getElementById('services');
    if (servicesEl) servicesEl.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero">
      <div className="container hero-container animate-fade-in">
        <div className="hero-top">
          <div className="hero-badge-container">
            <span className="badge-exclusive"><Sparkles size={14} /> Ahmedabad's #1 Platform</span>
            <span className="badge-status">Live Auctions & Services</span>
          </div>
          
          <h1 className="hero-heading">
            Discover Value in <br />
            <span className="text-primary-gradient">Local Excellence.</span>
          </h1>
          
          <p className="hero-subtext">
            The most trusted marketplace for verified neighborhood services, daily essentials, and exclusive community tenders in Ahmedabad.
          </p>
        </div>

        <div className="hero-search-wrapper">
          <form className="hero-search-box-v2" onSubmit={handleHeroSearch}>
            <div className="search-category-select">
              <select defaultValue="all">
                <option value="all">All Categories</option>
                <option value="services">Services</option>
                <option value="essentials">Essentials</option>
                <option value="tenders">Tenders</option>
              </select>
            </div>
            <div className="search-divider"></div>
            <div className="search-input-group">
              <Search size={20} className="search-icon-v2" />
              <input 
                type="text" 
                placeholder="Search for services, products or tenders..."
                value={heroSearch}
                onChange={(e) => {
                  setHeroSearch(e.target.value);
                  updateSearch(e.target.value);
                }}
              />
            </div>
            <button type="submit" className="hero-submit-btn">Search Now</button>
          </form>
          
          <div className="hero-quick-stats">
            <div className="stat-item">
              <Users size={16} />
              <span>{stats.users} Users</span>
            </div>
            <div className="stat-item">
              <ShieldCheck size={16} />
              <span>{stats.experts}</span>
            </div>
            <div className="stat-item">
               <TrendingUp size={16} />
               <span>{stats.orders}</span>
            </div>
          </div>

          <div className="hero-vendor-cta">
            <span>Own a shop or offer expert services? </span>
            <button 
              className="vendor-cta-btn" 
              onClick={() => window.open('http://localhost:3002', '_blank')}
            >
              Earn with Passwala <ArrowRight size={14} />
            </button>
          </div>

          <div className="hero-app-downloads">
            <button className="download-btn apple-btn" onClick={() => toast('Redirecting to App Store...', { icon: '🍎' })}>
              <svg viewBox="0 0 384 512" width="24" height="24" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
              <div className="btn-text">
                <span className="small-text">Download on the</span>
                <span className="big-text">App Store</span>
              </div>
            </button>
            <button className="download-btn play-btn" onClick={() => toast('Redirecting to Google Play...', { icon: '▶️' })}>
              <svg viewBox="0 0 512 512" width="24" height="24" fill="currentColor"><path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/></svg>
              <div className="btn-text">
                <span className="small-text">GET IT ON</span>
                <span className="big-text">Google Play</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
