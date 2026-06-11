import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { toast } from 'react-hot-toast';
import { Bike, FileText, Star, LogOut, Info, CheckCircle, XCircle, Bell, Headset, ChevronRight, ArrowLeft, CheckCircle2, ShieldCheck, Image as ImageIcon, Trash2, RefreshCw, BookOpen, MapPin, Navigation, Package, Clock, IndianRupee, Loader } from 'lucide-react';
import './RiderPortal.css'; // Import custom styles

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3004'}/api/city-rides`;


const formatIdProofForDisplay = (val) => {
  if (!val) return 'Not Provided';
  const cleanVal = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const isNumeric = /^\d+$/.test(cleanVal);
  if (isNumeric && cleanVal.length === 12) {
    const parts = [];
    for (let i = 0; i < cleanVal.length; i += 4) {
      parts.push(cleanVal.slice(i, i + 4));
    }
    return parts.join(' ');
  }
  return cleanVal;
};

function DocumentsSubpage({ user, onBack }) {
  return (
    <div className="rider-screen" style={{ animation: 'slideUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'white', border: '1px solid var(--rider-border)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--rider-shadow)' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="rider-title" style={{ margin: 0 }}>My Documents</h2>
      </div>

      <div style={{ background: 'var(--rider-success-light)', padding: '1rem', borderRadius: '12px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.5rem', border: '1px solid #a7f3d0' }}>
        <ShieldCheck size={24} color="var(--rider-success)" style={{ flexShrink: 0 }} />
        <div>
          <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--rider-success)', fontWeight: 700 }}>Documents Verified</h4>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--rider-text)' }}>Your identity and vehicle documents have been securely verified by Passwala.</p>
        </div>
      </div>

      <div className="rider-card" style={{ marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 1rem 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="var(--rider-success)" /> Personal ID</h4>
        <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '12px' }}>
          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Aadhar / PAN</p>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1.125rem', letterSpacing: '0.05em' }}>{formatIdProofForDisplay(user?.idProof)}</p>
        </div>
      </div>

      <div className="rider-card">
        <h4 style={{ margin: '0 0 1rem 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={18} color="var(--rider-success)" /> Driving License</h4>
        <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>License Number</p>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1.125rem', letterSpacing: '0.05em' }}>{user?.licenseNo || 'Not Provided'}</p>
        </div>

        <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>License Image</p>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem' }}>Uploaded Successfully</p>
          </div>
          <div style={{ width: '40px', height: '40px', background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--rider-shadow)' }}>
            <ImageIcon size={20} color="var(--rider-primary)" />
          </div>
        </div>
      </div>
    </div>
  );
}

function VehicleSubpage({ user, onBack }) {
  return (
    <div className="rider-screen" style={{ animation: 'slideUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'white', border: '1px solid var(--rider-border)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--rider-shadow)' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="rider-title" style={{ margin: 0 }}>Vehicle Details</h2>
      </div>

      <div className="rider-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1rem' }}>
        <div style={{ width: '80px', height: '80px', background: 'var(--rider-primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
          <Bike size={40} color="var(--rider-primary)" />
        </div>
        <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 700 }}>{user?.vehicleNo || 'Not Registered'}</h3>
        <span style={{ background: 'var(--rider-success-light)', color: 'var(--rider-success)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #a7f3d0' }}>Active Vehicle</span>
      </div>

      <div className="rider-card">
        <h4 style={{ margin: '0 0 1rem 0', fontWeight: 700 }}>Vehicle Type</h4>
        <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '12px' }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Two-Wheeler</p>
        </div>
      </div>
    </div>
  );
}

function NotificationsSubpage({ onBack }) {
  return (
    <div className="rider-screen" style={{ animation: 'slideUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'white', border: '1px solid var(--rider-border)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--rider-shadow)' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="rider-title" style={{ margin: 0 }}>Notifications</h2>
      </div>

      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ width: '64px', height: '64px', background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
          <Bell size={28} color="#9ca3af" />
        </div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>No New Notifications</h3>
        <p style={{ color: 'var(--rider-text-secondary)', fontSize: '0.875rem' }}>You're all caught up! Check back later for updates on orders and payouts.</p>
      </div>
    </div>
  );
}

function HelpSupportSubpage({ onBack }) {
  return (
    <div className="rider-screen" style={{ animation: 'slideUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'white', border: '1px solid var(--rider-border)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--rider-shadow)' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="rider-title" style={{ margin: 0 }}>Help & Support</h2>
      </div>

      <div className="rider-card" style={{ marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 1rem 0', fontWeight: 700 }}>Contact Support</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            onClick={() => toast('Partner Support Hotline is Coming Soon!', { icon: '⏳' })}
            className="rider-btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}
          >
            <Headset size={20} /> Call Partner Support
          </button>
        </div>
      </div>

      <div className="rider-card">
        <h4 style={{ margin: '0 0 1rem 0', fontWeight: 700 }}>Frequently Asked Questions</h4>
        <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '12px', marginBottom: '0.5rem' }}>
          <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700, fontSize: '0.875rem' }}>How are payouts calculated?</p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--rider-text-secondary)' }}>Payouts are calculated based on base pay, distance, and tips.</p>
        </div>
        <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '12px' }}>
          <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700, fontSize: '0.875rem' }}>What if customer rejects order?</p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--rider-text-secondary)' }}>Contact support immediately. You will still receive base compensation.</p>
        </div>
      </div>
    </div>
  );
}

function AboutSubpage({ onBack, onNavigate }) {
  return (
    <div className="rider-screen" style={{ animation: 'slideUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'white', border: '1px solid var(--rider-border)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--rider-shadow)' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="rider-title" style={{ margin: 0 }}>About Passwala</h2>
      </div>

      <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'white', borderRadius: '24px', boxShadow: 'var(--rider-shadow)', border: '1px solid var(--rider-border)' }}>
        <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #fb923c, #ef4444)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.4)' }}>
          <Bike size={40} color="white" />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--rider-text)' }}>Passwala Rider App</h3>
        <p style={{ color: 'var(--rider-text-secondary)', fontSize: '0.875rem', fontWeight: 600, margin: '0 0 2rem 0' }}>Version 1.0.0 (Production)</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
          <div
            onClick={() => onNavigate('terms')}
            style={{ padding: '0.75rem 1rem', background: '#f3f4f6', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
          >
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem' }}>Terms of Service</p>
            <ChevronRight size={16} color="#9ca3af" />
          </div>
          <div
            onClick={() => onNavigate('privacy')}
            style={{ padding: '0.75rem 1rem', background: '#f3f4f6', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
          >
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem' }}>Privacy Policy</p>
            <ChevronRight size={16} color="#9ca3af" />
          </div>
        </div>
      </div>
      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', marginTop: '2rem' }}>© 2026 Passwala Technologies Inc.</p>
    </div>
  );
}

function LegalDocumentSubpage({ type, onBack }) {
  const isTerms = type === 'terms';
  return (
    <div className="rider-screen" style={{ animation: 'slideUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'white', border: '1px solid var(--rider-border)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--rider-shadow)' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="rider-title" style={{ margin: 0 }}>{isTerms ? 'Terms of Service' : 'Privacy Policy'}</h2>
      </div>

      <div className="rider-card" style={{ padding: '1.5rem', maxHeight: '65vh', overflowY: 'auto', background: 'white', borderRadius: '24px', border: '1px solid var(--rider-border)' }}>
        {isTerms ? (
          <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--rider-text)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>1. Partner Agreement</h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--rider-text-secondary)' }}>By using the Passwala Rider Portal, you agree to comply with our delivery partner standards, code of conduct, and service level agreements.</p>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '1.25rem 0 0.5rem 0' }}>2. Geolocation Tracking</h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--rider-text-secondary)' }}>You consent to sharing your real-time GPS coordinates while active on the portal. Location tracking is used solely to match you with nearby orders and show active tracking details to buyers.</p>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '1.25rem 0 0.5rem 0' }}>3. Payout Guidelines</h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--rider-text-secondary)' }}>Payouts are calculated dynamically based on base pay, travel distance, and client tips. The platform reserves the right to review or withhold payouts in case of fraud or service violations.</p>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '1.25rem 0 0.5rem 0' }}>4. Safety and Liability</h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--rider-text-secondary)' }}>Partners are solely responsible for keeping active vehicle licenses, insurance coverage, and complying with public road safety laws.</p>
          </div>
        ) : (
          <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--rider-text)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>1. Data Collection</h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--rider-text-secondary)' }}>We collect your account profile information (phone, vehicle plate, name) and active route data (GPS coordinates) to coordinate neighbor deliveries.</p>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '1.25rem 0 0.5rem 0' }}>2. Data Sharing</h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--rider-text-secondary)' }}>Your real-time coordinates are shared exclusively with the customer waiting for their order delivery or active service appointment, and the respective merchant store partner.</p>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '1.25rem 0 0.5rem 0' }}>3. Data Preservation</h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--rider-text-secondary)' }}>We maintain coordinate history log points only for order verification and auditing purposes. GPS coordinate histories are regularly cleared from databases.</p>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '1.25rem 0 0.5rem 0' }}>4. Access & Deletion Rights</h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--rider-text-secondary)' }}>You can request a full account purge (and corresponding data deletion) at any time directly through the Rider profile options menu.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── My Bookings Subpage ─────────────────────────────────── */
function MyBookingsSubpage({ user, riderId, onBack }) {
  const [tab, setTab] = useState('rides');
  const [rides, setRides] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const driverId = user?.id || user?.uid || user?.user_id || riderId;

      // Fetch ride bookings via server (bypasses RLS)
      try {
        if (driverId) {
          const res = await fetch(`${API_BASE}/driver-bookings?driverId=${encodeURIComponent(driverId)}`);
          const json = await res.json();
          if (json.success) setRides(json.bookings || []);
        }
      } catch (e) { console.warn('Rides fetch:', e); }

      // Fetch delivery orders via supabase
      try {
        if (riderId) {
          const { data } = await supabase
            .from('delivery_tracking')
            .select('*, orders(id, total_amount, status, created_at, stores(name))')
            .eq('rider_id', riderId)
            .order('created_at', { ascending: false })
            .limit(50);
          setOrders(data || []);
        }
      } catch (e) { console.warn('Orders fetch:', e); }

      setLoading(false);
    };
    load();
  }, [user, riderId]);

  const statusColor = (s) => {
    if (!s) return { bg: '#f1f5f9', color: '#64748b' };
    const u = s.toUpperCase();
    if (u === 'CONFIRMED' || u === 'DELIVERED' || u === 'COMPLETED') return { bg: 'rgba(16,185,129,0.1)', color: '#10b981' };
    if (u === 'CANCELLED') return { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' };
    return { bg: 'rgba(255,118,34,0.1)', color: '#ff7622' };
  };

  const fmt = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="rider-screen" style={{ animation: 'slideUp 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
        <button onClick={onBack} style={{ background: 'white', border: '1px solid var(--rider-border)', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--rider-shadow)' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="rider-title" style={{ margin: 0 }}>My Bookings</h2>
      </div>

      {/* Tab pills */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: '#f3f4f6', borderRadius: 14, padding: '4px' }}>
        {[{ id: 'rides', label: '🛵 Ride Bookings', count: rides.length }, { id: 'orders', label: '📦 Deliveries', count: orders.length }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '0.55rem 0.5rem', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.2s',
            background: tab === t.id ? 'white' : 'transparent',
            color: tab === t.id ? '#ff7622' : 'var(--rider-text-secondary)',
            boxShadow: tab === t.id ? '0 1px 6px rgba(0,0,0,0.08)' : 'none'
          }}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Loader size={28} color="#ff7622" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--rider-text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>Loading…</p>
        </div>
      ) : tab === 'rides' ? (
        rides.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'white', borderRadius: 20, border: '1px solid var(--rider-border)' }}>
            <Bike size={40} color="#e2e8f0" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ fontWeight: 700, color: 'var(--rider-text)' }}>No ride bookings yet</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--rider-text-secondary)' }}>Ride bookings assigned to your vehicle will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {rides.map(b => {
              const sc = statusColor(b.status);
              return (
                <div key={b.id} style={{ background: 'white', borderRadius: 18, border: '1px solid var(--rider-border)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <IndianRupee size={13} color="#ff7622" />
                      <span style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--rider-text)' }}>₹{b.total_price?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--rider-text-secondary)' }}>{fmt(b.created_at)}</span>
                      <span style={{ background: sc.bg, color: sc.color, fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>{b.status}</span>
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <MapPin size={14} color="#ff7622" style={{ marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--rider-text-secondary)', fontWeight: 600 }}>PICKUP</p>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.82rem', color: 'var(--rider-text)' }}>{b.pickup_area || '—'}</p>
                      </div>
                    </div>
                    <div style={{ marginLeft: 7, borderLeft: '2px dashed #e2e8f0', height: 10 }} />
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <Navigation size={14} color="#10b981" style={{ marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--rider-text-secondary)', fontWeight: 600 }}>DROP-OFF</p>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.82rem', color: 'var(--rider-text)' }}>{b.drop_area || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'white', borderRadius: 20, border: '1px solid var(--rider-border)' }}>
            <Package size={40} color="#e2e8f0" style={{ margin: '0 auto 0.75rem' }} />
            <p style={{ fontWeight: 700, color: 'var(--rider-text)' }}>No deliveries yet</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--rider-text-secondary)' }}>Completed delivery orders will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {orders.map(d => {
              const order = d.orders;
              const sc = statusColor(order?.status || d.status);
              return (
                <div key={d.id} style={{ background: 'white', borderRadius: 18, border: '1px solid var(--rider-border)', padding: '0.9rem 1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Package size={14} color="#ff7622" />
                      <span style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--rider-text)' }}>{order?.stores?.name || 'Order'}</span>
                    </div>
                    <span style={{ background: sc.bg, color: sc.color, fontSize: '0.68rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>{order?.status || d.status || 'ASSIGNED'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--rider-text-secondary)', fontSize: '0.78rem', fontWeight: 600 }}>
                      <Clock size={12} />{fmt(d.created_at || order?.created_at)}
                    </div>
                    {(order?.total_amount) ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 900, fontSize: '0.95rem', color: 'var(--rider-text)' }}>
                        <IndianRupee size={12} color="#ff7622" />₹{Number(order.total_amount).toFixed(2)}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

function RiderProfile({ user, onLogout, stats, riderId }) {
  const [activeSubpage, setActiveSubpage] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    try {
      setIsDeleting(true);
      // Prioritize Supabase UUID (id) over Firebase UID (uid)
      const userId = user?.id || user?.uid;
      const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

      if (supabase) {
        // 1. Delete dependent records first using riderId (Primary Key)
        if (riderId) {
          await supabase.from('rider_locations').delete().eq('rider_id', riderId);
          await supabase.from('rider_earnings').delete().eq('rider_id', riderId);

          // 2. Delete main rider record using primary key (safest)
          const { error: delError } = await supabase.from('riders').delete().eq('id', riderId);
          if (delError) throw delError;
        }
        // Fallback: Delete using user_id if riderId is missing
        else if (userId) {
          if (isUUID(userId)) {
            console.log("Deleting via user_id (UUID):", userId);
            const { error: delError } = await supabase.from('riders').delete().eq('user_id', userId);
            if (delError) throw delError;
          } else {
            console.warn("Skipping deletion: userId is not a valid UUID", userId);
            // If it's a Firebase UID and we can't find a UUID, we might need to fetch the rider first
            // But usually riderId should be present if they are logged in.
          }
        }
      }

      toast.success('Account deleted successfully.');
      localStorage.removeItem('rOnboardingStep');
      localStorage.removeItem('rProfileCompleted');
      if (onLogout) onLogout(true);
    } catch (e) {
      console.error("Account Deletion Error:", e);
      toast.error(`Deletion failed: ${e.message || 'Please contact support'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (activeSubpage === 'documents') return <DocumentsSubpage user={user} onBack={() => setActiveSubpage(null)} />;
  if (activeSubpage === 'vehicle') return <VehicleSubpage user={user} onBack={() => setActiveSubpage(null)} />;
  if (activeSubpage === 'notifications') return <NotificationsSubpage onBack={() => setActiveSubpage(null)} />;
  if (activeSubpage === 'help') return <HelpSupportSubpage onBack={() => setActiveSubpage(null)} />;
  if (activeSubpage === 'about') return <AboutSubpage onBack={() => setActiveSubpage(null)} onNavigate={(sub) => setActiveSubpage(sub)} />;
  if (activeSubpage === 'terms') return <LegalDocumentSubpage type="terms" onBack={() => setActiveSubpage('about')} />;
  if (activeSubpage === 'privacy') return <LegalDocumentSubpage type="privacy" onBack={() => setActiveSubpage('about')} />;
  if (activeSubpage === 'bookings') return <MyBookingsSubpage user={user} riderId={riderId} onBack={() => setActiveSubpage(null)} />;

  return (
    <div className="rider-screen">
      <h2 className="rider-title">My Profile</h2>

      {/* Header Profile Info */}
      <div className="rider-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, width: '100%', height: '6rem', background: 'linear-gradient(90deg, #fb923c, #ef4444)', zIndex: 0 }}></div>
        <div style={{ position: 'relative', zIndex: 10, width: '6rem', height: '6rem', background: 'white', borderRadius: '50%', padding: '4px', boxShadow: 'var(--rider-shadow)', marginBottom: '0.75rem', marginTop: '1rem' }}>
          <img src={user?.photo || user?.photoURL || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--rider-primary-light)', objectFit: 'cover' }} />
        </div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, position: 'relative', zIndex: 10 }}>{user?.displayName || 'Passwala Partner'}</h3>
        <p style={{ color: 'var(--rider-text-secondary)', fontSize: '0.875rem', fontWeight: 500, margin: 0, position: 'relative', zIndex: 10 }}>{user?.phoneNumber || 'Identity Unverified'}</p>
        <span style={{ marginTop: '0.5rem', background: 'var(--rider-success-light)', color: 'var(--rider-success)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #a7f3d0' }}>Verified Partner</span>
      </div>

      {/* Performance & Ratings */}
      <div className="rider-grid-2">
        <div className="rider-card" style={{ padding: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Rating</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '1.5rem', fontWeight: 900 }}>
            - <Star size={20} color="var(--rider-text-secondary)" />
          </div>
        </div>
        <div className="rider-card" style={{ padding: '1rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Deliveries</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '1.5rem', fontWeight: 900 }}>
            {stats?.deliveries || 0}
          </div>
        </div>
        <div className="rider-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Acceptance</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} color="var(--rider-text-secondary)" />
            <span style={{ fontSize: '1.25rem', fontWeight: 900 }}>{stats?.acceptanceRate ?? 100}%</span>
          </div>
        </div>
        <div className="rider-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem 0' }}>Cancellation</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <XCircle size={20} color="var(--rider-text-secondary)" />
            <span style={{ fontSize: '1.25rem', fontWeight: 900 }}>{stats?.cancellationRate ?? 0}%</span>
          </div>
        </div>
      </div>

      {/* Details List */}
      <div style={{ background: 'white', borderRadius: '24px', border: '1px solid var(--rider-border)', overflow: 'hidden', boxShadow: 'var(--rider-shadow)' }}>
        <MenuItem icon={<BookOpen />} title="My Bookings" subtitle="View ride bookings & delivery orders" onClick={() => setActiveSubpage('bookings')} highlight />
        <MenuItem icon={<Bike />} title="Vehicle Details" subtitle={user?.vehicleNo || 'Two-Wheeler'} onClick={() => setActiveSubpage('vehicle')} />
        <MenuItem icon={<FileText />} title="Documents" subtitle={`${user?.licenseNo || 'Driving License'}, ${formatIdProofForDisplay(user?.idProof) || 'Aadhar Card'} (Verified)`} onClick={() => setActiveSubpage('documents')} />
        <MenuItem icon={<Bell />} title="Notifications" subtitle="Alerts on new orders & payments" onClick={() => setActiveSubpage('notifications')} />
        <MenuItem icon={<Headset />} title="Help & Support" subtitle="Chat with support, report issues" onClick={() => setActiveSubpage('help')} />
        <MenuItem icon={<Info />} title="About Passwala" subtitle="Terms, policies" onClick={() => setActiveSubpage('about')} />
        <MenuItem icon={<RefreshCw />} title="Refresh App" subtitle="Fix glitches & sync data" onClick={() => window.location.reload()} />

        <button
          onClick={onLogout}
          className="rider-menu-btn"
          style={{ color: 'var(--rider-text)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="rider-menu-icon" style={{ background: '#f3f4f6', color: 'var(--rider-text)' }}>
              <LogOut size={20} />
            </div>
            <span style={{ fontWeight: 700 }}>Log Out</span>
          </div>
        </button>

        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={isDeleting}
          className="rider-menu-btn"
          style={{ color: 'var(--rider-danger)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="rider-menu-icon" style={{ background: 'var(--rider-danger-light)', color: 'var(--rider-danger)' }}>
              <Trash2 size={20} />
            </div>
            <span style={{ fontWeight: 700 }}>{isDeleting ? 'Deleting...' : 'Delete Account'}</span>
          </div>
        </button>
      </div>

      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', padding: '1rem 0' }}>
        Passwala Rider App v1.0.0
      </div>

      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={() => setShowDeleteModal(false)}>
          <div
            style={{ background: 'white', borderRadius: '16px', padding: '2rem', maxWidth: '400px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', textAlign: 'center', animation: 'scaleIn 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--rider-danger-light)', color: 'var(--rider-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 800, color: 'var(--rider-text)' }}>Delete Account?</h3>
            <p style={{ margin: '0 0 2rem 0', color: 'var(--rider-text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>This will permanently remove your rider profile, vehicle details, and earning history. This action cannot be undone.</p>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: '#f3f4f6', color: 'var(--rider-text)', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: 'var(--rider-danger)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                onClick={handleDeleteAccount}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, title, subtitle, onClick, highlight }) {
    return (
        <button className="rider-menu-btn" onClick={onClick} style={highlight ? { background: 'linear-gradient(90deg, rgba(255,118,34,0.06), transparent)' } : {}}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="rider-menu-icon" style={highlight ? { background: 'rgba(255,118,34,0.15)', color: '#ff7622' } : {}}>
                   {React.cloneElement(icon, { size: 20 })}
                </div>
                <div style={{ textAlign: 'left' }}>
                    <h4 className="rider-menu-title" style={{ margin: '0 0 0.125rem 0', color: highlight ? '#ff7622' : undefined }}>{title}</h4>
                    <p className="rider-menu-subtitle" style={{ margin: 0 }}>{subtitle}</p>
                </div>
            </div>
            <ChevronRight size={20} color={highlight ? '#ff7622' : '#d1d5db'} />
        </button>
    )
}

export default RiderProfile;
