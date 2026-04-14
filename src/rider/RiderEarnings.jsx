import React from 'react';
import { IndianRupee, Crown, Clock } from 'lucide-react';
import './RiderPortal.css'; // Import custom styles

function RiderEarnings() {
  const deliveries = [];

  return (
    <div className="rider-screen">
      <h2 className="rider-title">Earnings</h2>
      
      {/* High-level summary */}
      <div className="rider-gradient-card">
         <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem', opacity: 0.1 }}>
            <IndianRupee size={120} />
         </div>
         <p style={{ fontWeight: 500, marginBottom: '0.25rem', color: 'rgba(255,255,255,0.8)' }}>Total Earnings (Today)</p>
         <h3 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>₹0</h3>
         
         <div className="rider-grid-2" style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1rem' }}>
            <div>
               <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>Deliveries</p>
               <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>0</p>
            </div>
            <div>
               <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>Online Time</p>
               <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>0h 0m</p>
            </div>
         </div>
      </div>

      {/* Incentives */}
      <div className="rider-card" style={{ background: 'var(--rider-primary-light)', borderColor: 'var(--rider-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             <div style={{ background: 'white', padding: '0.5rem', borderRadius: '12px', color: 'var(--rider-primary)' }}>
                <Crown size={24} />
             </div>
             <div>
                <h4 style={{ fontWeight: 700, fontSize: '0.875rem', margin: '0 0 0.25rem 0' }}>Target Bonus</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0 }}>Complete 10 more (10 total) for ₹100 bonus.</p>
             </div>
         </div>
         <div style={{ color: 'var(--rider-primary)', fontWeight: 700, background: 'white', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', boxShadow: 'var(--rider-shadow)' }}>
            0/10
         </div>
      </div>

      {/* Tabs / Filters for Earnings */}
      <div style={{ display: 'flex', gap: '0.5rem', background: '#e5e7eb', padding: '4px', borderRadius: '12px', marginBottom: '1.5rem' }}>
         <button style={{ flex: 1, background: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem', fontWeight: 700, fontSize: '0.875rem', boxShadow: 'var(--rider-shadow)' }}>Today</button>
         <button style={{ flex: 1, background: 'transparent', border: 'none', borderRadius: '8px', padding: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--rider-text-secondary)' }}>Weekly</button>
         <button style={{ flex: 1, background: 'transparent', border: 'none', borderRadius: '8px', padding: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--rider-text-secondary)' }}>Monthly</button>
      </div>

      {/* Breakdown List */}
      <div>
         <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', margin: 0 }}><Clock size={18} color="var(--rider-text-secondary)" /> Recent Deliveries</h4>
         {deliveries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                {deliveries.map((delivery, i) => (
                <div key={i} className="rider-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: 0 }}>
                    <div>
                        <p style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>{delivery.id}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: '0.25rem 0 0 0' }}>{delivery.time} • {delivery.distance}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 700, color: 'var(--rider-success)', fontSize: '1.125rem', margin: 0 }}>₹{delivery.amount}</p>
                    </div>
                </div>
                ))}
            </div>
         ) : (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'white', borderRadius: '16px', border: '1px solid var(--rider-border)' }}>
               <Clock size={32} color="#d1d5db" style={{ margin: '0 auto 0.5rem auto' }} />
               <p style={{ fontWeight: 600, color: 'var(--rider-text-secondary)', margin: 0 }}>No deliveries yet.</p>
               <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>Go online to start earning!</p>
            </div>
         )}
      </div>
    </div>
  );
}

export default RiderEarnings;
