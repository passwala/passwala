import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Calendar, Shield, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './SportsCheckout.css';

const BASE_URL = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);

const PLATFORM_FEE_PERCENT = 0.05;
const GST_RATE = 0.18;

const SPORT_LABELS = {
  box_cricket:'Box Cricket', badminton:'Badminton', turf:'Football Turf',
  cricket_net:'Cricket Net', pickleball:'Pickleball', table_tennis:'Table Tennis',
  padel:'Padel', tennis:'Tennis', snooker:'Snooker', pool:'Pool / Billiards', cricket:'Cricket',
};

// Extract user identifiers from all sources
const getUserInfo = (user) => {
  if (!user) {
    try {
      const raw = localStorage.getItem('passwala_user');
      if (raw) return JSON.parse(raw);
    } catch (_) {
      // Ignore parsing errors
    }
    return {};
  }
  return user;
};

const SportsCheckout = ({ user: routeUser }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { venue, slot, slots: stateSlots, sport, user: stateUser } = location.state || {};
  const user = routeUser || stateUser;

  const [booking, setBooking] = useState(false);

  const userInfo = useMemo(() => getUserInfo(user), [user]);

  const slots = useMemo(() => {
    if (stateSlots && Array.isArray(stateSlots) && stateSlots.length > 0) {
      return stateSlots;
    }
    return slot ? [slot] : [];
  }, [stateSlots, slot]);

  const amounts = useMemo(() => {
    const base    = slots.reduce((sum, s) => sum + (s.price || 0), 0);
    const platFee = Math.round(base * PLATFORM_FEE_PERCENT);
    const gst     = Math.round(platFee * GST_RATE);
    const total   = base + platFee + gst;
    return { base, platFee, gst, total };
  }, [slots]);

  if (!venue || slots.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
        <p>No booking data found.</p>
        <button onClick={() => navigate('/sports')} style={{ color: '#f97316', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
          Browse Venues →
        </button>
      </div>
    );
  }

  const handleConfirm = async () => {
    if (booking) return;
    setBooking(true);
    try {
      const payload = {
        venue_id:   venue.id,
        slot_ids:   slots.map(s => s.id),
        sport_type: sport,
        user_id:    userInfo?.id || userInfo?.user_id || userInfo?.uid || null,
        user_phone: (userInfo?.phoneNumber || userInfo?.phone || userInfo?.mobile || '').replace(/\D/g,'').slice(-10) || null,
        user_name:  userInfo?.displayName || userInfo?.full_name || userInfo?.name || 'Guest',
        user_email: userInfo?.email || null,
      };

      const res = await fetch(`${BASE_URL}/api/sports/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Booking failed');

      toast.success('🎉 Booking confirmed successfully!');
      navigate('/sports/ticket', { state: { booking: data.booking, bookings: data.bookings, venue, slots, sport } });
    } catch (err) {
      toast.error(err.message || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  const primarySlot = slots[0] || {};
  const dateFormatted = primarySlot.slot_date
    ? new Date(primarySlot.slot_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  return (
    <div className="sc-root">
      {/* Header */}
      <div className="sc-header">
        <button className="sc-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="sc-title">Confirm Booking</h2>
      </div>

      <div className="sc-body">
        {/* Venue summary card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sc-venue-card"
        >
          <div className="sc-venue-header">
            <div className="sc-venue-emoji">🏟️</div>
            <div className="sc-venue-text">
              <h3 className="sc-venue-name">{venue.name}</h3>
              {venue.address && (
                <p className="sc-venue-addr"><MapPin size={12} /> {venue.address}</p>
              )}
            </div>
          </div>

          <div className="sc-booking-details">
            <div className="sc-detail-row">
              <span className="sc-detail-label"><Zap size={13} /> Sport</span>
              <span className="sc-detail-val">{SPORT_LABELS[sport] || sport}</span>
            </div>
            <div className="sc-detail-row">
              <span className="sc-detail-label"><Calendar size={13} /> Date</span>
              <span className="sc-detail-val">{dateFormatted}</span>
            </div>
            <div className="sc-detail-row">
              <span className="sc-detail-label"><Clock size={13} /> Slots ({slots.length})</span>
              <span className="sc-detail-val" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {slots.map(s => (
                  <span key={s.id}>{(s.slot_time||'').slice(0,5)} – {(s.slot_end_time||'').slice(0,5)}</span>
                ))}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Amount Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="sc-amount-card"
        >
          <h3 className="sc-amount-title">Price Breakdown</h3>
          <div className="sc-amount-rows">
            <div className="sc-amount-row">
              <span>Slots Total Price</span>
              <span>₹{amounts.base}</span>
            </div>
            <div className="sc-amount-row">
              <span>Platform Fee (5%)</span>
              <span>₹{amounts.platFee}</span>
            </div>
            <div className="sc-amount-row">
              <span>GST on Fee (18%)</span>
              <span>₹{amounts.gst}</span>
            </div>
            <div className="sc-amount-divider" />
            <div className="sc-amount-row total">
              <span>Total Amount</span>
              <span>₹{amounts.total}</span>
            </div>
          </div>
        </motion.div>

        {/* Cancellation Policy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="sc-policy-card"
        >
          <Shield size={16} />
          <div>
            <div className="sc-policy-title">Free Cancellation</div>
            <div className="sc-policy-sub">Cancel before the slot time for a full refund</div>
          </div>
        </motion.div>
      </div>

      {/* Confirm Button */}
      <div className="sc-footer">
        <div className="sc-footer-price">
          <span className="sc-footer-label">Total</span>
          <span className="sc-footer-amt">₹{amounts.total}</span>
        </div>
        <button
          className={`sc-confirm-btn ${booking ? 'loading' : ''}`}
          onClick={handleConfirm}
          disabled={booking}
        >
          {booking ? (
            <span className="sc-spinner" />
          ) : (
            'Confirm & Pay'
          )}
        </button>
      </div>
    </div>
  );
};

export default SportsCheckout;
