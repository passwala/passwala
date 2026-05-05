import React from 'react';
import { IndianRupee, Crown, Clock } from 'lucide-react';
import './RiderPortal.css'; // Import custom styles

import { supabase } from '../supabase';

function RiderEarnings({ user, riderId, stats, isOnline, sessionStartTime }) {
    const [deliveries, setDeliveries] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [timeRange, setTimeRange] = React.useState('today');
    const [duration, setDuration] = React.useState('0h 0m');

    // Real-time online duration timer
    React.useEffect(() => {
        const updateTimer = () => {
            if (isOnline && sessionStartTime) {
                const diff = Date.now() - sessionStartTime;
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setDuration(`${hours}h ${minutes}m`);
            } else {
                setDuration('0h 0m');
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [isOnline, sessionStartTime]);

    React.useEffect(() => {
        const fetchRecent = async () => {
            if (riderId) {
                setLoading(true);
                let query = supabase
                    .from('rider_earnings')
                    .select('*')
                    .eq('rider_id', riderId);
                
                // Add time range filtering
                const now = new Date();
                if (timeRange === 'today') {
                    const startOfDay = new Date(now.setHours(0,0,0,0)).toISOString();
                    query = query.gte('created_at', startOfDay);
                } else if (timeRange === 'weekly') {
                    const startOfWeek = new Date(now.setDate(now.getDate() - 7)).toISOString();
                    query = query.gte('created_at', startOfWeek);
                } else if (timeRange === 'monthly') {
                    const startOfMonth = new Date(now.setMonth(now.getMonth() - 1)).toISOString();
                    query = query.gte('created_at', startOfMonth);
                }

                const { data } = await query
                    .order('created_at', { ascending: false })
                    .limit(20);
                
                if (data) {
                    setDeliveries(data.map(d => ({
                        id: `#ORD-${d.order_id.toString().substring(0, 6).toUpperCase()}`,
                        amount: d.amount,
                        time: new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        distance: '1.2 km'
                    })));
                } else {
                    setDeliveries([]);
                }
            }
            setLoading(false);
        };
        fetchRecent();
    }, [riderId, timeRange]);

  return (
    <div className="rider-screen">
      <h2 className="rider-title">Earnings</h2>
      
      {/* High-level summary */}
      <div className="rider-gradient-card">
         <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem', opacity: 0.1 }}>
            <IndianRupee size={120} />
         </div>
         <p style={{ fontWeight: 500, marginBottom: '0.25rem', color: 'rgba(255,255,255,0.8)' }}>
            Total Earnings ({timeRange.charAt(0).toUpperCase() + timeRange.slice(1)})
         </p>
         <h3 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
            ₹{timeRange === 'today' ? stats.earnings : (deliveries.reduce((sum, d) => sum + d.amount, 0))}
         </h3>
         
         <div className="rider-grid-2" style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1rem' }}>
            <div>
               <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>Deliveries</p>
               <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{timeRange === 'today' ? stats.deliveries : deliveries.length}</p>
            </div>
            <div>
               <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)' }}>Online Time</p>
               <p style={{ fontSize: '1.25rem', fontWeight: 700 }}>{duration}</p>
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
         <button 
            onClick={() => setTimeRange('today')}
            style={{ 
                flex: 1, 
                background: timeRange === 'today' ? 'white' : 'transparent', 
                border: 'none', 
                borderRadius: '8px', 
                padding: '0.5rem', 
                fontWeight: timeRange === 'today' ? 700 : 600, 
                fontSize: '0.875rem', 
                color: timeRange === 'today' ? 'var(--rider-text)' : 'var(--rider-text-secondary)',
                boxShadow: timeRange === 'today' ? 'var(--rider-shadow)' : 'none',
                transition: 'all 0.2s ease'
            }}
         >Today</button>
         <button 
            onClick={() => setTimeRange('weekly')}
            style={{ 
                flex: 1, 
                background: timeRange === 'weekly' ? 'white' : 'transparent', 
                border: 'none', 
                borderRadius: '8px', 
                padding: '0.5rem', 
                fontWeight: timeRange === 'weekly' ? 700 : 600, 
                fontSize: '0.875rem', 
                color: timeRange === 'weekly' ? 'var(--rider-text)' : 'var(--rider-text-secondary)',
                boxShadow: timeRange === 'weekly' ? 'var(--rider-shadow)' : 'none',
                transition: 'all 0.2s ease'
            }}
         >Weekly</button>
         <button 
            onClick={() => setTimeRange('monthly')}
            style={{ 
                flex: 1, 
                background: timeRange === 'monthly' ? 'white' : 'transparent', 
                border: 'none', 
                borderRadius: '8px', 
                padding: '0.5rem', 
                fontWeight: timeRange === 'monthly' ? 700 : 600, 
                fontSize: '0.875rem', 
                color: timeRange === 'monthly' ? 'var(--rider-text)' : 'var(--rider-text-secondary)',
                boxShadow: timeRange === 'monthly' ? 'var(--rider-shadow)' : 'none',
                transition: 'all 0.2s ease'
            }}
         >Monthly</button>
      </div>

      {/* Breakdown List */}
      <div>
         <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', margin: 0 }}><Clock size={18} color="var(--rider-text-secondary)" /> {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} Deliveries</h4>
         {loading ? (
             <div style={{ textAlign: 'center', padding: '2rem' }}>
                 <p style={{ color: 'var(--rider-text-secondary)' }}>Loading earnings...</p>
             </div>
         ) : deliveries.length > 0 ? (
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
