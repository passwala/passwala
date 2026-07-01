import React, { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { CheckCircle, MapPin, Calendar, Clock, Download, Home } from 'lucide-react';
import './SportsTicket.css';

const SPORT_LABELS = {
  box_cricket:'Box Cricket', badminton:'Badminton', turf:'Football Turf',
  cricket_net:'Cricket Net', pickleball:'Pickleball', table_tennis:'Table Tennis',
  padel:'Padel', tennis:'Tennis', snooker:'Snooker', pool:'Pool / Billiards', cricket:'Cricket',
};

const SPORT_EMOJI = {
  box_cricket:'🏏', badminton:'🏸', turf:'⚽', cricket_net:'🎯', pickleball:'🥒',
  table_tennis:'🏓', padel:'🎾', tennis:'🎾', snooker:'🎱', pool:'🎱', cricket:'🏏',
};

const SportsTicket = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const ticketRef = useRef(null);
  const { booking, bookings: stateBookings, venue, _slot, sport } = location.state || {};

  const bookings = stateBookings && Array.isArray(stateBookings) && stateBookings.length > 0
    ? stateBookings 
    : (booking ? [booking] : []);

  const [activeTicketIdx, setActiveTicketIdx] = React.useState(0);

  const activeBooking = bookings[activeTicketIdx] || booking;

  if (!activeBooking) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
        <p>No ticket found.</p>
        <button onClick={() => navigate('/sports')} style={{ color: '#f97316', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Browse Venues →</button>
      </div>
    );
  }

  const dateFormatted = activeBooking.slot_date
    ? new Date(activeBooking.slot_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  // Simple QR code display using a QR service
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(activeBooking.qr_code || 'INVALID')}`;

  const totalPaid = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

  return (
    <div className="st-root">
      {/* Success Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="st-success-header"
      >
        <div className="st-hero-bg" />
        <div className="st-success-icon">
          <CheckCircle size={48} strokeWidth={2} />
        </div>
        <h1 className="st-success-title">Booking Confirmed!</h1>
        <p className="st-success-sub">Your court is booked. Show this QR at the venue.</p>
      </motion.div>

      {/* Ticket Selector for multiple bookings */}
      {bookings.length > 1 && (
        <div className="st-ticket-selector" style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '0 16px 16px 16px', justifyContent: 'center', maxWidth: '400px', margin: '0 auto' }}>
          {bookings.map((b, idx) => (
            <button
              key={b.id || idx}
              onClick={() => setActiveTicketIdx(idx)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: idx === activeTicketIdx ? '2px solid #f97316' : '1px solid #cbd5e1',
                background: idx === activeTicketIdx ? '#fff7ed' : 'white',
                color: idx === activeTicketIdx ? '#f97316' : '#475569',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: idx === activeTicketIdx ? '0 4px 12px rgba(249, 115, 22, 0.15)' : 'none'
              }}
            >
              {(b.slot_time||'').slice(0,5)}
            </button>
          ))}
        </div>
      )}

      {/* Ticket Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="st-ticket"
        ref={ticketRef}
      >
        {/* Ticket Top */}
        <div className="st-ticket-top">
          <div className="st-sport-icon">{SPORT_EMOJI[sport] || '🏅'}</div>
          <div>
            <div className="st-sport-label">{SPORT_LABELS[sport] || sport}</div>
            <div className="st-venue-name">{activeBooking.venue_name || venue?.name}</div>
          </div>
          <div className="st-invoice-badge">#{activeBooking.invoice_number?.split('-').pop()}</div>
        </div>

        {/* Ticket Details */}
        <div className="st-ticket-details">
          <div className="st-ticket-row">
            <div className="st-ticket-cell">
              <span className="st-cell-label"><Calendar size={12} /> Date</span>
              <span className="st-cell-val">{dateFormatted}</span>
            </div>
          </div>
          <div className="st-ticket-row">
            <div className="st-ticket-cell">
              <span className="st-cell-label"><Clock size={12} /> Time Slot</span>
              <span className="st-cell-val">{(activeBooking.slot_time||'').slice(0,5)} – {(activeBooking.slot_end_time||'').slice(0,5)}</span>
            </div>
            <div className="st-ticket-cell">
              <span className="st-cell-label">Duration</span>
              <span className="st-cell-val">{activeBooking.duration_mins || 60} min</span>
            </div>
          </div>
          <div className="st-ticket-row">
            <div className="st-ticket-cell">
              <span className="st-cell-label"><MapPin size={12} /> Venue</span>
              <span className="st-cell-val">{activeBooking.venue_address || venue?.address || activeBooking.venue_city || venue?.city}</span>
            </div>
          </div>
        </div>

        {/* Tear Line */}
        <div className="st-tear-line">
          <div className="st-tear-dot left" />
          <div className="st-tear-dashes" />
          <div className="st-tear-dot right" />
        </div>

        {/* QR Section */}
        <div className="st-qr-section">
          <div className="st-qr-wrap">
            <img src={qrUrl} alt="QR Code" className="st-qr-img" />
          </div>
          <div className="st-qr-code-text">{activeBooking.qr_code}</div>
          <div className="st-qr-hint">Show this QR code at the venue entrance</div>
        </div>

        {/* Amount */}
        <div className="st-ticket-amount">
          <span className="st-amount-label">{bookings.length > 1 ? 'Total Paid (All Slots)' : 'Total Paid'}</span>
          <span className="st-amount-val">₹{bookings.length > 1 ? totalPaid : activeBooking.total_amount}</span>
        </div>

        {/* Status Badge */}
        <div className="st-status-badge">✅ CONFIRMED</div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="st-actions"
      >
        <button className="st-action-btn secondary" onClick={() => navigate('/sports')}>
          <Home size={16} /> Book Another
        </button>
        <button className="st-action-btn primary" onClick={() => navigate('/')}>
          Back to Home
        </button>
      </motion.div>
    </div>
  );
};

export default SportsTicket;
