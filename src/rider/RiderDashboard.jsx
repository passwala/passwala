/* eslint-disable */
// Location Fixed with Real Premium Leaflet Mapping
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Phone, CheckCircle, Package, Clock, ChevronRight, Check, RefreshCw, IndianRupee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabase'; // Import supabase client
import { getShortestPathDistance, getNearestLandmark } from '../utils/dijkstra';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RiderPortal.css'; // Import custom styles



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
  const [nearbyStores, setNearbyStores] = useState([]);

  // Map elements refs
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerGroupRef = useRef(null);

  // Sync coords on prop change
  useEffect(() => {
    if (userCoords && !isManualLocation) {
      setMapCoords({ lat: userCoords.lat, lon: userCoords.lng });
    }
  }, [userCoords, isManualLocation]);

  // Fetch serviceable areas and nearby stores
  useEffect(() => {
    const fetchAreasAndStores = async () => {
       try {
         // Serviceable Areas
         const { data: areas } = await supabase.from('service_areas').select('*').eq('is_active', true);
         setActiveAreas(areas || []);

         // Real Active Partner Stores
         const { data: stores } = await supabase.from('stores').select('id, name, address, lat, lng, is_open');
         setNearbyStores(stores || []);
       } catch (err) { 
         console.error('Database fetch failed', err); 
       }
    };
    fetchAreasAndStores();
  }, []);

  // Update current time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-detect location on start
  useEffect(() => {
    if (activeAreas.length > 0 && (!riderLocation || riderLocation === 'Location Not Set' || riderLocation.includes('coming soon'))) {
      if (!isManualLocation) requestLiveLocation();
    }
  }, [activeAreas.length]);

  // Handle GPS location tracking
  const requestLiveLocation = async (force = false) => {
    if (isManualLocation && !force) return;
    setIsDetecting(true);
    
    const handleFallback = () => {
       if (userCoords) {
         setMapCoords({ lat: userCoords.lat, lon: userCoords.lng });
       } else {
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
          
          const detectedCity = (addr.city || addr.town || addr.village || addr.state_district || addr.county || '').toLowerCase();
          const addressSearchString = Object.values(addr).join(' ').toLowerCase();
          
          if (detectedCity.includes('ahmedabad')) {
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
         handleFallback();
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

  // Periodic location polling when online
  useEffect(() => {
    let interval;
    if (isOnline) {
      interval = setInterval(() => {
        requestLiveLocation();
      }, 60000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnline]);

  // Real-time order dispatch and polling mechanism
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
          .gt('total_amount', 0)
          .gt('created_at', yesterday.toISOString())
          .order('created_at', { ascending: false });

        if (rejectedOrderIds.length > 0) {
          query = query.not('id', 'in', `(${rejectedOrderIds.join(',')})`);
        }

        const { data, error } = await query.limit(5);

        if (error) return;
        
        if (data && data.length > 0) {
          const validOrder = data.find(order => {
            const storeCoords = { lat: order.stores?.lat || 23.0225, lng: order.stores?.lng || 72.5714 };
            const dist = getShortestPathDistance(mapCoords.lat, mapCoords.lon, storeCoords.lat, storeCoords.lng);
            return dist <= 15;
          });

          if (!validOrder) return;

          const order = validOrder;
          let dropAddr = 'Customer Location';
          let customerCoords = { lat: 23.0225, lng: 72.5714 }; 

          if (order.addresses) {
            const a = order.addresses;
            const parts = [a.house_no, a.floor, a.address_line_1, a.city, a.pincode].filter(Boolean);
            dropAddr = parts.join(', ') || 'Customer Location';
            customerCoords = { lat: parseFloat(a.lat) || 23.0225, lng: parseFloat(a.lng) || 72.5714 };
          }

          const storeCoords = { lat: parseFloat(order.stores?.lat) || 23.0225, lng: parseFloat(order.stores?.lng) || 72.5714 };
          const distToStore = getShortestPathDistance(mapCoords.lat, mapCoords.lon, storeCoords.lat, storeCoords.lng);
          const distToCustomer = getShortestPathDistance(storeCoords.lat, storeCoords.lng, customerCoords.lat, customerCoords.lng);
          const totalDist = distToStore + distToCustomer;

          setIncomingOrder({
            id: `#ORD-${order.id.substring(0,6).toUpperCase()}`,
            store: order.stores?.name || 'Passwala Partner Store',
            storeArea: order.stores?.address?.split(',')[0] || 'Nearby',
            customerName: order.users?.full_name || 'Customer',
            area: order.addresses?.society || 'Near Ahmedabad',
            pickupAddress: order.stores?.address || 'Nearby Market',
            dropAddress: dropAddr,
            distance: `${totalDist.toFixed(1)} km`, 
            earnings: `₹${order.total_amount || 50}`, 
            time: `${Math.round(totalDist * 5 + 5)} mins`, 
            items: order.order_items?.length || 2,
            dbId: order.id,
            storeCoords: storeCoords,
            customerCoords: customerCoords
          });
          toast.success(`New Delivery Request! (${totalDist.toFixed(1)} km)`, { icon: "🔔" });
        }
      } catch (err) {
        console.error("Order polling error", err);
      }
    };

    fetchPendingOrder();

    const channel = supabase
      .channel('new-orders-broadcast')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders' 
      }, (payload) => {
        if (payload.new.status === 'PLACED') {
          fetchPendingOrder();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOnline, activeOrder, incomingOrder, rejectedOrderIds]);

  // Sync and clean up order real-time updates
  useEffect(() => {
    if (!incomingOrder?.dbId) return;

    const channel = supabase
      .channel(`incoming-order-${incomingOrder.dbId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders', 
        filter: `id=eq.${incomingOrder.dbId}` 
      }, (payload) => {
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

  // Leaflet Map Initialization and Lifecycle management
  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMapRef.current) {
      leafletMapRef.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([mapCoords.lat, mapCoords.lon], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        className: 'map-tiles'
      }).addTo(leafletMapRef.current);

      L.control.zoom({ position: 'topright' }).addTo(leafletMapRef.current);
      markerGroupRef.current = L.featureGroup().addTo(leafletMapRef.current);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markerGroupRef.current = null;
      }
    };
  }, []);

  // Sync Leaflet markers and route polylines dynamically
  useEffect(() => {
    if (!leafletMapRef.current || !markerGroupRef.current) return;

    // Clear previous layers
    markerGroupRef.current.clearLayers();

    // Define premium DivIcons with inline vector SVGs
    const createRiderIcon = () => L.divIcon({
      className: 'custom-leaflet-marker rider-marker',
      html: `<div class="marker-container" style="background: #10b981; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative;">
               <span class="pulse-ring" style="position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 3px solid #10b981; animation: marker-pulse 1.8s infinite; opacity: 0.6;"></span>
               <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg);"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
             </div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });

    const createStoreIcon = (name) => L.divIcon({
      className: 'custom-leaflet-marker store-marker',
      html: `<div class="marker-container" style="background: #f97316; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; position: relative;">
               <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 17H2"/></svg>
             </div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });

    const createCustomerIcon = (name) => L.divIcon({
      className: 'custom-leaflet-marker customer-marker',
      html: `<div class="marker-container" style="background: #3b82f6; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative;">
               <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
             </div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });

    const riderLatLng = [mapCoords.lat, mapCoords.lon];

    // 1. Draw Rider
    L.marker(riderLatLng, { icon: createRiderIcon() })
      .bindPopup(`<b>You (Rider)</b><br/>Status: ${isOnline ? 'Online' : 'Offline'}`)
      .addTo(markerGroupRef.current);

    if (activeOrder) {
      // Show Delivery Routing (Real Map, No fake streets)
      const storeCoords = activeOrder.storeCoords || { lat: 23.0305, lng: 72.5075 };
      const customerCoords = activeOrder.customerCoords || { lat: 23.0393, lng: 72.5244 };

      const storeLatLng = [storeCoords.lat, storeCoords.lng];
      const customerLatLng = [customerCoords.lat, customerCoords.lng];

      // Draw Store Marker
      L.marker(storeLatLng, { icon: createStoreIcon(activeOrder.store) })
        .bindPopup(`<b>Store Hub:</b> ${activeOrder.store}<br/>Pickup point`)
        .addTo(markerGroupRef.current);

      // Draw Customer Marker
      L.marker(customerLatLng, { icon: createCustomerIcon(activeOrder.customerName) })
        .bindPopup(`<b>Customer:</b> ${activeOrder.customerName}<br/>Deliver to: ${activeOrder.dropAddress}`)
        .addTo(markerGroupRef.current);

      // Draw interactive path depending on active phase
      if (deliveryStep < 2) {
        // Leg 1 (Rider -> Store) is active SOLID orange route
        L.polyline([riderLatLng, storeLatLng], {
          color: '#f97316',
          weight: 6,
          opacity: 0.9,
          lineJoin: 'round'
        }).addTo(markerGroupRef.current);

        // Leg 2 (Store -> Customer) is DASHED upcoming blue route
        L.polyline([storeLatLng, customerLatLng], {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.5,
          dashArray: '8, 8',
          lineJoin: 'round'
        }).addTo(markerGroupRef.current);
      } else {
        // Leg 1 (Store -> Rider) is faded completed dashed route
        L.polyline([storeLatLng, riderLatLng], {
          color: '#94a3b8',
          weight: 3,
          opacity: 0.4,
          dashArray: '4, 4',
          lineJoin: 'round'
        }).addTo(markerGroupRef.current);

        // Leg 2 (Rider -> Customer) is active SOLID blue route
        L.polyline([riderLatLng, customerLatLng], {
          color: '#3b82f6',
          weight: 6,
          opacity: 0.9,
          lineJoin: 'round'
        }).addTo(markerGroupRef.current);
      }

      // Automatically focus bounds to include all elements
      try {
        const bounds = L.latLngBounds([riderLatLng, storeLatLng, customerLatLng]);
        leafletMapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      } catch (e) {
        console.warn('Map bounds fit error', e);
      }

    } else {
      // No active order - Show surrounding vendor shops & hubs
      if (nearbyStores.length > 0) {
        nearbyStores.forEach(store => {
          if (!store.lat || !store.lng) return;
          const storeLatLng = [parseFloat(store.lat), parseFloat(store.lng)];
          const dist = getShortestPathDistance(mapCoords.lat, mapCoords.lon, storeLatLng[0], storeLatLng[1]);
          
          L.marker(storeLatLng, { icon: createStoreIcon(store.name) })
            .bindPopup(`
              <div style="font-family: inherit; line-height: 1.4;">
                <h4 style="margin: 0 0 2px 0; color: #f97316; font-weight: 800;">${store.name}</h4>
                <p style="margin: 0 0 6px 0; font-size: 0.75rem; color: #64748b; font-weight: 500;">${store.address || 'Nearby Shop'}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #e2e8f0; padding-top: 6px; margin-top: 4px;">
                  <span style="font-size: 0.75rem; font-weight: 700; color: #1e293b;">📍 ${dist.toFixed(1)} km away</span>
                  <span style="font-size: 0.65rem; padding: 2px 6px; background: rgba(249,115,22,0.1); color: #f97316; border-radius: 4px; font-weight: 700;">Partner Hub</span>
                </div>
              </div>
            `)
            .addTo(markerGroupRef.current);
        });
      }

      // Re-center on Rider smoothly
      leafletMapRef.current.setView(riderLatLng, 14);
    }
  }, [mapCoords, activeOrder, deliveryStep, nearbyStores, isOnline]);

  const handleToggleOnline = async () => {
    let id = user?.id || user?.uid;
    if (!id && user?.phoneNumber) {
      const phoneNo = user.phoneNumber.replace('+91', '');
      try {
        const { data } = await supabase.from('users').select('id').eq('phone', phoneNo).maybeSingle();
        if (data) id = data.id;
      } catch (e) {
        console.warn("Supabase unreachable");
      }
    }
    
    if (!id) {
        toast.error("User identity missing. Please re-login.");
        return;
    }

    const newStatus = !isOnline;
    setIsOnline(newStatus);
    toast.success(newStatus ? "You are now online" : "You are offline");

    try {
      if (id) {
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
    
    if (orderToStart?.dbId) {
       try {
         const updatePayload = { status: 'ACCEPTED' };
         // Only append rider_id if it looks like a valid UUID (length > 20)
         if (riderId && riderId.length > 20) {
           updatePayload.rider_id = riderId;
         }
         
         const { error } = await supabase.from('orders').update(updatePayload).eq('id', orderToStart.dbId);
         if (error) {
           console.error("Error accepting order:", error);
           toast.error("Database update failed, but proceeding locally.");
         }
       } catch (err) {
         console.error("Exception accepting order:", err);
       }
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
      
      if (activeOrder?.dbId) {
         try {
           let newDbStatus = 'ACCEPTED';
           if (nextIdx === 1) newDbStatus = 'PREPARING'; // Reached Store
           if (nextIdx === 2) newDbStatus = 'PREPARING'; // Order Picked
           if (nextIdx === 3) newDbStatus = 'DISPATCHED'; // Out for Delivery
           const { error } = await supabase.from('orders').update({ status: newDbStatus }).eq('id', activeOrder.dbId);
           if (error) console.error("Error updating order step:", error);
         } catch (err) {
           console.error("Exception updating order step:", err);
         }
      }
    } else {
      if (activeOrder?.dbId) {
         try {
           const { error: completeErr } = await supabase.from('orders').update({ status: 'DELIVERED', updated_at: new Date().toISOString() }).eq('id', activeOrder.dbId);
           if (completeErr) console.error("Error completing order:", completeErr);
           
           if (riderId) {
             const earningsAmount = Number(activeOrder.earnings.replace('₹', '')) || 50;
             const { error: earnErr } = await supabase.from('rider_earnings').insert([{
               rider_id: riderId,
               order_id: activeOrder.dbId,
               amount: earningsAmount
             }]);
             
             if (earnErr) {
               console.error("Error inserting rider earnings:", earnErr);
               toast.error(`Earnings error: ${earnErr.message}`);
             } else {
               setStats(prev => ({
                 earnings: prev.earnings + earningsAmount,
                 deliveries: prev.deliveries + 1
               }));
             }
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
          border: '1px solid var(--rider-border)',
          zIndex: 1
      }}>
        {/* Leaflet Map Div Container */}
        <div 
          ref={mapRef} 
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        ></div>

        {/* GPS FAB Overlay */}
        <button 
          onClick={() => requestLiveLocation(true)}
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
          <div style={{ 
              position: 'absolute', 
              top: '1rem', 
              left: '1rem', 
              right: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              zIndex: 10,
              pointerEvents: 'none'
          }}>
            {/* Location Pill Overlay */}
            <div className="glass" style={{ 
                padding: '0.6rem 1rem', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                alignSelf: 'flex-start',
                maxWidth: '100%',
                pointerEvents: 'auto'
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
                  background: 'rgba(255, 255, 255, 0.9)',
                  pointerEvents: 'auto'
              }}>
                <span className="rider-pulse-dot" style={{ width: '10px', height: '10px' }}></span>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--rider-text)' }}>Looking for orders...</span>
              </div>
            )}
          </div>
        ) : (
          /* ETA Floating Card */
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
                          <p style={{ fontWeight: 700, margin: '0 0 2px 0' }}>{incomingOrder.store}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                             <MapPin size={12} color="var(--rider-primary)" />
                             <span style={{ fontSize: '0.75rem', color: 'var(--rider-primary)', fontWeight: 600 }}>{incomingOrder.storeArea}</span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{incomingOrder.pickupAddress}</p>
                       </div>
                  </div>
                  <div style={{ borderLeft: '2px dashed #e5e7eb', marginLeft: '9px', height: '16px', marginTop: '-12px', marginBottom: '4px' }}></div>
                  <div className="rider-order-location" style={{ marginBottom: 0 }}>
                      <div style={{ marginTop: '4px' }}><Navigation color="var(--rider-success)" size={20} /></div>
                      <div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0 }}>Deliver to</p>
                          <p style={{ fontWeight: 700, margin: '0 0 2px 0', fontSize: '1rem' }}>{incomingOrder.customerName}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                             <MapPin size={12} color="var(--rider-primary)" />
                             <span style={{ fontSize: '0.8rem', color: 'var(--rider-primary)', fontWeight: 600 }}>{incomingOrder.area}</span>
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{incomingOrder.dropAddress}</p>
                      </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifySpaceBetween: 'space-between', padding: '1rem 0 0 0', marginTop: '1rem', borderTop: '1px dashed #e5e7eb', fontSize: '0.875rem', fontWeight: 600, color: 'var(--rider-text-secondary)', justifyContent: 'space-between' }}>
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
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button 
                            onClick={() => toast.success('Connecting call to store...')} 
                            style={{ flex: 1, padding: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', color: '#1e293b', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                            <Phone size={18} color="#64748b" /> Call Store
                        </button>
                        <button 
                            onClick={() => {
                                const lat = activeOrder?.storeCoords?.lat || 23.0305;
                                const lng = activeOrder?.storeCoords?.lng || 72.5075;
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                            }} 
                            style={{ flex: 1, padding: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', color: '#1e293b', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                            <Navigation size={18} color="#3b82f6" /> Navigate
                        </button>
                    </div>
                )}
                {deliveryStep === 3 && (
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button 
                            onClick={() => toast.success('Connecting call to customer...')} 
                            style={{ flex: 1, padding: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', color: '#1e293b', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                            <Phone size={18} color="#64748b" /> Call Customer
                        </button>
                        <button 
                            onClick={() => {
                                const lat = activeOrder?.customerCoords?.lat || 23.0393;
                                const lng = activeOrder?.customerCoords?.lng || 72.5244;
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
                            }} 
                            style={{ flex: 1, padding: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', color: '#1e293b', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                            <Navigation size={18} color="#3b82f6" /> Navigate
                        </button>
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
