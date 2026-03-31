import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Search, MapPin, TrendingUp, Sparkles, ShieldCheck, CheckCircle2, Users } from 'lucide-react';
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
        users: oCount ? `${oCount * 12}+` : '5k+', // Multiplying orders as a proxy for active users
        experts: sCount ? `${sCount} Experts` : 'Verified Experts',
        orders: oCount ? `${oCount} Orders` : 'Lowest Commission'
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
        </div>
      </div>
    </section>
  );
};

export default Hero;
