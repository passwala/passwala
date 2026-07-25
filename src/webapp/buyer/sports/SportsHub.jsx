import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Star, Clock, ChevronRight, Zap, Filter, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './SportsHub.css';

const BASE_URL = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);

const SPORT_TYPES = [
  { id: 'all',          label: 'All Sports',    emoji: '🏅' },
  { id: 'box_cricket',  label: 'Box Cricket',   emoji: '🏏' },
  { id: 'badminton',    label: 'Badminton',      emoji: '🏸' },
  { id: 'turf',         label: 'Football Turf',  emoji: '⚽' },
  { id: 'cricket_net',  label: 'Cricket Net',    emoji: '🎯' },
  { id: 'pickleball',   label: 'Pickleball',     emoji: '🥒' },
  { id: 'table_tennis', label: 'Table Tennis',   emoji: '🏓' },
  { id: 'padel',        label: 'Padel',          emoji: '🎾' },
  { id: 'tennis',       label: 'Tennis',         emoji: '🎾' },
  { id: 'snooker',      label: 'Snooker',        emoji: '🎱' },
  { id: 'pool',         label: 'Pool / Billiards',emoji: '🎱' },
  { id: 'cricket',      label: 'Cricket',        emoji: '🏏' },
];

const AMENITY_ICONS = {
  'Parking': '🅿️', 'Washroom': '🚿', 'Drinking Water': '💧',
  'Changing Room': '👕', 'AC': '❄️', 'Lighting': '💡',
  'Cafeteria': '☕', 'First Aid': '🩺',
};

const SportsHub = ({ user, userCoords }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSport, setActiveSport] = useState('all');
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const abortRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get('q') || '');
  }, [location.search]);


  // Haversine helper
  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchVenues = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sport: activeSport,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res = await fetch(`${BASE_URL}/api/sports/venues?${params}`, {
        signal: abortRef.current.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVenues(data.venues || []);
    } catch (err) {
      if (err.name === 'AbortError') return;
      toast.error('Failed to load venues');
    } finally {
      setLoading(false);
    }
  }, [activeSport, debouncedSearch]);

  useEffect(() => { fetchVenues(); }, [fetchVenues]);


  return (
    <div className="sh-root">
      {/* ── BMS Style Sub-Navbar ── */}
      <div className="bms-subnav">
        <div className="bms-subnav-inner">
          <div className="bms-subnav-links-left">
            <span className={window.location.pathname.startsWith('/events') ? 'active' : ''} onClick={() => navigate('/events')}>Events</span>
            <span className={window.location.pathname.startsWith('/sports') ? 'active' : ''} onClick={() => navigate('/sports')}>Sports</span>
          </div>
          <div className="bms-subnav-links-right">
            <span onClick={() => navigate('/admin/auth')}>ListYourShow</span>
            <span onClick={() => navigate('/offers')}>Offers</span>
            <span onClick={() => navigate('/gift-cards')}>Gift Cards</span>
          </div>
        </div>
      </div>

      {/* ── Hero Header ── */}
      <div className="sh-hero">
        <div className="sh-hero-bg" />
        <div className="sh-hero-content">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sh-hero-badge"
          >
            <Zap size={12} fill="currentColor" /> Book a Court
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="sh-hero-title"
          >
            Sports Venues<br />Near You 🏏
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="sh-hero-sub"
          >
            Book cricket, badminton, turf & more — instant confirmation
          </motion.p>

        </div>
      </div>

      {/* ── Sport Type Filter Chips ── */}
      <div className="sh-filter-row">
        <div className="sh-filter-scroll">
          {SPORT_TYPES.map((sport) => (
            <button
              key={sport.id}
              className={`sh-chip ${activeSport === sport.id ? 'active' : ''}`}
              onClick={() => setActiveSport(sport.id)}
            >
              <span className="sh-chip-emoji">{sport.emoji}</span>
              {sport.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Venue List ── */}
      <div className="sh-body">
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem', paddingLeft: '4px' }}>All Sports Venues</h2>
        
        {loading ? (
          <div className="sh-loading">
            {[1,2,3,4].map(i => (
              <div key={i} className="sh-skeleton-card">
                <div className="sh-skeleton-img" />
                <div className="sh-skeleton-body">
                  <div className="sh-skeleton-line w-60" />
                  <div className="sh-skeleton-line w-40" />
                  <div className="sh-skeleton-line w-80" />
                </div>
              </div>
            ))}
          </div>
        ) : venues.length === 0 ? (
          <div className="sh-empty">
            <div className="sh-empty-icon">🏟️</div>
            <h3>No venues found</h3>
            <p>Try a different sport or area</p>
          </div>
        ) : (
          <div className="sh-venue-grid">
            <AnimatePresence>
              {venues.map((venue, i) => {
                const distance = getDistance(userCoords?.lat, userCoords?.lng, venue.lat, venue.lng);
                return (
                  <motion.div
                    key={venue.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="sh-venue-card"
                    onClick={() => navigate(`/sports/${venue.id}`, { state: { venue, user } })}
                  >
                    {/* Image */}
                    <div className="sh-venue-img-wrap">
                      {venue.images?.[0] ? (
                        <img src={venue.images[0]} alt={venue.name} className="sh-venue-img" />
                      ) : (
                        <div className="sh-venue-img-placeholder">
                          🏟️
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="sh-venue-info" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <h3 className="sh-venue-name" style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                        {venue.name}
                      </h3>

                      <div className="sh-venue-location" style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>
                          {distance ? `${distance.toFixed(1)} km • ` : ''}{venue.city || 'Ahmedabad'}
                        </span>
                      </div>

                      {/* Sport type tags */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {(venue.sport_types || []).map(s => {
                          const sp = SPORT_TYPES.find(t => t.id === s);
                          return (
                            <span key={s} style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                              {sp?.label || s}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default SportsHub;
