import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

const SportsHub = ({ user }) => {
  const navigate = useNavigate();
  const [activeSport, setActiveSport] = useState('all');
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const abortRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

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

  const getMinPrice = (venue) => {
    const prices = Object.values(venue.price_per_hour || {});
    if (!prices.length) return null;
    return Math.min(...prices);
  };

  return (
    <div className="sh-root">
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

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="sh-search-bar"
          >
            <Search size={18} className="sh-search-icon" />
            <input
              type="text"
              placeholder="Search venues, areas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="sh-search-input"
            />
            {search && (
              <button className="sh-search-clear" onClick={() => setSearch('')}>
                <X size={16} />
              </button>
            )}
          </motion.div>
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
        {loading ? (
          <div className="sh-loading">
            {[1,2,3].map(i => (
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
                const minPrice = getMinPrice(venue);
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
                      {/* Sport pills */}
                      <div className="sh-venue-sports-row">
                        {(venue.sport_types || []).slice(0, 3).map(s => {
                          const sp = SPORT_TYPES.find(t => t.id === s);
                          return (
                            <span key={s} className="sh-venue-sport-pill">
                              {sp?.emoji} {sp?.label || s}
                            </span>
                          );
                        })}
                        {(venue.sport_types?.length || 0) > 3 && (
                          <span className="sh-venue-sport-pill">+{venue.sport_types.length - 3}</span>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="sh-venue-info">
                      <div className="sh-venue-name-row">
                        <h3 className="sh-venue-name">{venue.name}</h3>
                        {venue.rating > 0 && (
                          <span className="sh-venue-rating">
                            <Star size={12} fill="currentColor" /> {venue.rating.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <div className="sh-venue-location">
                        <MapPin size={13} />
                        <span>{venue.address || venue.city}</span>
                      </div>

                      <div className="sh-venue-meta-row">
                        <div className="sh-venue-hours">
                          <Clock size={13} />
                          <span>{(venue.open_time || '06:00').slice(0,5)} – {(venue.close_time || '22:00').slice(0,5)}</span>
                        </div>
                        {(venue.amenities || []).slice(0, 2).map(a => (
                          <span key={a} className="sh-amenity-pill">
                            {AMENITY_ICONS[a] || '✓'} {a}
                          </span>
                        ))}
                      </div>

                      <div className="sh-venue-footer">
                        {minPrice && (
                          <div className="sh-venue-price">
                            <span className="sh-price-from">From</span>
                            <span className="sh-price-val">₹{minPrice}</span>
                            <span className="sh-price-per">/hr</span>
                          </div>
                        )}
                        <button className="sh-book-btn">
                          Book Now <ChevronRight size={16} />
                        </button>
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
