/* eslint-disable */
// Location Fixed
import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Phone, CheckCircle, Package, Clock, ChevronRight, Check, RefreshCw, IndianRupee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabase'; // Import supabase client
import { getShortestPathDistance, getNearestLandmark } from '../utils/dijkstra';
import './RiderPortal.css'; // Import custom styles

const mockIncomingOrder = {
  id: '#ORD-9921',
  store: 'Sharma Groceries',
  pickupAddress: 'Satellite, Ahmedabad',
  dropAddress: 'Vastrapur, Ahmedabad',
  distance: '2.5 km',
  earnings: '₹45',
  time: '15 mins',
  items: 4
};

function RiderDashboard({ user, isOnline, setIsOnline, riderId, stats, setStats, riderLocation, setRiderLocation, isDetecting, setIsDetecting, userCoords }) {
  const [activeOrder, setActiveOrder] = useState(null);
  const [rejectedOrderIds, setRejectedOrderIds] = useState([]);
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [deliveryStep, setDeliveryStep] = useState(0);
  const [mapCoords, setMapCoords] = useState({ lat: userCoords?.lat || 23.0225, lon: userCoords?.lng || 72.5714 }); // Default Ahmedabad
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [isManualLocation, setIsManualLocation] = useState(false);
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [activeAreas, setActiveAreas] = useState([]);

  useEffect(() => {
    if (userCoords && !isManualLocation) {
      setMapCoords({ lat: userCoords.lat, lon: userCoords.lng });
    }
  }, [userCoords, isManualLocation]);

  useEffect(() => {
    const fetchAreas = async () => {
       try {
         const { data } = await supabase.from('service_areas').select('*').eq('is_active', true);
         setActiveAreas(data || []);
       } catch (err) { console.error('Areas fetch failed', err); }
    };
    fetchAreas();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Auto-detect location on mount if not set, but wait for areas to load
    if (activeAreas.length > 0 && (!riderLocation || riderLocation === 'Location Not Set' || riderLocation.includes('coming soon'))) {
      if (!isManualLocation) requestLiveLocation();
    }
  }, [activeAreas.length]);

  const requestLiveLocation = async (force = false) => {
    if (isManualLocation && !force) return;
    setIsDetecting(true);
    
    // Fallback method if GPS fails or is denied (Common on non-HTTPS sites)
    const handleFallback = () => {
       if (userCoords) {
         setMapCoords({ lat: userCoords.lat, lon: userCoords.lng });
         // We don't overwrite riderLocation here because it's already managed by App.jsx
         // But if we want to ensure it's synced:
         if (!riderLocation || riderLocation.includes('Location Not Set')) {
            // Just let the prop flow
         }
       } else {
         // Final fallback to Ahmedabad
         setMapCoords({ lat: 23.0225, lon: 72.5714 });
         setRiderLocation("Ahmedabad, Gujarat");
       }
       setIsDetecting(false);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setMapCoords({ lat: latitude, lon: longitude });
          
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          if (!res.ok) throw new Error('Geocoding failed');
          const data = await res.json();
          const addr = data.address;
          
          // Check if the detected city is Ahmedabad
          const detectedCity = (addr.city || addr.town || addr.village || addr.state_district || addr.county || '').toLowerCase();
          
          // Build a broad search string from all address parts to find our area
          const addressSearchString = Object.values(addr).join(' ').toLowerCase();
          
          if (detectedCity.includes('ahmedabad')) {
            // Check against admin-managed active areas
            // If activeAreas is empty, we allow it (development fallback)
            const isServiceable = activeAreas.length === 0 || activeAreas.some(a => {
              const areaName = a.area_name.toLowerCase();
              return addressSearchString.includes(areaName) || areaName.includes(addressSearchString);
            });

            if (isServiceable) {
              const specificPart = addr.road || addr.suburb || addr.neighbourhood || addr.amenity || '';
              const full = specificPart ? `${specificPart}, Ahmedabad` : 'Ahmedabad, Gujarat';
              setRiderLocation(full.replace(/^,|,$/g, '').trim());
            } else {
              setRiderLocation("Your area coming soon");
            }
          } else {
            setRiderLocation("Your area coming soon");
          }
          
          setIsDetecting(false);
        } catch(e) {
          handleFallback();
        }
      }, (err) => {
         console.warn("GPS Error:", err.message);
         handleFallback(); // User denied or error
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    } else {
       handleFallback();
    }
  };
  const steps = ['Accepted', 'Reached Store', 'Order Picked', 'Out for Delivery', 'Delivered'];

  // Add a polling mechanism to refresh location when online
  useEffect(() => {
    let interval;
    if (isOnline) {
      // Refresh every 60 seconds
      interval = setInterval(() => {
        requestLiveLocation();
      }, 60000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnline]);

  // Add a polling mechanism to fetch new orders when online
  useEffect(() => {
    if (!isOnline || activeOrder || incomingOrder) return;

    const fetchPendingOrder = async () => {
      try {
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);

        let query = supabase
          .from('orders')
          .select('*, stores(name, address, lat, lng), addresses(*), users(full_name), order_items(id)')
          .eq('status', 'PLACED')
          .gt('total_amount', 0) // Filter out zero-amount "fake" orders
          .gt('created_at', yesterday.toISOString()) // Only recent orders
          .order('created_at', { ascending: false });

        if (rejectedOrderIds.length > 0) {
          query = query.not('id', 'in', `(${rejectedOrderIds.join(',')})`);
        }

        const { data, error } = await query.limit(5); // Fetch a few to find a nearby one

        if (error) return;
        
        if (data && data.length > 0) {
          // Find the first order that is within a reasonable distance (e.g., 15km)
          const validOrder = data.find(order => {
            const storeCoords = { lat: order.stores?.lat || 23.0225, lng: order.stores?.lng || 72.5714 };
            const dist = getShortestPathDistance(mapCoords.lat, mapCoords.lon, storeCoords.lat, storeCoords.lng);
            return dist <= 15; // Only show if within 15km
          });

          if (!validOrder) return;

          const order = validOrder;
          
          let dropAddr = 'Customer Location';
          let customerCoords = { lat: 23.0225, lng: 72.5714 }; 

          if (order.addresses) {
            const a = order.addresses;
            const parts = [a.house_no, a.floor, a.address_line_1, a.city, a.pincode].filter(Boolean);
            dropAddr = parts.join(', ') || 'Customer Location';
            customerCoords = { lat: a.lat || 23.0225, lng: a.lng || 72.5714 };
          }

          const storeCoords = { lat: order.stores?.lat || 23.0225, lng: order.stores?.lng || 72.5714 };
          const distToStore = getShortestPathDistance(mapCoords.lat, mapCoords.lon, storeCoords.lat, storeCoords.lng);
          const distToCustomer = getShortestPathDistance(storeCoords.lat, storeCoords.lng, customerCoords.lat, customerCoords.lng);
          const totalDist = distToStore + distToCustomer;

          setIncomingOrder({
            id: `#ORD-${order.id.substring(0,6).toUpperCase()}`,
            store: order.stores?.name || 'Passwala Partner Store',
            customerName: order.users?.full_name || 'Customer',
            pickupAddress: order.stores?.address || 'Nearby Market',
            dropAddress: dropAddr,
            distance: `${totalDist.toFixed(1)} km`, 
            earnings: `₹${order.total_amount || 50}`, 
            time: `${Math.round(totalDist * 5 + 5)} mins`, 
            items: order.order_items?.length || 2,
            dbId: order.id
          });
          toast.success(`New Delivery Request! (${totalDist.toFixed(1)} km)`, { icon: "🔔" });
        }
      } catch (err) {
        console.error("Order polling error", err);
      }
    };

    fetchPendingOrder();
    const poller = setInterval(fetchPendingOrder, 5000);
    return () => clearInterval(poller);
  }, [isOnline, activeOrder, incomingOrder, rejectedOrderIds]);

  // 🛡️ Real-time Order Availability Guard
  useEffect(() => {
    if (!incomingOrder?.dbId) return;

    // Listen for updates to the specific order being shown
    const channel = supabase
      .channel(`incoming-order-${incomingOrder.dbId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders', 
        filter: `id=eq.${incomingOrder.dbId}` 
      }, (payload) => {
        // If status changed from PLACED, it's either taken by another rider or cancelled
        if (payload.new.status !== 'PLACED') {
          setIncomingOrder(null);
          toast('Order taken by another rider', { icon: '🤝' });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incomingOrder?.dbId]);

  const handleToggleOnline = async () => {
    let id = user?.id || user?.uid;
    // Fallback for stale local sessions that only have phoneNumber
    if (!id && user?.phoneNumber) {
      const phoneNo = user.phoneNumber.replace('+91', '');
      try {
        const { data } = await supabase.from('users').select('id').eq('phone', phoneNo).maybeSingle();
        if (data) id = data.id;
      } catch (e) {
        console.warn("Supabase unreachable, using provided ID fallback");
      }
    }
    
    // Unstoppable ID fallback for development/demo
    if (!id) {
        console.warn("User ID not found, using 'demo-user-123' as fallback.");
        id = 'demo-user-123';
    }

    const newStatus = !isOnline;
    setIsOnline(newStatus);
    toast.success(newStatus ? "You are now online" : "You are offline");

    // Sync to Supabase
    try {
      if (id && id !== 'demo-user-123') {
        await supabase
          .from('riders')
          .update({ is_active: newStatus })
          .eq('user_id', id);
      }
    } catch (err) {
      console.warn("Status sync failed, using local only");
    }

    if (newStatus) {
      requestLiveLocation();
    }
  };

  const handleAccept = async () => {
    const orderToStart = incomingOrder;
    setActiveOrder(orderToStart);
    setIncomingOrder(null);
    setDeliveryStep(0);
    toast.success('Order Accepted!');
    
    // Sync back to db with rider assignment
    if (orderToStart?.dbId) {
       await supabase.from('orders').update({ 
         status: 'ACCEPTED',
         rider_id: riderId 
       }).eq('id', orderToStart.dbId);
    }
  };

  const handleReject = () => {
    if (incomingOrder?.dbId) {
      setRejectedOrderIds(prev => [...prev, incomingOrder.dbId]);
    }
    setIncomingOrder(null);
    toast('Order Rejected', { icon: '❌' });
  };

  const nextStep = async () => {
    if (deliveryStep < steps.length - 1) {
      const nextIdx = deliveryStep + 1;
      setDeliveryStep(nextIdx);
      toast.success(`Status updated: ${steps[nextIdx]}`);
      
      // Update DB status mapping
      if (activeOrder?.dbId) {
         let newDbStatus = 'ACCEPTED';
         if (nextIdx === 2) newDbStatus = 'ACCEPTED'; // Wait, maybe we use DISPATCHED for 'Out for Delivery' step 3
         if (nextIdx === 3) newDbStatus = 'DISPATCHED';
         await supabase.from('orders').update({ status: newDbStatus }).eq('id', activeOrder.dbId);
      }
    } else {
      // Complete Delivery logic
      if (activeOrder?.dbId) {
         try {
           // 1. Update Order Status
           await supabase.from('orders').update({ status: 'DELIVERED', updated_at: new Date().toISOString() }).eq('id', activeOrder.dbId);
           
           // 2. Record Earnings
           if (riderId) {
             const earningsAmount = Number(activeOrder.earnings.replace('₹', '')) || 50;
             await supabase.from('rider_earnings').insert([{
               rider_id: riderId,
               order_id: activeOrder.dbId,
               amount: earningsAmount
             }]);
             
             // Update local stats immediately for better UX
             setStats(prev => ({
               earnings: prev.earnings + earningsAmount,
               deliveries: prev.deliveries + 1
             }));
           }
         } catch (err) {
           console.error("Error completing delivery in DB:", err);
         }
      }
      setActiveOrder(null);
      setDeliveryStep(0);
      toast.success('Delivery Completed Successfully!', { duration: 4000, icon: '🎉' });
    }
  };

  return (
    <div className="rider-screen relative" style={{ minHeight: '100%', paddingBottom: '2rem' }}>
      {/* Map Section */}
      <div style={{ 
          height: activeOrder ? '320px' : '280px', 
          backgroundColor: '#f1f5f9',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '24px',
          margin: '0 1rem 1.5rem 1rem',
          boxShadow: 'var(--rider-shadow-lg)',
          border: '1px solid var(--rider-border)'
      }}>
        <iframe 
          width="100%" 
          height="100%" 
          frameBorder="0" 
          scrolling="no" 
          marginHeight="0" 
          marginWidth="0" 
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lon-0.01},${mapCoords.lat-0.01},${mapCoords.lon+0.01},${mapCoords.lat+0.01}&layer=mapnik&marker=${mapCoords.lat},${mapCoords.lon}`}
          style={{ border: 'none', filter: 'contrast(1.1) brightness(1.05)' }}
        ></iframe>

        {/* GPS FAB */}
        <button 
          onClick={requestLiveLocation}
          style={{ 
            position: 'absolute', 
            bottom: '1rem', 
            right: '1rem', 
            width: '48px', 
            height: '48px', 
            borderRadius: '16px', 
            background: 'white', 
            border: 'none', 
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer',
            zIndex: 10,
            transition: 'transform 0.2s'
          }}
          onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="Detect My Location"
        >
          <Navigation size={22} color={isDetecting ? "#94a3b8" : "var(--rider-primary)"} style={{ transform: isDetecting ? 'none' : 'rotate(45deg)' }} />
        </button>

        {!activeOrder ? (
          <>
            <div style={{ 
                position: 'absolute', 
                top: '1rem', 
                left: '1rem', 
                right: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                zIndex: 10
            }}>
              {/* Location Pill */}
              <div className="glass" style={{ 
                  padding: '0.6rem 1rem', 
                  borderRadius: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  alignSelf: 'flex-start',
                  maxWidth: '100%'
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--rider-primary)' }}></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Hub</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span onClick={() => setShowAreaPicker(!showAreaPicker)} style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{riderLocation}</span>
                    <RefreshCw 
                      size={14} 
                      className={isDetecting ? "animate-spin" : ""} 
                      style={{ cursor: 'pointer', color: 'var(--rider-primary)' }} 
                      onClick={() => requestLiveLocation(true)}
                    />
                  </div>
                </div>

                {showAreaPicker && (
                  <div className="glass" style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', width: '220px', maxHeight: '200px', overflowY: 'auto', zIndex: 100, padding: '10px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>SWITCH SERVICE AREA</p>
                    {activeAreas.map(area => (
                      <div 
                        key={area.id} 
                        onClick={() => {
                          setRiderLocation(`${area.area_name}, Ahmedabad`);
                          setIsManualLocation(true);
                          setShowAreaPicker(false);
                          toast.success(`Hub changed to ${area.area_name}`);
                        }}
                        style={{ padding: '8px 12px', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '10px', background: 'rgba(0,0,0,0.03)', marginBottom: '4px', fontWeight: 600, transition: 'all 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                      >
                        {area.area_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Search Pill */}
              {isOnline && (
                <div className="glass" style={{ 
                    padding: '0.75rem 1.25rem', 
                    borderRadius: '20px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem',
                    boxShadow: '0 8px 20px rgba(249, 115, 22, 0.15)',
                    alignSelf: 'center',
                    border: '1px solid rgba(249, 115, 22, 0.2)',
                    background: 'rgba(255, 255, 255, 0.9)'
                }}>
                  <span className="rider-pulse-dot" style={{ width: '10px', height: '10px' }}></span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--rider-text)' }}>Looking for orders...</span>
                </div>
              )}
            </div>
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

      {/* Online Status Toggle - Premium Card */}
      {!activeOrder && !incomingOrder && (
        <div style={{ padding: '0 1rem' }}>
          <div 
            style={{ 
              background: isOnline ? 'white' : 'var(--rider-bg)', 
              padding: '1.5rem', 
              borderRadius: '24px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1.5rem',
              boxShadow: isOnline ? '0 12px 30px rgba(16, 185, 129, 0.1)' : 'var(--rider-shadow)',
              border: isOnline ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--rider-border)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: isOnline ? 'var(--rider-success)' : 'var(--rider-text)' }}>
                {isOnline ? "You're Online" : "You're Offline"}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--rider-text-secondary)', margin: 0, fontWeight: 500 }}>
                {isOnline ? 'Ready to accept new deliveries' : 'Go online to start earning money'}
              </p>
            </div>
            <label className="rider-switch">
              <input type="checkbox" checked={isOnline} onChange={handleToggleOnline} />
              <span className="rider-slider"></span>
            </label>
          </div>

          <div className="rider-grid-2">
              <div style={{ background: 'white', padding: '1.25rem', borderRadius: '24px', border: '1px solid var(--rider-border)', boxShadow: 'var(--rider-shadow)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                    <div style={{ padding: '6px', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '8px', color: 'var(--rider-primary)' }}>
                      <IndianRupee size={16} />
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--rider-text-secondary)', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Earnings</p>
                  </div>
                  <p style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'var(--rider-text)' }}>₹{stats.earnings}</p>
              </div>
              <div style={{ background: 'white', padding: '1.25rem', borderRadius: '24px', border: '1px solid var(--rider-border)', boxShadow: 'var(--rider-shadow)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                    <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: 'var(--rider-success)' }}>
                      <Package size={16} />
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--rider-text-secondary)', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Orders</p>
                  </div>
                  <p style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'var(--rider-text)' }}>{stats.deliveries}</p>
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
                        <span className="rider-order-amount">{incomingOrder.earnings}</span> <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--rider-text-secondary)' }}>Order Value</span>
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
                          <p style={{ fontWeight: 700, margin: 0 }}>{incomingOrder.customerName}</p>
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
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 500, margin: 0 }}>Order Value</p>
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

      {/* Bottom Padding for Nav */}
      <div style={{ height: '80px' }}></div>
    </div>
  );
}

export default RiderDashboard;
