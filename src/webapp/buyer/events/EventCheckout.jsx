import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Receipt, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { checkBookingWindow } from '../../../utils/checkBookingWindow';

const BASE_URL = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);


// Extract the best identifiers from any user-shaped object
const extractIds = (obj) => {
  if (!obj) return {};
  return {
    id:    obj.id    || obj.user_id  || null,
    uid:   obj.uid   || obj.firebase_uid || null,
    phone: (obj.phoneNumber || obj.phone || obj.mobile || '').replace(/\D/g, '').slice(-10) || null,
    email: obj.email || null,
  };
};

// Read every possible localStorage source and merge
const readAllLocalSources = () => {
  const sources = ['passwala_user', 'manualUser', 'local_user_profile'];
  for (const key of sources) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const ids = extractIds(parsed);
        if (ids.id || ids.uid || ids.phone || ids.email) return ids;
      }
    } catch (_) {}
  }
  return {};
};

const EventCheckout = ({ user: routeUser }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { event, user: stateUser } = location.state || {};

  // Merge identifiers from ALL sources: prop → state → localStorage
  const bestIds = React.useMemo(() => {
    const fromProp  = extractIds(routeUser);
    const fromState = extractIds(stateUser);
    const fromLocal = readAllLocalSources();
    // Merge: prefer non-null from each source in priority order
    return {
      id:    fromProp.id    || fromState.id    || fromLocal.id    || null,
      uid:   fromProp.uid   || fromState.uid   || fromLocal.uid   || null,
      phone: fromProp.phone || fromState.phone || fromLocal.phone || null,
      email: fromProp.email || fromState.email || fromLocal.email || null,
    };
  }, [routeUser, stateUser]);

  const [resolvedDbId, setResolvedDbId] = useState(bestIds.id || null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (resolvedDbId) return; // already have UUID

    const { uid, phone, email } = bestIds;
    if (!uid && !phone && !email) return; // nothing to look up with

    setResolving(true);
    fetch(`${BASE_URL}/api/events/resolve-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, phone, email })
    })
      .then(r => r.json())
      .then(data => {
        if (data?.id) {
          setResolvedDbId(data.id);
          // Patch localStorage so future visits don't need re-resolve
          try {
            const stored = JSON.parse(localStorage.getItem('passwala_user') || '{}');
            if (!stored.id) {
              stored.id = data.id;
              localStorage.setItem('passwala_user', JSON.stringify(stored));
            }
          } catch (_) {}
        }
      })
      .catch(() => {})
      .finally(() => setResolving(false));
  }, [bestIds, resolvedDbId]);

  const [selectedTierId, setSelectedTierId] = useState(
    event?.event_ticket_tiers?.length > 0 ? event.event_ticket_tiers[0].id : null
  );
  const [ticketCount, setTicketCount] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!event) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Invalid checkout state.</p>
        <button onClick={() => navigate('/events')}>Back to Events</button>
      </div>
    );
  }

  const selectedTier = event.event_ticket_tiers?.find(t => t.id === selectedTierId);
  const baseAmount = (selectedTier?.price || 0) * ticketCount;
  
  // Gujarat GST calculation
  const cgstAmount = Number((baseAmount * 0.09).toFixed(2));
  const sgstAmount = Number((baseAmount * 0.09).toFixed(2));
  const totalAmount = baseAmount + cgstAmount + sgstAmount;

  // Booking window check for selected tier
  const bookingWindow = checkBookingWindow(selectedTier);
  const bookingClosed = !bookingWindow.open;

  const handleBookTicket = async () => {
    if (!selectedTier) return;

    if (resolving) {
      toast.error('Still loading your account info, please wait...');
      return;
    }

    if (ticketCount > selectedTier.available_seats) {
      toast.error(`Only ${selectedTier.available_seats} seats available in this tier.`);
      return;
    }

    // Use bestIds (merged from all sources) for server lookup
    const { uid, phone, email } = bestIds;

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/events/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:    resolvedDbId || null,
          userPhone: phone || null,
          userUid:   uid   || null,
          userEmail: email || null,
          eventId:   event.id,
          tierId:    selectedTier.id,
          ticketCount
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Cache the resolved UUID for future use
      if (data.booking?.user_id) {
        setResolvedDbId(data.booking.user_id);
        try {
          const stored = JSON.parse(localStorage.getItem('passwala_user') || '{}');
          stored.id = data.booking.user_id;
          localStorage.setItem('passwala_user', JSON.stringify(stored));
        } catch (_) {}
      }

      toast.success('Event Tickets Booked Successfully!');
      navigate('/events/ticket', { state: { booking: { ...data.booking, fromCheckout: true }, event, tier: selectedTier } });
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error booking tickets');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-surface)', minHeight: '100vh', paddingBottom: '100px' }}>
      <div style={{ background: 'white', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Confirm Booking</h2>
      </div>

      {/* Booking Closed Banner */}
      {bookingClosed && (
        <div style={{
          margin: '1rem 1.5rem 0',
          background: 'rgba(239,68,68,0.08)',
          border: '1.5px solid rgba(239,68,68,0.25)',
          borderRadius: '16px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertTriangle size={22} color="#ef4444" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontWeight: 800, color: '#ef4444', fontSize: '0.95rem' }}>Booking Window Closed</p>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#b91c1c' }}>{bookingWindow.reason || 'This event is no longer accepting bookings.'}</p>
          </div>
        </div>
      )}

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Event Summary */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, color: 'var(--secondary)' }}>{event.title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
            <Calendar size={16} /> {new Date(event.event_date).toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <MapPin size={16} /> {event.venue_name}
          </div>
        </div>

        {/* Tier Selection */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>Select Category</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {event.event_ticket_tiers?.map(tier => {
              const tierWindow = checkBookingWindow(tier);
              const tierClosed = !tierWindow.open;
              return (
              <div 
                key={tier.id}
                onClick={() => !tierClosed && setSelectedTierId(tier.id)}
                style={{
                  border: `2px solid ${selectedTierId === tier.id ? 'var(--primary)' : (tierClosed ? '#e2e8f0' : 'var(--border-light)')}`,
                  background: tierClosed ? '#f8fafc' : (selectedTierId === tier.id ? 'var(--primary-light)' : 'transparent'),
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: tierClosed ? 'not-allowed' : 'pointer',
                  opacity: tierClosed ? 0.55 : 1
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: tierClosed ? '#94a3b8' : (selectedTierId === tier.id ? 'var(--primary)' : 'var(--secondary)') }}>
                    {tier.tier_name}
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: tier.available_seats < 10 ? 'red' : 'var(--text-muted)' }}>
                    {tier.available_seats} seats left
                  </span>
                  {tierClosed && (
                    <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {tierWindow.reason || 'Booking closed'}
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: tierClosed ? '#94a3b8' : 'inherit' }}>₹{tier.price}</div>
              </div>
            );
            })}
          </div>

          {selectedTier && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>No. of Tickets</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--bg-surface)', padding: '5px 15px', borderRadius: '20px' }}>
                <button 
                  onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                  style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--primary)' }}
                >-</button>
                <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{ticketCount}</span>
                <button 
                  onClick={() => setTicketCount(Math.min(selectedTier.available_seats, ticketCount + 1))}
                  style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--primary)' }}
                >+</button>
              </div>
            </div>
          )}
        </div>

        {/* Invoice Summary */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={18} /> Tax Invoice Summary
          </h4>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Base Price ({ticketCount} x ₹{selectedTier?.price || 0})</span>
            <span style={{ fontWeight: 600 }}>₹{baseAmount}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>CGST (9%)</span>
            <span style={{ fontWeight: 600 }}>₹{cgstAmount}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>SGST (9%)</span>
            <span style={{ fontWeight: 600 }}>₹{sgstAmount}</span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed var(--border-light)', margin: '1rem 0' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Total Payable</span>
            <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--primary)' }}>₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

      </div>

      {/* Fixed Bottom Bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', padding: '1rem 1.5rem', boxShadow: '0 -10px 20px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Amount</p>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>₹{totalAmount.toFixed(2)}</h3>
        </div>
        <button 
          onClick={handleBookTicket}
          disabled={loading || !selectedTier || bookingClosed}
          style={{ 
            background: bookingClosed ? '#94a3b8' : 'var(--primary)', 
            color: 'white', 
            border: 'none', 
            padding: '1rem 2rem', 
            borderRadius: '14px', 
            fontWeight: 800, 
            fontSize: '1rem', 
            cursor: (loading || bookingClosed) ? 'not-allowed' : 'pointer', 
            opacity: (loading || !selectedTier) ? 0.7 : 1,
            width: '50%' 
          }}
        >
          {loading ? 'Processing...' : (bookingClosed ? 'Booking Closed' : 'Pay & Book')}
        </button>
      </div>
    </div>
  );
};

export default EventCheckout;
