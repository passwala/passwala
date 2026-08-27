import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Users, IndianRupee, CheckCircle, XCircle, Loader, Bike } from 'lucide-react';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3004'}/api/city-rides`;


function RiderRideBookings({ user, riderId }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const getDriverId = () => {
    return user?.id || user?.uid || user?.user_id || riderId;
  };

  const fetchBookings = async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const driverId = getDriverId();
      if (!driverId) { 
        setLoading(false); 
        return; 
      }

      const res = await fetch(`${API_BASE}/driver-bookings?driverId=${encodeURIComponent(driverId)}`);
      const json = await res.json();

      if (json.success) {
        setBookings(json.bookings || []);
      } else {
        console.error('driver-bookings error:', json.error);
        setBookings([]);
      }
    } catch (err) {
      console.error('Fetch driver bookings error:', err);
      setBookings([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const driverId = user?.id || user?.uid || user?.user_id || riderId;
        if (!driverId) {
          if (active) setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/driver-bookings?driverId=${encodeURIComponent(driverId)}`);
        const json = await res.json();

        if (active && json.success) {
          setBookings(json.bookings || []);
        }
      } catch (err) {
        console.error('Fetch driver bookings error in effect:', err);
      }
      if (active) {
        setLoading(false);
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [user, riderId]);

  const handleComplete = async (bookingId) => {
    try {
      const res = await fetch(`${API_BASE}/driver-update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, status: 'COMPLETED' })
      });
      const json = await res.json();
      if (json.success) {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'COMPLETED' } : b));
      }
    } catch (err) {
      console.error('Complete ride error:', err);
    }
  };

  const handleCancel = async (bookingId) => {
    try {
      const res = await fetch(`${API_BASE}/driver-update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, status: 'CANCELLED' })
      });
      const json = await res.json();
      if (json.success) {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'CANCELLED' } : b));
      }
    } catch (err) {
      console.error('Cancel ride error:', err);
    }
  };

  const filtered = filter === 'ALL' ? bookings : bookings.filter(b => b.status === filter);

  const statusColor = (s) => {
    if (s === 'CONFIRMED') return { bg: 'rgba(255,118,34,0.1)', color: '#ff7622' };
    if (s === 'COMPLETED') return { bg: 'rgba(16,185,129,0.1)', color: '#10b981' };
    if (s === 'CANCELLED') return { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' };
    return { bg: '#f1f5f9', color: 'var(--text-secondary)' };
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const counts = {
    ALL: bookings.length,
    CONFIRMED: bookings.filter(b => b.status === 'CONFIRMED').length,
    COMPLETED: bookings.filter(b => b.status === 'COMPLETED').length,
    CANCELLED: bookings.filter(b => b.status === 'CANCELLED').length,
  };

  return (
    <div style={{ padding: '0 1rem 2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.25rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,118,34,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bike size={20} color="#ff7622" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--rider-text)' }}>Ride Bookings</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 500 }}>Your city ride booking history</p>
        </div>
        <button
          onClick={() => fetchBookings(true)}
          style={{ marginLeft: 'auto', background: 'var(--rider-bg)', border: '1px solid var(--rider-border)', borderRadius: 10, padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--rider-text-secondary)', cursor: 'pointer' }}
        >
          Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total', val: counts.ALL, color: '#ff7622', bg: 'rgba(255,118,34,0.08)' },
          { label: 'Completed', val: counts.COMPLETED, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Active', val: counts.CONFIRMED, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '0.75rem', textAlign: 'center', border: `1px solid ${s.color}22` }}>
            <p style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: s.color }}>{s.val}</p>
            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: 'var(--rider-text-secondary)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: 4 }}>
        {['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flexShrink: 0, padding: '5px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
              border: 'none', cursor: 'pointer', transition: 'all 0.2s',
              background: filter === f ? '#ff7622' : 'var(--rider-bg)',
              color: filter === f ? 'white' : 'var(--rider-text-secondary)',
            }}
          >
            {f === 'ALL' ? `All (${counts.ALL})` : f === 'CONFIRMED' ? `Active (${counts.CONFIRMED})` : f === 'COMPLETED' ? `Done (${counts.COMPLETED})` : `Cancelled (${counts.CANCELLED})`}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '1rem' }}>
          <Loader size={28} color="#ff7622" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--rider-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Loading bookings…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--rider-border)' }}>
          <Bike size={48} color="#e2e8f0" style={{ margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 700, color: 'var(--rider-text)', marginBottom: '0.4rem' }}>No ride bookings yet</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--rider-text-secondary)' }}>Bookings from customers will appear here once your vehicle is matched.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filtered.map(b => {
            const sc = statusColor(b.status);
            return (
              <div key={b.id} style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--rider-border)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {/* Card Header */}
                <div style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IndianRupee size={14} color="#ff7622" />
                    <span style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--rider-text)' }}>₹{b.total_price?.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--rider-text-secondary)' }}>{formatTime(b.created_at)}</span>
                    <span style={{ background: sc.bg, color: sc.color, fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>{b.status}</span>
                  </div>
                </div>

                {/* Route Info */}
                <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <MapPin size={16} color="#ff7622" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--rider-text-secondary)', fontWeight: 600 }}>Pickup</p>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: 'var(--rider-text)' }}>{b.pickup_area}</p>
                    </div>
                  </div>
                  <div style={{ marginLeft: 8, borderLeft: '2px dashed #e2e8f0', height: 12 }} />
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <Navigation size={16} color="#10b981" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--rider-text-secondary)', fontWeight: 600 }}>Drop-off</p>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: 'var(--rider-text)' }}>{b.drop_area}</p>
                    </div>
                  </div>
                </div>

                {/* Meta Row */}
                <div style={{ padding: '0 1rem 0.85rem', display: 'flex', gap: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--rider-text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={13} /> {b.seat_count} seat{b.seat_count !== 1 ? 's' : ''}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={13} /> Ticket: {b.qr_code_hash?.split('-')[2] || b.qr_code_hash?.substring(0, 8).toUpperCase()}</span>
                </div>

                {/* Action buttons — only for CONFIRMED */}
                {b.status === 'CONFIRMED' && (
                  <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => handleCancel(b.id)}
                      style={{ flex: 1, padding: '0.65rem', borderRadius: 12, border: '1.5px solid #ef4444', background: 'var(--bg-card)', color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <XCircle size={15} /> Cancel
                    </button>
                    <button
                      onClick={() => handleComplete(b.id)}
                      style={{ flex: 2, padding: '0.65rem', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <CheckCircle size={15} /> Mark Complete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RiderRideBookings;

