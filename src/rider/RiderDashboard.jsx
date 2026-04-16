import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Phone, CheckCircle, Package, Clock, ChevronRight, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './RiderPortal.css'; // Import custom styles

const mockIncomingOrder = {
  id: '#ORD-9921',
  store: 'Sharma Groceries',
  pickupAddress: 'Sector 4, Gandhinagar',
  dropAddress: 'Kudasan, Gandhinagar',
  distance: '2.5 km',
  earnings: '₹45',
  time: '15 mins',
  items: 4
};

function RiderDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  const [activeOrder, setActiveOrder] = useState(null);
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [deliveryStep, setDeliveryStep] = useState(0); 
  const [riderLocation, setRiderLocation] = useState('Location Not Set');
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const requestLiveLocation = () => {
    setIsDetecting(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
          if (!res.ok) throw new Error('Geocoding failed');
          const data = await res.json();
          const city = data.address.city || data.address.town || data.address.village || data.address.state_district || '';
          const state = data.address.state || '';
          const full = `${city}, ${state}`.trim().replace(/^,|,$/g, '');
          setRiderLocation(full || 'Live GPS Active');
          setIsDetecting(false);
          toast.success('Live GPS Synchronized!', { icon: '🛰️' });
        } catch(e) {
          setRiderLocation('GPS Acquired (Coordinates Only)');
          setIsDetecting(false);
          toast.success('GPS Coordinates Linked', { icon: '📍' });
        }
      }, () => {
         setRiderLocation('GPS Permission Denied');
         setIsDetecting(false);
         toast.error('Location Permission Denied');
      });
    } else {
      setRiderLocation('GPS Unsupported by Browser');
      setIsDetecting(false);
    }
  };

  const steps = ['Accepted', 'Reached Store', 'Order Picked', 'Out for Delivery', 'Delivered'];

  useEffect(() => {
    // Backend logic for fetching active/incoming orders will go here
  }, [isOnline]);

  const handleAccept = () => {
    setActiveOrder(incomingOrder);
    setIncomingOrder(null);
    setDeliveryStep(0);
    toast.success('Order Accepted!');
  };

  const handleReject = () => {
    setIncomingOrder(null);
    toast('Order Rejected', { icon: '❌' });
  };

  const nextStep = () => {
    if (deliveryStep < steps.length - 1) {
      setDeliveryStep(prev => prev + 1);
      toast.success(`Status updated: ${steps[deliveryStep + 1]}`);
    } else {
      setActiveOrder(null);
      setDeliveryStep(0);
      toast.success('Delivery Completed Successfully!', { duration: 4000, icon: '🎉' });
    }
  };

  return (
    <div className="rider-screen relative" style={{ minHeight: '100%', paddingBottom: '2rem' }}>
      {/* Map Area */}
      <div className="rider-map" style={{ 
          height: activeOrder ? '260px' : '220px', 
          backgroundColor: '#e5eadd',
          backgroundImage: activeOrder ? 'url("https://www.transparenttextures.com/patterns/cubes.png")' : 'none',
          position: 'relative'
      }}>
         {!activeOrder ? (
           <>
             <MapPin size={48} className="rider-map-marker" color="var(--rider-text-secondary)" />
             <div className="rider-map-overlay" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                   <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{currentTime}</p>
                   {riderLocation}
                </div>
                {riderLocation === 'Location Not Set' && isOnline && (
                  <button 
                    onClick={requestLiveLocation} 
                    style={{ background: 'var(--rider-primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: 'var(--rider-shadow)', marginTop: '0.5rem' }}
                    disabled={isDetecting}
                  >
                    {isDetecting ? 'Detecting...' : 'Start GPS Tracking'}
                  </button>
                )}
             </div>
             {isOnline && (
                <div style={{ position: 'absolute', top: '1rem', left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '0.5rem 1rem', borderRadius: '999px', boxShadow: 'var(--rider-shadow)', fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                  <span className="rider-pulse-dot"></span>
                  Looking for orders near you...
                </div>
             )}
           </>
         ) : (
           <>
             {/* Map Mock Background Streets */}
             <div style={{position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, opacity: 0.4}}>
                 <div style={{position: 'absolute', top: '30%', left: 0, width: '100%', height: '12px', background: 'white', transform: 'rotate(-5deg)'}}></div>
                 <div style={{position: 'absolute', top: '70%', left: 0, width: '100%', height: '12px', background: 'white', transform: 'rotate(15deg)'}}></div>
                 <div style={{position: 'absolute', left: '40%', top: 0, width: '12px', height: '100%', background: 'white', transform: 'rotate(10deg)'}}></div>
                 <div style={{position: 'absolute', left: '70%', top: 0, width: '12px', height: '100%', background: 'white', transform: 'rotate(-20deg)'}}></div>
             </div>

             {/* Route Line SVG */}
             <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
                <path d={deliveryStep < 2 ? "M 80 180 Q 150 150 250 80" : "M 80 180 Q 180 200 280 100"} stroke="var(--rider-primary)" strokeWidth="5" strokeDasharray="8 6" fill="none" strokeLinecap="round" />
             </svg>

             {/* ETA Floating Card */}
             <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'white', padding: '0.5rem 1rem', borderRadius: '12px', boxShadow: 'var(--rider-shadow-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--rider-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                  ETA to {deliveryStep < 2 ? 'Store' : 'Customer'}
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--rider-primary)' }}>
                  {deliveryStep === 0 ? (() => { let d = new Date(); d.setMinutes(d.getMinutes() + 5); return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); })() 
                   : deliveryStep === 1 ? 'Arrived' 
                   : deliveryStep === 2 ? (() => { let d = new Date(); d.setMinutes(d.getMinutes() + 15); return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); })()
                   : deliveryStep === 3 ? (() => { let d = new Date(); d.setMinutes(d.getMinutes() + 4); return d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); })()
                   : 'Delivered'}
                </span>
             </div>

             {/* Destination Pin */}
             <div style={{ position: 'absolute', top: deliveryStep < 2 ? '80px' : '100px', left: deliveryStep < 2 ? '250px' : '280px', transform: 'translate(-50%, -100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
                <div style={{ background: deliveryStep < 2 ? 'var(--rider-text)' : 'var(--rider-primary)', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  {deliveryStep < 2 ? activeOrder.store : activeOrder.dropAddress}
                </div>
                <MapPin size={36} color={deliveryStep < 2 ? "var(--rider-text)" : "var(--rider-primary)"} fill="white" />
             </div>

             {/* Rider Current Pin */}
             <div style={{ position: 'absolute', top: '180px', left: '80px', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
                <div style={{ background: '#10b981', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 4px rgba(16,185,129,0.3)', marginBottom: '8px' }}>
                  <Navigation size={12} style={{transform: 'rotate(45deg)'}} />
                </div>
                <div style={{ background: 'white', color: 'var(--rider-text)', padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>You</div>
             </div>
           </>
         )}
      </div>

      {/* Online Status Toggle */}
      {!activeOrder && !incomingOrder && (
        <div style={{ position: 'relative', zIndex: 20, marginTop: '-2rem' }}>
          <div className="rider-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>{isOnline ? "You're Online" : "You're Offline"}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0 }}>{isOnline ? 'Waiting for new orders' : 'Go online to start earning'}</p>
            </div>
            <label className="rider-switch">
              <input type="checkbox" checked={isOnline} onChange={() => setIsOnline(!isOnline)} />
              <span className="rider-slider"></span>
            </label>
          </div>

          <div className="rider-grid-2">
              <div className="rider-card" style={{ padding: '1rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 600, margin: '0 0 0.25rem 0' }}>Today's Earnings</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>₹0</p>
              </div>
              <div className="rider-card" style={{ padding: '1rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', fontWeight: 600, margin: '0 0 0.25rem 0' }}>Deliveries</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>0</p>
              </div>
          </div>
        </div>
      )}

      {/* Incoming Order Modal */}
      {incomingOrder && (
        <div className="rider-modal-backdrop">
            <div className="rider-order-card">
               <div className="rider-order-header">
                  <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--rider-primary)', display: 'inline-block' }}></span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--rider-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Order Request</span>
                      </div>
                      <h3 style={{ margin: 0 }}>
                        <span className="rider-order-amount">{incomingOrder.earnings}</span> <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--rider-text-secondary)' }}>Earnings</span>
                      </h3>
                  </div>
                  <div className="rider-order-time">
                      <Clock size={16} /> {incomingOrder.time}
                  </div>
               </div>

               <div className="rider-order-details">
                  <div className="rider-order-location">
                      <div style={{ marginTop: '4px' }}><MapPin color="var(--rider-primary)" size={20} /></div>
                      <div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0 }}>Pickup from</p>
                          <p style={{ fontWeight: 700, margin: 0 }}>{incomingOrder.store}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{incomingOrder.pickupAddress}</p>
                      </div>
                  </div>
                  <div style={{ borderLeft: '2px dashed #e5e7eb', marginLeft: '9px', height: '16px', marginTop: '-12px', marginBottom: '4px' }}></div>
                  <div className="rider-order-location" style={{ marginBottom: 0 }}>
                      <div style={{ marginTop: '4px' }}><Navigation color="var(--rider-success)" size={20} /></div>
                      <div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0 }}>Deliver to</p>
                          <p style={{ fontWeight: 700, margin: 0 }}>Customer</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{incomingOrder.dropAddress}</p>
                      </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0 0 0', marginTop: '1rem', borderTop: '1px dashed #e5e7eb', fontSize: '0.875rem', fontWeight: 600, color: 'var(--rider-text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Package size={16}/> {incomingOrder.items} items</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Navigation size={16}/> {incomingOrder.distance}</span>
                  </div>
               </div>

               <div className="rider-order-btn-group">
                 <button onClick={handleReject} className="rider-btn-reject">Reject</button>
                 <button onClick={handleAccept} className="rider-btn-accept" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                    Accept Order <ChevronRight size={20}/>
                 </button>
               </div>
            </div>
        </div>
      )}

      {/* Active Order / Delivery Flow */}
      {activeOrder && (
        <div className="rider-card" style={{ padding: 0, overflow: 'hidden', marginTop: '-1rem', position: 'relative', zIndex: 20 }}>
            <div style={{ background: 'var(--rider-text)', color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, letterSpacing: '0.05em', margin: 0 }}>ACTIVE ORDER</p>
                    <p style={{ fontWeight: 700, margin: 0 }}>{activeOrder.id}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500, margin: 0 }}>Est. Earnings</p>
                    <p style={{ fontWeight: 700, color: '#4ade80', fontSize: '1.125rem', margin: 0 }}>{activeOrder.earnings}</p>
                </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '1.5rem', textAlign: 'center', margin: '0 0 1.5rem 0' }}>Delivery Progress</h3>
                
                <div className="rider-stepper">
                    <div className="rider-stepper-line"></div>
                    <div className="rider-stepper-progress" style={{ height: `${(deliveryStep / (steps.length - 1)) * 100}%` }}></div>

                    {steps.map((step, idx) => {
                        const isCompleted = idx < deliveryStep;
                        const isCurrent = idx === deliveryStep;
                        return (
                            <div key={idx} className={`rider-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`} style={{ opacity: isCurrent ? 1 : isCompleted ? 0.7 : 0.4 }}>
                                <div className="rider-step-icon">
                                    {isCompleted ? <Check size={14} strokeWidth={3} /> : ''}
                                </div>
                                <div className="rider-step-content">
                                    <h4>{step}</h4>
                                    {isCurrent && idx === 0 && <p>Navigate to store</p>}
                                    {isCurrent && idx === 1 && <p>Confirm items at {activeOrder.store}</p>}
                                    {isCurrent && idx === 3 && <p>Head to {activeOrder.dropAddress}</p>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div style={{ padding: '1rem', background: 'var(--rider-bg)', borderTop: '1px solid var(--rider-border)' }}>
                <button 
                    onClick={nextStep}
                    className="rider-btn-primary"
                    style={{ background: 'var(--rider-text)' }}
                >
                    {deliveryStep === steps.length - 1 ? 'Complete Delivery' : `Mark as ${steps[deliveryStep + 1]}`}
                    <ChevronRight size={20} />
                </button>
                {deliveryStep === 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button className="rider-btn-secondary" style={{ flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Phone size={18} /> Call Store</button>
                        <button className="rider-btn-secondary" style={{ flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Navigation size={18} /> Navigate</button>
                    </div>
                )}
                {deliveryStep === 3 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button className="rider-btn-secondary" style={{ flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Phone size={18} /> Call</button>
                        <button className="rider-btn-secondary" style={{ flex: 1, padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}><Navigation size={18} /> Navigate</button>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}

export default RiderDashboard;
