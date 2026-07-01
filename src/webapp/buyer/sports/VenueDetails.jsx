import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Clock, Star, ChevronLeft, ChevronRight, Calendar, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './VenueDetails.css';

const BASE_URL = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);

const SPORT_TYPES = {
  box_cricket:  { label: 'Box Cricket',    emoji: '🏏' },
  badminton:    { label: 'Badminton',       emoji: '🏸' },
  turf:         { label: 'Football Turf',   emoji: '⚽' },
  cricket_net:  { label: 'Cricket Net',     emoji: '🎯' },
  pickleball:   { label: 'Pickleball',      emoji: '🥒' },
  table_tennis: { label: 'Table Tennis',    emoji: '🏓' },
  padel:        { label: 'Padel',           emoji: '🎾' },
  tennis:       { label: 'Tennis',          emoji: '🎾' },
  snooker:      { label: 'Snooker',         emoji: '🎱' },
  pool:         { label: 'Pool / Billiards',emoji: '🎱' },
  cricket:      { label: 'Cricket',         emoji: '🏏' },
};

// Generate next 7 days for date picker
const getNext7Days = () => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      dateStr: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: d.getDate(),
    });
  }
  return days;
};

const formatTime12 = (timeStr) => {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}${parseInt(mStr) ? ':' + mStr : ''} ${ampm}`;
};

const formatRange12 = (start, end) => {
  const sParts = formatTime12(start).split(' ');
  const eParts = formatTime12(end).split(' ');
  if (sParts[1] === eParts[1]) {
    return `${sParts[0]} - ${eParts[0]} ${eParts[1]}`;
  }
  return `${sParts[0]} ${sParts[1]} - ${eParts[0]} ${eParts[1]}`;
};

const VenueDetails = ({ user }) => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { venue: preloaded } = location.state || {};

  const [venue, setVenue] = useState(preloaded || null);
  const [selectedSport, setSelectedSport] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getNext7Days()[0].dateStr);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [bookingDuration, setBookingDuration] = useState(1);
  const [timeOfDayFilter, setTimeOfDayFilter] = useState('all');
  const [imgIdx, setImgIdx] = useState(0);
  const abortRef = useRef(null);
  const days = getNext7Days();

  // Fetch venue if not preloaded
  useEffect(() => {
    if (venue) {
      const firstSport = venue.sport_types?.[0] || null;
      setSelectedSport(firstSport);
      return;
    }
    fetch(`${BASE_URL}/api/sports/venues/${id}`)
      .then(r => r.json())
      .then(d => {
        setVenue(d.venue);
        setSelectedSport(d.venue?.sport_types?.[0] || null);
      })
      .catch(() => toast.error('Failed to load venue'));
  }, [id]);

  // Fetch slots when sport/date changes
  const fetchSlots = useCallback(async () => {
    if (!id || !selectedDate || !selectedSport) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoadingSlots(true);
    setSelectedSlots([]);
    try {
      const params = new URLSearchParams({ venue_id: id, date: selectedDate, sport: selectedSport });
      const res = await fetch(`${BASE_URL}/api/sports/slots?${params}`, { signal: abortRef.current.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSlots(data.slots || []);
    } catch (err) {
      if (err.name === 'AbortError') return;
      toast.error('Failed to load slots');
    } finally {
      setLoadingSlots(false);
    }
  }, [id, selectedDate, selectedSport]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  useEffect(() => {
    setSelectedSlots([]);
  }, [bookingDuration]);

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const activeSlots = React.useMemo(() => {
    const todayStr = getTodayStr();
    const isToday = selectedDate === todayStr;
    if (!isToday) return slots;

    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMins = String(now.getMinutes()).padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMins}:00`;

    return slots.filter(s => s.slot_time >= currentTimeStr);
  }, [slots, selectedDate]);

  const combinedSlots = React.useMemo(() => {
    const targetSlots = activeSlots;
    if (bookingDuration === 1) return targetSlots;

    const result = [];
    const sorted = [...targetSlots].sort((a, b) => a.slot_time.localeCompare(b.slot_time));

    for (let i = 0; i <= sorted.length - bookingDuration; i++) {
      let isContiguousAvailable = true;
      const group = [];
      
      for (let j = 0; j < bookingDuration; j++) {
        const currentSlot = sorted[i + j];
        
        if (currentSlot.status !== 'available') {
          isContiguousAvailable = false;
          break;
        }

        if (j > 0) {
          const prevSlot = group[j - 1];
          const prevEnd = prevSlot.slot_end_time.slice(0, 5);
          const currStart = currentSlot.slot_time.slice(0, 5);
          if (prevEnd !== currStart) {
            isContiguousAvailable = false;
            break;
          }
        }
        group.push(currentSlot);
      }

      if (isContiguousAvailable) {
        const first = group[0];
        const last = group[group.length - 1];
        const totalPrice = group.reduce((sum, s) => sum + (s.price || 0), 0);
        
        result.push({
          id: `virtual_${first.id}_to_${last.id}`,
          slot_time: first.slot_time,
          slot_end_time: last.slot_end_time,
          price: totalPrice,
          status: 'available',
          slot_date: first.slot_date,
          slots: group
        });
      }
    }
    return result;
  }, [activeSlots, bookingDuration]);

  const filteredCombinedSlots = React.useMemo(() => {
    if (timeOfDayFilter === 'all') return combinedSlots;
    
    return combinedSlots.filter(slot => {
      const startHour = parseInt(slot.slot_time.split(':')[0]);
      if (timeOfDayFilter === 'morning') {
        return startHour >= 6 && startHour < 12;
      }
      if (timeOfDayFilter === 'evening') {
        return startHour >= 12 && startHour < 18;
      }
      if (timeOfDayFilter === 'night') {
        return startHour >= 18 || startHour < 6;
      }
      return true;
    });
  }, [combinedSlots, timeOfDayFilter]);

  const handleBookNow = () => {
    if (selectedSlots.length === 0) { toast.error('Please select at least one time slot'); return; }
    navigate('/sports/checkout', {
      state: { venue, slots: selectedSlots, slot: selectedSlots[0], sport: selectedSport, user },
    });
  };

  if (!venue) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>Loading venue...</div>
      </div>
    );
  }

  const images = venue.images?.length > 0 ? venue.images : null;
  const _price = venue.price_per_hour?.[selectedSport];

  return (
    <div className="vd-root">
      {/* ── Image Carousel ── */}
      <div className="vd-img-hero">
        {images ? (
          <>
            <img src={images[imgIdx]} alt={venue.name} className="vd-img" />
            {images.length > 1 && (
              <>
                <button className="vd-img-nav left" onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}>
                  <ChevronLeft size={20} />
                </button>
                <button className="vd-img-nav right" onClick={() => setImgIdx(i => (i + 1) % images.length)}>
                  <ChevronRight size={20} />
                </button>
                <div className="vd-img-dots">
                  {images.map((_, i) => (
                    <div key={i} className={`vd-img-dot ${i === imgIdx ? 'active' : ''}`} onClick={() => setImgIdx(i)} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="vd-img-placeholder">🏟️</div>
        )}
      </div>

      {/* ── Venue Info ── */}
      <div className="vd-info-card">
        <div className="vd-name-row">
          <h1 className="vd-name">{venue.name}</h1>
          {venue.rating > 0 && (
            <span className="vd-rating">
              <Star size={14} fill="currentColor" /> {venue.rating.toFixed(1)}
            </span>
          )}
        </div>

        <div className="vd-meta-row">
          <span className="vd-meta-item"><MapPin size={14} />{venue.address || venue.city}</span>
          <span className="vd-meta-item"><Clock size={14} />{(venue.open_time||'06:00').slice(0,5)} – {(venue.close_time||'22:00').slice(0,5)}</span>
        </div>

        {venue.description && (
          <p className="vd-description">{venue.description}</p>
        )}

        {/* Amenities */}
        {(venue.amenities || []).length > 0 && (
          <div className="vd-amenities">
            {venue.amenities.map(a => (
              <span key={a} className="vd-amenity-pill">✓ {a}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── Sport Selector ── */}
      <div className="vd-section">
        <h2 className="vd-section-title">Select Sport</h2>
        <div className="vd-sport-row">
          {(venue.sport_types || []).map(s => {
            const sp = SPORT_TYPES[s];
            return (
              <button
                key={s}
                className={`vd-sport-btn ${selectedSport === s ? 'active' : ''}`}
                onClick={() => setSelectedSport(s)}
              >
                <span className="vd-sport-emoji">{sp?.emoji || '🏅'}</span>
                <span className="vd-sport-label">{sp?.label || s}</span>
                {venue.price_per_hour?.[s] && (
                  <span className="vd-sport-price">₹{venue.price_per_hour[s]}/hr</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Date Selector ── */}
      <div className="vd-section">
        <h2 className="vd-section-title"><Calendar size={16} /> Select Date</h2>
        <div className="vd-date-row">
          {days.map(d => (
            <button
              key={d.dateStr}
              className={`vd-date-btn ${selectedDate === d.dateStr ? 'active' : ''}`}
              onClick={() => setSelectedDate(d.dateStr)}
            >
              <span className="vd-date-day">{d.day}</span>
              <span className="vd-date-num">{d.date}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Time Slots ── */}
      <div className="vd-section vd-slots-section">
        {/* Duration Selector */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          background: '#f8fafc',
          padding: '12px 20px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Duration</h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Duration of the slots</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', borderRadius: '12px', padding: '4px' }}>
            <button 
              onClick={() => setBookingDuration(d => Math.max(1, d - 1))}
              style={{ background: 'none', border: 'none', color: 'white', padding: '6px 12px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', outline: 'none' }}
            >
              —
            </button>
            <span style={{ color: 'white', padding: '0 10px', fontWeight: 800, fontSize: '0.85rem', minWidth: '40px', textAlign: 'center' }}>
              {bookingDuration} hr
            </span>
            <button 
              onClick={() => setBookingDuration(d => Math.min(6, d + 1))}
              style={{ background: 'none', border: 'none', color: 'white', padding: '6px 12px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', outline: 'none' }}
            >
              +
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="vd-section-title" style={{ margin: 0 }}>Available Slots</h2>
        </div>

        {/* Time-of-day filter tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }} className="vd-time-tabs">
          {[
            { id: 'all', label: 'All Slots' },
            { id: 'morning', label: '🌅 Morning (6 AM - 12 PM)' },
            { id: 'evening', label: '🌇 Evening (12 PM - 6 PM)' },
            { id: 'night', label: '🌙 Night (6 PM - 6 AM)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTimeOfDayFilter(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: timeOfDayFilter === tab.id ? '2px solid #f97316' : '1px solid #cbd5e1',
                background: timeOfDayFilter === tab.id ? '#fff7ed' : '#ffffff',
                color: timeOfDayFilter === tab.id ? '#f97316' : '#475569',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loadingSlots ? (
          <div className="vd-slots-loading">
            {[1,2,3,4,5,6].map(i => <div key={i} className="vd-slot-skeleton" />)}
          </div>
        ) : filteredCombinedSlots.length === 0 ? (
          <div className="vd-no-slots">No slots available for this filter & duration</div>
        ) : (
          <div className="vd-slots-grid">
            {filteredCombinedSlots.map(slot => {
              const isSelected = bookingDuration === 1
                ? selectedSlots.some(s => s.id === slot.id)
                : selectedSlots.length > 0 && selectedSlots[0].slot_time === slot.slot_time && selectedSlots[selectedSlots.length - 1].slot_end_time === slot.slot_end_time;
              
              return (
                <button
                  key={slot.id}
                  className={`vd-slot-btn ${slot.status !== 'available' ? 'booked' : ''} ${isSelected ? 'selected' : ''}`}
                  disabled={slot.status !== 'available'}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.25rem 1rem',
                    gap: '4px',
                    height: 'auto',
                    background: isSelected ? '#f97316' : '#ffffff',
                    borderColor: isSelected ? '#f97316' : '#e2e8f0',
                    outline: 'none',
                    boxShadow: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    if (slot.status !== 'available') return;
                    if (bookingDuration === 1) {
                      setSelectedSlots(prev => {
                        const exists = prev.some(s => s.id === slot.id);
                        if (exists) {
                          return prev.filter(s => s.id !== slot.id);
                        }
                        return [...prev, slot].sort((a, b) => (a.slot_time || '').localeCompare(b.slot_time || ''));
                      });
                    } else {
                      setSelectedSlots(isSelected ? [] : slot.slots);
                    }
                  }}
                >
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: isSelected ? '#ffffff' : '#0f172a' }}>
                    {formatRange12(slot.slot_time, slot.slot_end_time)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: isSelected ? 'rgba(255,255,255,0.9)' : '#64748b', fontWeight: 600 }}>
                    1 court • ₹{slot.price}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Book Bar ── */}
      {selectedSlots.length > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="vd-book-bar"
        >
          <div className="vd-book-bar-info">
            <div className="vd-book-bar-time">
              {selectedSlots.length === 1 
                ? `${(selectedSlots[0].slot_time||'').slice(0,5)} – ${(selectedSlots[0].slot_end_time||'').slice(0,5)}`
                : `${selectedSlots.length} Slots Selected`
              }
            </div>
            <div className="vd-book-bar-price">
              ₹{selectedSlots.reduce((sum, s) => sum + (s.price || 0), 0)} <span>total</span>
            </div>
          </div>
          <button className="vd-book-bar-btn" onClick={handleBookNow}>
            Book Now →
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default VenueDetails;
