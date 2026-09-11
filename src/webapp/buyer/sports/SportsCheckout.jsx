import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Calendar, Shield, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from '../../../LanguageContext';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
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
  const { t } = useTranslation();

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

  // Load Razorpay checkout script dynamically (must be before any early return)
  useEffect(() => {
    if (!document.getElementById('rzp-script')) {
      const script = document.createElement('script');
      script.id = 'rzp-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

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
    let primaryBooking = null; // hoisted so catch block can rollback on failure
    try {
      const token = localStorage.getItem('passwala_token') || '';
      const payload = {
        venue_id:   venue.id,
        slot_ids:   slots.map(s => s.id),
        sport_type: sport,
        user_id:    userInfo?.id || userInfo?.user_id || userInfo?.uid || null,
        user_phone: (userInfo?.phoneNumber || userInfo?.phone || userInfo?.mobile || '').replace(/\D/g,'').slice(-10) || null,
        user_name:  userInfo?.displayName || userInfo?.full_name || userInfo?.name || 'Guest',
        user_email: userInfo?.email || null,
      };

      // Step 1: Create a pending booking in the database
      const bookRes = await fetch(`${BASE_URL}/api/sports/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const bookData = await bookRes.json();
      if (!bookRes.ok) throw new Error(bookData.error || 'Booking failed');

      primaryBooking = bookData.booking;
      const allBookings = bookData.bookings || [primaryBooking];

      // Step 2: If amount is 0, skip payment
      if (amounts.total === 0) {
        toast.success('🎉 Booking confirmed successfully!');
        navigate('/sports/ticket', { state: { booking: primaryBooking, bookings: allBookings, venue, slots, sport } });
        return;
      }

      // Step 3: Create Razorpay order on backend
      const rzpRes = await fetch(`${BASE_URL}/api/orders/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: amounts.total,
          orderId: primaryBooking.id,
        }),
      });
      const rzpData = await rzpRes.json();
      
      // If payment gateway fails to initialize, throw so catch block can rollback the booking
      if (!rzpRes.ok) throw new Error(rzpData.error || 'Payment gateway error');

      // Step 4: Handle mock mode (no real Razorpay)
      if (rzpData.is_mock) {
        toast.success('🎉 Booking confirmed successfully!');
        navigate('/sports/ticket', { state: { booking: primaryBooking, bookings: allBookings, venue, slots, sport } });
        return;
      }

      // Step 5: Open Razorpay payment popup
      const options = {
        key: rzpData.key_id,
        amount: rzpData.amount,
        currency: rzpData.currency || 'INR',
        name: 'Passwala',
        description: `Court booking at ${venue.name}`,
        order_id: rzpData.id,
        prefill: {
          name:  userInfo?.displayName || userInfo?.full_name || '',
          email: userInfo?.email || '',
          contact: (userInfo?.phoneNumber || userInfo?.phone || '').replace(/\D/g, '').slice(-10),
        },
        theme: { color: '#f97316' },
        handler: async (response) => {
          try {
            // Step 6: Verify payment signature on backend
            const verifyRes = await fetch(`${BASE_URL}/api/orders/payment/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_signature:  response.razorpay_signature,
                orderId: primaryBooking.id,
                type: 'sports'
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) throw new Error('Payment verification failed');

            toast.success('🎉 Booking confirmed successfully!');
            navigate('/sports/ticket', { state: { booking: primaryBooking, bookings: allBookings, venue, slots, sport } });
          } catch (verifyErr) {
            toast.error(verifyErr.message || 'Payment verification failed');
            // Rollback on verification failure
            await fetch(`${BASE_URL}/api/sports/cancel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ booking_id: primaryBooking.id, reason: 'Payment Verification Failed' })
            }).catch(() => {});
            setBooking(false);
          }
        },
        modal: {
          ondismiss: async () => {
            toast('Payment cancelled. Releasing your slot...', { icon: '⚠️' });
            // Rollback on dismiss
            await fetch(`${BASE_URL}/api/sports/cancel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ booking_id: primaryBooking.id, reason: 'User Cancelled Payment' })
            }).catch(() => {});
            setBooking(false);
          },
        },
      };

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded. Please refresh and try again.');
      }
      const rzp = new window.Razorpay(options);
      rzp.open();
      // Don't set booking to false here — it'll be set in handler/ondismiss
      return;
    } catch (err) {
      toast.error(err.message || 'Booking failed. Please try again.');
      // If we made it far enough to have a booking but Razorpay failed, rollback
      if (primaryBooking?.id) {
         await fetch(`${BASE_URL}/api/sports/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: primaryBooking.id, reason: 'Payment Initialization Error' })
         }).catch(() => {});
      }
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
        <h2 className="sc-title">{t('confirm_booking')}</h2>
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
              <span className="sc-detail-label"><Zap size={13} /> {t('sport_type')}</span>
              <span className="sc-detail-val">{SPORT_LABELS[sport] || sport}</span>
            </div>
            <div className="sc-detail-row">
              <span className="sc-detail-label"><Calendar size={13} /> {t('slot_date')}</span>
              <span className="sc-detail-val">{dateFormatted}</span>
            </div>
            <div className="sc-detail-row">
              <span className="sc-detail-label"><Clock size={13} /> {t('slot_time')} ({slots.length})</span>
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
          <h3 className="sc-amount-title">{t('price_breakdown')}</h3>
          <div className="sc-amount-rows">
            <div className="sc-amount-row">
              <span>{t('slots_total_price')}</span>
              <span>₹{amounts.base}</span>
            </div>
            <div className="sc-amount-row">
              <span>{t('platform_fee')} (5%)</span>
              <span>₹{amounts.platFee}</span>
            </div>
            <div className="sc-amount-row">
              <span>GST on Fee (18%)</span>
              <span>₹{amounts.gst}</span>
            </div>
            <div className="sc-amount-divider" />
            <div className="sc-amount-row total">
              <span>{t('total')}</span>
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
          <span className="sc-footer-label">{t('total')}</span>
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
            t('confirm_pay')
          )}
        </button>
      </div>
    </div>
  );
};

export default SportsCheckout;
