import React, { useState, useEffect } from 'react';
import { Package, Truck, Compass, CheckCircle2, ChevronRight, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function OrderTracking({ orderId, onBack }) {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchTracking = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';

      const res = await fetch(`${baseUrl}/api/planet-softweb/orders/track/${orderId}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error('Tracker unavailable');
      setTrackingData(data);
    } catch (err) {
      console.warn('Failed loading tracker');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();

    const channel = window.supabase
      .channel(`tracking-${orderId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'delivery_tracking',
        filter: `order_id=eq.${orderId}`
      }, () => {
        fetchTracking();
      })
      .subscribe();

    return () => {
      window.supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Simulated status advancer for demo/testing flows
  const handleAdvanceStatus = async () => {
    if (!trackingData) return;
    setIsUpdating(true);
    
    try {
      const currentStatus = trackingData.status;
      let nextStatus = 'PLACED';
      let nextMsg = '';

      if (currentStatus === 'PLACED') {
        nextStatus = 'PREPARING';
        nextMsg = 'Planet Softweb grocery packaging is complete.';
      } else if (currentStatus === 'PREPARING') {
        nextStatus = 'DISPATCHED';
        nextMsg = 'Rider picked up food. Out for delivery.';
      } else if (currentStatus === 'DISPATCHED') {
        nextStatus = 'COMPLETED';
        nextMsg = 'Delivery completed successfully!';
      } else {
        toast.info('Order has already reached final destination.');
        setIsUpdating(false);
        return;
      }

      // Update the postgres database tracking state
      const steps = trackingData.tracking_steps.map(step => {
        if (step.status === nextStatus) {
          return { ...step, time: new Date().toISOString(), message: nextMsg };
        }
        return step;
      });

      const { error } = await window.supabase
        .from('delivery_tracking')
        .update({
          status: nextStatus,
          tracking_steps: steps,
          current_lat: trackingData.current_lat + 0.002, // Simulate movement
          current_lng: trackingData.current_lng + 0.003
        })
        .eq('order_id', orderId);

      if (error) throw error;

      toast.success(`Milestone updated to: ${nextStatus} 🛵`);
      fetchTracking();
    } catch (err) {
      toast.error('Could not update tracking status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '260px' }}>
        <div className="animate-spin" style={{ width: '36px', height: '36px', border: '3px solid var(--planet-primary)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
        <p style={{ marginTop: '16px', color: 'var(--planet-text-muted)' }}>Opening live tracking connection...</p>
      </div>
    );
  }

  const steps = trackingData?.tracking_steps || [];

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <button className="planet-nav-btn" onClick={onBack}>
          <ArrowLeft size={16} style={{ marginRight: '6px' }} />
          <span>Shopfront</span>
        </button>
        <button className="planet-btn-primary" style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--planet-border)' }} onClick={fetchTracking}>
          <RefreshCw size={12} style={{ marginRight: '6px' }} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="planet-card" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--planet-border)', paddingBottom: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--planet-text-muted)' }}>ORDER ID:</div>
            <strong style={{ fontSize: '0.95rem', color: 'var(--planet-text)' }}>#{orderId.substring(0, 10).toUpperCase()}</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--planet-text-muted)', display: 'block' }}>ESTIMATED TIME:</span>
            <strong style={{ color: 'var(--planet-secondary)' }}>15 - 25 Minutes</strong>
          </div>
        </div>

        {/* Stepper tracker list */}
        <div style={{ marginBottom: '24px' }}>
          {steps.map((step, idx) => {
            const isCompleted = step.time !== null;
            const isActive = !isCompleted && (idx === 0 || steps[idx - 1].time !== null);
            
            return (
              <div key={idx} className={`track-step ${isCompleted ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                <div className="track-icon-wrapper">
                  {step.status === 'PLACED' && <Package size={14} />}
                  {step.status === 'PREPARING' && <Compass size={14} />}
                  {step.status === 'DISPATCHED' && <Truck size={14} />}
                  {step.status === 'COMPLETED' && <CheckCircle2 size={14} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '700', color: isCompleted || isActive ? 'var(--planet-text)' : 'var(--planet-text-muted)' }}>
                    {step.status === 'PLACED' && 'Order Confirmed'}
                    {step.status === 'PREPARING' && 'Grocery Preparing'}
                    {step.status === 'DISPATCHED' && 'Out for Delivery'}
                    {step.status === 'COMPLETED' && 'Delivered'}
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--planet-text-muted)' }}>
                    {step.time ? step.message : 'Awaiting previous step resolution.'}
                  </p>
                  {step.time && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--planet-secondary)', marginTop: '4px', display: 'block' }}>
                      {new Date(step.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Real-time map coordinates info */}
        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '12px', padding: '16px', border: '1px solid var(--planet-border)', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--planet-primary)' }}>Live GPS Location:</h4>
          
          <div style={{ height: '220px', width: '100%', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
            <MapContainer 
              center={[trackingData?.current_lat || 23.0225, trackingData?.current_lng || 72.5714]} 
              zoom={15} 
              style={{ height: '100%', width: '100%', zIndex: 0 }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <Marker position={[trackingData?.current_lat || 23.0225, trackingData?.current_lng || 72.5714]}>
                <Popup>
                  <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Delivery Rider</div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--planet-text-muted)' }}>
            <span>Lat: <strong>{trackingData?.current_lat || '23.0225'}</strong></span>
            <span>Lng: <strong>{trackingData?.current_lng || '72.5714'}</strong></span>
          </div>
        </div>

        {/* Admin Dev update console */}
        <div style={{ borderTop: '1px dashed var(--planet-border)', paddingTop: '20px', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--planet-text-muted)', display: 'block', marginBottom: '8px' }}>
            🛠️ DEVELOPER TESTING CONSOLE
          </span>
          <button className="planet-btn-primary" style={{ fontSize: '0.85rem', padding: '8px 16px', width: 'auto', margin: '0 auto' }} onClick={handleAdvanceStatus} disabled={isUpdating}>
            {isUpdating ? 'Advancing Status...' : 'Simulate Next Milestone Stage'}
          </button>
        </div>
      </div>
    </div>
  );
}
