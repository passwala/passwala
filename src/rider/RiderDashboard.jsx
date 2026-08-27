// Google Maps Premium Rider Dashboard
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, Phone, CheckCircle, Package, Clock, ChevronRight, Check, RefreshCw, IndianRupee, Maximize2, Minimize2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabase';
import { getOSRMRoute, getStraightLineDistance } from '../utils/dijkstra';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import './RiderPortal.css';
import { AHMEDABAD_AREA_COORDS } from '../utils/constants';

const geocodeAddress = async (address) => {
  if (!address) return { lat: 23.0225, lng: 72.5714 };
  const lower = address.toLowerCase().replace(/[.,]/g, ' ');
  const words = lower.split(/\s+/).filter(Boolean);
  
  // Check multi-word combos against lookup table
  for (let len = Math.min(words.length, 4); len >= 1; len--) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(' ');
      if (AHMEDABAD_AREA_COORDS[phrase]) {
        const coords = AHMEDABAD_AREA_COORDS[phrase];
        return { lat: coords[0], lng: coords[1] };
      }
    }
  }
  
  // Check if any key is contained in the address string
  for (const [area, coords] of Object.entries(AHMEDABAD_AREA_COORDS)) {
    if (lower.includes(area)) {
      return { lat: coords[0], lng: coords[1] };
    }
  }

  // Nominatim fallback with proper headers
  try {
    const searchString = lower.includes('ahmedabad') ? address : `${address}, Ahmedabad, Gujarat, India`;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchString)}&limit=1&countrycodes=in&viewbox=72.40,22.85,72.80,23.25&bounded=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)',
        'Accept-Language': 'en',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    }
  } catch (err) {
    console.warn('Geocoding error:', err);
  }

  // Default to Ahmedabad center
  const defaultCoords = AHMEDABAD_AREA_COORDS['ahmedabad'] || [23.0225, 72.5714];
  return { lat: defaultCoords[0], lng: defaultCoords[1] };
};

function RiderDashboard({ user, isOnline, setIsOnline, riderId, stats, setStats, riderLocation, setRiderLocation, isDetecting, setIsDetecting, userCoords, setShowLocationDisclosure }) {
  const [activeOrder, setActiveOrder] = useState(null);
  const [rejectedOrderIds, setRejectedOrderIds] = useState([]);
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [deliveryStep, setDeliveryStep] = useState(0);
  const [activeRide, setActiveRide] = useState(null);
  const [rideStep, setRideStep] = useState(0);
  const prevRideIdRef = useRef(null);
  const hasCenteredRef = useRef(false);
  const [mockLat, setMockLat] = useState('23.0225');
  const [mockLng, setMockLng] = useState('72.5714');
  const [showGpsSimulator, setShowGpsSimulator] = useState(false);
  const [isFullMap, setIsFullMap] = useState(false);

  useEffect(() => {
    if (activeRide) {
      let initialStep = 1;
      // Ride stage to step mapping (step 0 removed — Accept Ride auto-confirms):
      // PENDING/CONFIRMED = step 1 (heading to pickup)
      // EN_ROUTE = step 1 (heading to pickup)
      // ARRIVED = step 2 (at pickup, verify customer)
      // IN_PROGRESS = step 3 (ride in progress)
      if (activeRide.status === 'EN_ROUTE') initialStep = 1;
      else if (activeRide.status === 'ARRIVED') initialStep = 2;
      else if (activeRide.status === 'IN_PROGRESS') initialStep = 3;
      else if (activeRide.status === 'COMPLETED') initialStep = 4;
      else initialStep = 1; // PENDING or CONFIRMED → head to pickup (step 1)
      setRideStep(initialStep);
      prevRideIdRef.current = activeRide.id;
    } else {
      setRideStep(0);
      prevRideIdRef.current = null;
    }
  }, [activeRide]);

  useEffect(() => {
    // Only skip polling if offline or busy with a delivery order
    // DO NOT clear activeRide just because incomingOrder is set
    if (!isOnline || activeOrder) {
      setActiveRide(null);
      return;
    }
    // If we already have an activeRide locally, skip polling (don't overwrite)
    // We still poll periodically to catch DB-level state
    if (incomingOrder) {
      // While showing an incomingOrder, don't fetch activeRide (they're separate)
      return;
    }

    const fetchActiveRide = async () => {
      let uid = user?.id || user?.uid || user?.user_id;
      if (!uid && user?.phoneNumber) {
        const phoneNo = user.phoneNumber.replace('+91', '');
        const { data } = await supabase.from('users').select('id').eq('phone', phoneNo).maybeSingle();
        if (data) uid = data.id;
      }
      if (!uid) return;

      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const url = `${baseUrl}/api/city-rides/active-ride?driverId=${uid}`;
        console.log("RiderDashboard: Fetching active ride. uid:", uid, "url:", url);
        const res = await fetch(url);
        const data = await res.json();
        console.log("RiderDashboard: Active ride data:", data);
        if (data.success && data.booking) {
          const activeBooking = data.booking;
          const pickup = activeBooking.pickup_area || '';
          const dropoff = activeBooking.drop_area || '';
          const name = activeBooking.users?.full_name || '';

          if (
            pickup.toLowerCase().includes('test') || pickup.toLowerCase().includes('dummy') ||
            dropoff.toLowerCase().includes('test') || dropoff.toLowerCase().includes('dummy') ||
            name.toLowerCase().includes('test') || name.toLowerCase().includes('dummy')
          ) {
            setActiveRide(null);
            return;
          }

          setActiveRide({
            id: activeBooking.id,
            customerName: activeBooking.users?.full_name || 'Passenger',
            customerPhone: activeBooking.users?.phone || '',
            pickup: activeBooking.pickup_area,
            dropoff: activeBooking.drop_area,
            pickupLat: parseFloat(activeBooking.pickup_lat),
            pickupLng: parseFloat(activeBooking.pickup_lng),
            dropLat: parseFloat(activeBooking.drop_lat),
            dropLng: parseFloat(activeBooking.drop_lng),
            price: activeBooking.total_price,
            seats: activeBooking.seat_count,
            status: activeBooking.seat_numbers?.ride_stage || activeBooking.status,
            qrHash: activeBooking.qr_code_hash,
            luggageWeight: activeBooking.seat_numbers?.luggage_weight || 0,
            luggagePrice: activeBooking.seat_numbers?.luggage_price || 0
          });

          if (lastAlertedRideId.current !== activeBooking.id) {
            lastAlertedRideId.current = activeBooking.id;
            playNotificationSound();
            toast.success(`New Ride Request Confirmed! (${activeBooking.pickup_area} to ${activeBooking.drop_area})`, { icon: "🛵", duration: 5000 });
          }
        } else {
          setActiveRide(null);
        }
      } catch (err) {
        console.error("Error fetching active ride:", err);
      }
    };

    fetchActiveRide();
    const interval = setInterval(fetchActiveRide, 5000);
    return () => clearInterval(interval);
  }, [isOnline, activeOrder, incomingOrder, user]);

  const updateRideStatus = async (newStatus, nextStep) => {
    if (!activeRide) return;
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/city-rides/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: activeRide.id, status: newStatus })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setRideStep(nextStep);
      setActiveRide(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err) {
      console.error("Error updating ride status:", err);
      toast.error(err.message || 'Failed to update ride status');
    }
  };

  const handleCompleteRide = async () => {
    if (!activeRide) return;
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/city-rides/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: activeRide.id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success('Ride Completed Successfully!', { icon: '🎉' });
      setActiveRide(null);
    } catch (err) {
      console.error("Error completing ride:", err);
      toast.error(err.message || 'Failed to complete ride');
    }
  };

  useEffect(() => {
    if (riderId) {
      try {
        const saved = localStorage.getItem(`passwala_rejected_orders_${riderId}`);
        if (saved) {
          setRejectedOrderIds(JSON.parse(saved));
        }
      } catch (e) {
        console.warn("Error loading rejected orders:", e);
      }
    }
  }, [riderId]);

  // Real-time listener for incoming ride request status
  useEffect(() => {
    if (!incomingOrder?.dbId || !incomingOrder?.isRide) return;

    const channel = supabase
      .channel(`incoming-ride-${incomingOrder.dbId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ticket_bookings',
        filter: `id=eq.${incomingOrder.dbId}`
      }, (payload) => {
        if (payload.new && payload.new.status === 'CANCELLED') {
          setIncomingOrder(null);
          toast.error('Ride request cancelled by passenger');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incomingOrder?.dbId, incomingOrder?.isRide]);

  // Real-time listener for active ride status
  useEffect(() => {
    if (!activeRide?.id) return;

    const channel = supabase
      .channel(`active-ride-${activeRide.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ticket_bookings',
        filter: `id=eq.${activeRide.id}`
      }, (payload) => {
        if (payload.new && payload.new.status === 'CANCELLED') {
          setActiveRide(null);
          setRideStep(0);
          toast.error('Ride has been cancelled by passenger');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRide?.id]);


  // Fetch active order for this rider if they have one ongoing in the database on mount/online
  useEffect(() => {
    if (!riderId || activeOrder) return;

    const fetchActiveOrder = async () => {
      try {
        // 1. Query delivery_tracking to find recent tracking records for this rider
        const { data: trackingRecords, error: trackingErr } = await supabase
          .from('delivery_tracking')
          .select('order_id, status')
          .eq('rider_id', riderId)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (trackingErr || !trackingRecords || trackingRecords.length === 0) return;

        // 2. Fetch order details to find the active order (not completed/cancelled)
        let activeRecord = null;
        let activeOrderData = null;

        for (const record of trackingRecords) {
          const { data: orderData, error: orderErr } = await supabase
            .from('orders')
            .select('*, stores(name, address, lat, lng, vendor_id), addresses(*), users(full_name), order_items(id, quantity, products(name, description))')
            .eq('id', record.order_id)
            .maybeSingle();

          if (!orderErr && orderData && !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(orderData.status)) {
            activeRecord = record;
            activeOrderData = orderData;
            break;
          }
        }

        if (!activeOrderData || !activeRecord) return;
        const trackingRecord = activeRecord;
        const data = activeOrderData;

          // Resolve store and customer coords
          let sLat = parseFloat(data.stores?.lat);
          let sLng = parseFloat(data.stores?.lng);
          if (isNaN(sLat) || isNaN(sLng) || sLat === 0) {
            const resolvedStore = await geocodeAddress(data.stores?.address || data.stores?.name || 'Ahmedabad');
            sLat = resolvedStore.lat;
            sLng = resolvedStore.lng;
          }
          const storeCoords = { lat: sLat, lng: sLng };

          let cLat = data.addresses ? parseFloat(data.addresses.lat) : NaN;
          let cLng = data.addresses ? parseFloat(data.addresses.lng) : NaN;
          if (isNaN(cLat) || isNaN(cLng) || cLat === 0) {
            const resolvedCustomer = await geocodeAddress(data.addresses?.address_line_1 || 'Ahmedabad');
            cLat = resolvedCustomer.lat;
            cLng = resolvedCustomer.lng;
          }
          const customerCoords = { lat: cLat, lng: cLng };

          let dropAddr = 'Customer Location';
          if (data.addresses) {
            const a = data.addresses;
            const parts = [a.house_no, a.floor, a.address_line_1, a.city, a.pincode].filter(Boolean);
            dropAddr = parts.join(', ') || 'Customer Location';
          }

          let stepIdx = 0;
          // Prefer precise combinations of orders and delivery_tracking statuses
          if (data.status === 'OUT_FOR_DELIVERY' && trackingRecord.status === 'DELIVERED') stepIdx = 4;
          else if (data.status === 'OUT_FOR_DELIVERY' && trackingRecord.status === 'PICKED_UP') stepIdx = 3;
          else if (data.status === 'PREPARING' && trackingRecord.status === 'PICKED_UP') stepIdx = 2;
          else if (data.status === 'PREPARING' && trackingRecord.status === 'ASSIGNED') stepIdx = 1;
          else if (trackingRecord.status === 'PREPARING') stepIdx = 1;
          else if (trackingRecord.status === 'PICKED_UP') stepIdx = 2;
          else if (trackingRecord.status === 'OUT_FOR_DELIVERY') stepIdx = 3;
          else if (data.status === 'PREPARING') stepIdx = 1;
          else if (data.status === 'SHIPPED') stepIdx = 2;
          else if (data.status === 'DISPATCHED') stepIdx = 3;

          setActiveOrder({
            id: `#ORD-${data.id.substring(0, 6).toUpperCase()}`,
            store: data.stores?.name || 'Passwala Partner Store',
            storeArea: data.stores?.address?.split(',')[0] || 'Nearby',
            customerName: data.users?.full_name || 'Customer',
            area: data.addresses?.society || 'Near Ahmedabad',
            pickupAddress: data.stores?.address || 'Nearby Market',
            dropAddress: dropAddr,
            distance: 'calculating...',
            earnings: `₹${data.total_amount || 50}`,
            time: 'calculating...',
            items: data.order_items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1,
            weight: 0.5,
            dbId: data.id,
            storeCoords,
            customerCoords
          });
          setDeliveryStep(stepIdx);
      } catch (err) {
        console.error("Error fetching active order:", err);
      }
    };

    fetchActiveOrder();
  }, [riderId, isOnline, activeOrder]);

  // Real-time active order status synchronization from DB
  useEffect(() => {
    if (!activeOrder?.dbId) return;

    const channel = supabase
      .channel(`active-order-${activeOrder.dbId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders', 
        filter: `id=eq.${activeOrder.dbId}` 
      }, (payload) => {
        if (['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(payload.new.status)) {
          setActiveOrder(null);
          setDeliveryStep(0);
          toast.success(`Order is now ${payload.new.status}!`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrder?.dbId]);
  const getRiderLocationCoords = useCallback(() => {
    if (!riderLocation) return { lat: 23.0225, lng: 72.5714 };
    const lower = riderLocation.toLowerCase().replace(/[.,]/g, ' ');
    const words = lower.split(/\s+/).filter(Boolean);
    
    // Check multi-word combos against lookup table
    for (let len = Math.min(words.length, 4); len >= 1; len--) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        if (AHMEDABAD_AREA_COORDS[phrase]) {
          const coords = AHMEDABAD_AREA_COORDS[phrase];
          return { lat: coords[0], lng: coords[1] };
        }
      }
    }
    
    for (const [area, coords] of Object.entries(AHMEDABAD_AREA_COORDS)) {
      if (lower.includes(area)) {
        return { lat: coords[0], lng: coords[1] };
      }
    }
    return { lat: 23.0225, lng: 72.5714 };
  }, [riderLocation]);

  const constrainToAhmedabad = useCallback((coords) => {
    if (!coords || isNaN(coords.lat) || isNaN(coords.lng)) {
      return getRiderLocationCoords();
    }
    return coords;
  }, [getRiderLocationCoords]);

  const [mapCoords, setMapCoords] = useState(() => {
    const initial = { lat: userCoords?.lat || 23.0225, lng: userCoords?.lng || 72.5714 };
    return constrainToAhmedabad(initial);
  });
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [isManualLocation, setIsManualLocation] = useState(false);
  const [activeAreas, setActiveAreas] = useState([]);
  // OSRM Routing Engine States (Only Bike route mode)
  const [routeMode, setRouteMode] = useState('cycling'); // 'cycling'
  const [osrmRouteToStore, setOsrmRouteToStore] = useState([]);
  const [osrmRouteToCustomer, setOsrmRouteToCustomer] = useState([]);
  const [routeStats, setRouteStats] = useState(null); // { distanceKm, durationMins }
  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch(e) { console.log('Audio error', e); }
  };

  const lastAlertedOrderId = useRef(null);
  const lastAlertedRideId = useRef(null);

  // Fetch real street coordinates from OSRM Engine
  useEffect(() => {
    // If the simulation is already moving, do NOT recalculate the route
    if (simIndexRef?.current > 0) return;

    const orderToRoute = activeOrder || incomingOrder;
    if (!orderToRoute && !activeRide) {
      setOsrmRouteToStore([]);
      setOsrmRouteToCustomer([]);
      setRouteStats(null);
      return;
    }

    const riderLatLng = (mapCoords && mapCoords.lat && mapCoords.lng && !isNaN(mapCoords.lat) && !isNaN(mapCoords.lng))
      ? [parseFloat(mapCoords.lat), parseFloat(mapCoords.lng)]
      : null;

    const storeCoords = activeRide 
      ? { lat: activeRide.pickupLat, lng: activeRide.pickupLng } 
      : (orderToRoute?.storeCoords || { lat: 23.0305, lng: 72.5075 });

    const customerCoords = activeRide 
      ? { lat: activeRide.dropLat, lng: activeRide.dropLng }
      : (orderToRoute?.customerCoords || { lat: 23.0393, lng: 72.5244 });

    const storeLatLng = [storeCoords.lat, storeCoords.lng];
    const customerLatLng = [customerCoords.lat, customerCoords.lng];

    const fetchRoute = async (startPt, endPt) => {
      if (!startPt || !endPt || isNaN(startPt[0]) || isNaN(startPt[1]) || isNaN(endPt[0]) || isNaN(endPt[1])) return null;
      let data = null;
      try {
        const apiBase = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
        const profile = 'cycling';
        const url = `${apiBase}/api/route?startLat=${startPt[0]}&startLng=${startPt[1]}&endLat=${endPt[0]}&endLng=${endPt[1]}&profile=${profile}`;
        const res = await fetch(url);
        if (res.ok) {
          data = await res.json();
        }
      } catch (err) {
        console.warn("Backend route proxy failed:", err);
      }

      if (!data) {
        try {
          const profile = 'cycling';
          const publicUrl = `https://router.project-osrm.org/route/v1/${profile}/${startPt[1]},${startPt[0]};${endPt[1]},${endPt[0]}?overview=full&geometries=geojson`;
          const res = await fetch(publicUrl, {
            headers: {
              'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)'
            }
          });
          if (res.ok) {
            data = await res.json();
          }
        } catch (err) {
          console.warn("Direct public OSRM fetch failed:", err);
        }
      }

      if (data && data.routes && data.routes.length > 0) {
        return {
          coords: data.routes[0].geometry.coordinates.map(pt => [pt[1], pt[0]]),
          distance: data.routes[0].distance / 1000,
          duration: (data.routes[0].duration / 60) * 2.2
        };
      }
      return null;
    };

    const fetchBothRoutes = async () => {
      let route1 = null;
      let route2 = null;

      if (riderLatLng) {
        if (activeRide) {
          // Rider -> Pickup (Leg 1)
          route1 = await fetchRoute(riderLatLng, storeLatLng);
          // Pickup -> Dropoff (Leg 2)
          route2 = await fetchRoute(storeLatLng, customerLatLng);
        } else if (deliveryStep < 2) {
          // Rider -> Store (Leg 1)
          route1 = await fetchRoute(riderLatLng, storeLatLng);
          // Store -> Customer (Leg 2)
          route2 = await fetchRoute(storeLatLng, customerLatLng);
        } else {
          // Store -> Rider (Leg 1 faded)
          route1 = await fetchRoute(storeLatLng, riderLatLng);
          // Rider -> Customer (Leg 2 active)
          route2 = await fetchRoute(riderLatLng, customerLatLng);
        }
      } else {
        // No riderLatLng: just show Store -> Customer route
        route2 = await fetchRoute(storeLatLng, customerLatLng);
      }

      if (route1) {
        setOsrmRouteToStore(route1.coords);
      } else {
        setOsrmRouteToStore([]);
      }

      if (route2) {
        setOsrmRouteToCustomer(route2.coords);
      } else {
        setOsrmRouteToCustomer([]);
      }

      const startPt = riderLatLng || storeLatLng;
      const distToStore = (route1 && typeof route1.distance === 'number') 
        ? route1.distance 
        : getStraightLineDistance(startPt[0], startPt[1], storeLatLng[0], storeLatLng[1]);
        
      const showLeg2 = activeRide 
        ? (rideStep >= 2 || distToStore <= 0.15) 
        : (deliveryStep >= 1 || distToStore <= 0.15);

      const activeRoute = showLeg2 ? route2 : route1;

      if (activeRoute && activeRoute.distance > 0) {
        setRouteStats({
          distanceKm: activeRoute.distance.toFixed(1),
          durationMins: Math.round(activeRoute.duration)
        });
      } else {
        // Fallback: always show pickup→dropoff distance (actual ride distance)
        // This is meaningful even without rider GPS
        const endPt = showLeg2 ? customerLatLng : storeLatLng;
        const startForFallback = riderLatLng || storeLatLng;
        const fallbackDist = getStraightLineDistance(startForFallback[0], startForFallback[1], endPt[0], endPt[1]);
        // If fallback is also 0 (same point), show pickup→dropoff
        const displayDist = fallbackDist > 0.01
          ? fallbackDist
          : getStraightLineDistance(storeLatLng[0], storeLatLng[1], customerLatLng[0], customerLatLng[1]);
        setRouteStats({
          distanceKm: displayDist.toFixed(1),
          durationMins: Math.round(displayDist * 3.5 + 5)
        });
      }
    };

    fetchBothRoutes();
  }, [activeOrder, incomingOrder, activeRide, deliveryStep, rideStep, routeMode, mapCoords]);

  // Map elements refs
  const mapRef = useRef(null);
  const googleMapInstance = useRef(null);
  const activeMarkers = useRef([]);
  const activePolylines = useRef([]);
  const isGoogleLoaded = useGoogleMaps();

  // Sync coords from parent (GPS tracker) — single effect to avoid duplicate updates
  useEffect(() => {
    if (userCoords?.lat && userCoords?.lng && !isManualLocation) {
      setMapCoords(constrainToAhmedabad({ lat: parseFloat(userCoords.lat), lng: parseFloat(userCoords.lng) }));
    }
  }, [userCoords?.lat, userCoords?.lng, isManualLocation, constrainToAhmedabad]);


  // Fetch serviceable areas and nearby stores
  useEffect(() => {
    const fetchAreasAndStores = async () => {
       try {
         // Serviceable Areas
         const { data: areas } = await supabase.from('service_areas').select('*').eq('is_active', true);
         setActiveAreas(areas || []);
       } catch (err) { 
         console.error('Database fetch failed', err); 
       }
    };
    fetchAreasAndStores();
  }, []);



  // Auto-detect location on start
  useEffect(() => {
    if (activeAreas.length > 0 && (!riderLocation || riderLocation === 'Location Not Set' || riderLocation.includes('coming soon'))) {
      if (!isManualLocation) requestLiveLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAreas.length]);

  // Handle GPS location tracking
  const requestLiveLocation = async (force = false) => {
    if (isManualLocation && !force) return;
    setIsDetecting(true);
    
    const handleFallback = () => {
       if (userCoords) {
         setMapCoords({ lat: userCoords.lat, lng: userCoords.lng });
         setRiderLocation(riderLocation || "Detected Location");
       } else {
         setMapCoords({ lat: 23.0225, lng: 72.5714 });
         setRiderLocation("Ahmedabad, Gujarat");
       }
       setIsDetecting(false);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setMapCoords({ lat: latitude, lng: longitude });
          
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
            headers: {
              'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)',
              'Accept-Language': 'en',
            }
          });
          if (!res.ok) throw new Error('Geocoding failed');
          const data = await res.json();
          const addr = data.address;
          
          const specificPart = addr.road || addr.suburb || addr.neighbourhood || addr.amenity || addr.city || addr.town || addr.state || '';
          const full = specificPart ? `${specificPart}` : 'Detected Location';
          setRiderLocation(full.replace(/^,|,$/g, '').trim());
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

  // (mapCoords is now synced in the single effect above)

  // Real-time order dispatch and polling mechanism
  useEffect(() => {
    if (!isOnline || activeOrder || incomingOrder || activeRide) return;

    const fetchPendingOrder = async () => {
      try {
        const hubCoords = getRiderLocationCoords();
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);

        // Fetch pending passenger rides first via backend API to bypass RLS policies
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const pendingRidesRes = await fetch(`${baseUrl}/api/city-rides/pending-rides`);
        const pendingRidesData = await pendingRidesRes.json();
        const pendingRides = pendingRidesData.success ? pendingRidesData.bookings : [];

        if (pendingRides && pendingRides.length > 0) {
          const validRides = pendingRides.filter(ride => 
            ride.seat_numbers?.ride_stage === 'PENDING' && 
            (!rejectedOrderIds.includes(ride.id))
          );

          if (validRides.length > 0) {
            const ride = validRides[0];
            let dist = getStraightLineDistance(
              hubCoords.lat, hubCoords.lng, 
              parseFloat(ride.pickup_lat), parseFloat(ride.pickup_lng)
            );
            
            const isSameArea = (addr1, addr2) => {
              if (!addr1 || !addr2) return false;
              const a1 = addr1.toLowerCase();
              const a2 = addr2.toLowerCase();
              const areas = ['sindhu bhavan', 'sbr', 'thaltej', 'bopal', 'satellite', 'paldi', 'navrangpura', 'vastrapur', 'gota', 'prahlad nagar'];
              for (const area of areas) {
                if (a1.includes(area) && a2.includes(area)) {
                  return true;
                }
              }
              return false;
            };

            if (dist < 0.1 || isSameArea(riderLocation, ride.pickup_area)) {
              dist = 0.0;
            }

            // Fetch OSRM route to show stats accurately
            const rToCustomer = await getOSRMRoute(
              parseFloat(ride.pickup_lat), parseFloat(ride.pickup_lng),
              parseFloat(ride.drop_lat), parseFloat(ride.drop_lng),
              'cycling'
            );

            const rideDistKm = rToCustomer.distanceKm > 0 
              ? rToCustomer.distanceKm 
              : getStraightLineDistance(parseFloat(ride.pickup_lat), parseFloat(ride.pickup_lng), parseFloat(ride.drop_lat), parseFloat(ride.drop_lng));

            setIncomingOrder({
              isRide: true,
              id: `#RIDE-${ride.id.substring(0, 6).toUpperCase()}`,
              customerName: ride.users?.full_name || 'Passenger',
              customerPhone: ride.users?.phone || '',
              pickupAddress: ride.pickup_area,
              dropAddress: ride.drop_area,
              distance: `${dist.toFixed(1)} km`,          // rider → pickup
              rideDistance: `${rideDistKm.toFixed(1)} km`, // pickup → drop (actual ride km)
              earnings: `₹${ride.total_price}`,
              time: `${rToCustomer.durationMins ? Math.round(rToCustomer.durationMins) : Math.round(rideDistKm * 3.5 + 5)} mins`,
              items: ride.seat_count,
              weight: 0,
              dbId: ride.id,
              storeCoords: { lat: parseFloat(ride.pickup_lat), lng: parseFloat(ride.pickup_lng) },
              customerCoords: { lat: parseFloat(ride.drop_lat), lng: parseFloat(ride.drop_lng) },
              seatNumbers: ride.seat_numbers
            });

            if (lastAlertedOrderId.current !== ride.id) {
              lastAlertedOrderId.current = ride.id;
              playNotificationSound();
              toast.success(`New Ride Request! (${dist.toFixed(1)} km)`, { icon: "🛵" });
            }
            return;
          }
        }

        let query = supabase
          .from('orders')
          .select('*, stores(name, address, lat, lng, vendor_id), addresses(*), users(full_name), order_items(id, quantity, products(name, description))')
          .in('status', ['PLACED', 'PREPARING'])
          .gt('total_amount', 0)
          .gt('created_at', yesterday.toISOString())
          .order('created_at', { ascending: false });

        if (rejectedOrderIds.length > 0) {
          query = query.not('id', 'in', `(${rejectedOrderIds.join(',')})`);
        }

        const { data, error } = await query.limit(5);

        if (error) return;
        
        if (data && data.length > 0) {
          // Filter out orders that are service bookings (stores without vendor_id or containing service products)
          const filteredOrders = data.filter(order => {
            const hasServiceProduct = order.order_items?.some(item => 
              item.products?.description === 'Service item auto-registered'
            );
            const isServiceProvider = order.stores && !order.stores.vendor_id;
            
            const addr1 = order.addresses?.address_line_1 || '';
            const society = order.addresses?.society || '';
            const name = order.users?.full_name || '';
            const store = order.stores?.name || '';
            
            const isTest = 
              addr1.toLowerCase().includes('test') || addr1.toLowerCase().includes('dummy') ||
              society.toLowerCase().includes('test') || society.toLowerCase().includes('dummy') ||
              name.toLowerCase().includes('test') || name.toLowerCase().includes('dummy') ||
              store.toLowerCase().includes('test') || store.toLowerCase().includes('dummy');

            return !hasServiceProduct && !isServiceProvider && !isTest;
          });

          // Parse society dynamically from address_line_1 if not present or is generic city
          for (const order of filteredOrders) {
            if (order.addresses && (!order.addresses.society || order.addresses.society.toLowerCase() === 'ahmedabad') && order.addresses.address_line_1) {
              const parts = order.addresses.address_line_1.split(',').map(p => p.trim());
              const lastPart = parts[parts.length - 1] || '';
              if (lastPart.toLowerCase() === 'ahmedabad') {
                order.addresses.society = parts[parts.length - 2] || parts[0] || 'Thaltej';
              } else {
                order.addresses.society = lastPart || 'Thaltej';
              }
            }
          }

          if (filteredOrders.length > 0) {
            let validOrder = null;
            let routeToCustomer = null;
            
            for (const order of filteredOrders) {
              let sLat = parseFloat(order.stores?.lat);
              let sLng = parseFloat(order.stores?.lng);
              const storeAddressText = `${order.stores?.address || order.stores?.name || ''}`.toLowerCase();
              if (storeAddressText.includes('sbr')) {
                sLat = 23.0396;
                sLng = 72.5100;
              } else if (isNaN(sLat) || isNaN(sLng) || sLat === 0 || (sLat === 23.0225 && sLng === 72.5714)) {
                const resolvedStore = await geocodeAddress(order.stores?.address || order.stores?.name || 'Ahmedabad');
                sLat = resolvedStore.lat;
                sLng = resolvedStore.lng;
              }
              const storeCoords = { lat: sLat, lng: sLng };
              
              const rToStore = await getOSRMRoute(hubCoords.lat, hubCoords.lng, storeCoords.lat, storeCoords.lng, 'cycling');
              if (rToStore.distanceKm <= 10000) {
                validOrder = order;
                
                let cLat = order.addresses ? parseFloat(order.addresses.lat) : NaN;
                let cLng = order.addresses ? parseFloat(order.addresses.lng) : NaN;
                if (isNaN(cLat) || isNaN(cLng) || cLat === 0 || (cLat === 23.0225 && cLng === 72.5714)) {
                  const resolvedCustomer = await geocodeAddress(order.addresses?.address_line_1 || 'Ahmedabad');
                  cLat = resolvedCustomer.lat;
                  cLng = resolvedCustomer.lng;
                }
                const cCoords = { lat: cLat, lng: cLng };

                routeToCustomer = await getOSRMRoute(storeCoords.lat, storeCoords.lng, cCoords.lat, cCoords.lng, 'cycling');
                break;
              }
            }

            if (!validOrder) return;

          const order = validOrder;
          let dropAddr = 'Customer Location';
          let customerCoords = { lat: 23.0225, lng: 72.5714 }; 

          if (order.addresses) {
            const a = order.addresses;
            const parts = [a.house_no, a.floor, a.address_line_1, a.city, a.pincode].filter(Boolean);
            dropAddr = parts.join(', ') || 'Customer Location';
            
            let cLat = parseFloat(a.lat);
            let cLng = parseFloat(a.lng);
            if (isNaN(cLat) || isNaN(cLng) || cLat === 0 || (cLat === 23.0225 && cLng === 72.5714)) {
              const resolvedCustomer = await geocodeAddress(a.address_line_1 || 'Ahmedabad');
              cLat = resolvedCustomer.lat;
              cLng = resolvedCustomer.lng;
            }
            customerCoords = { lat: cLat, lng: cLng };
          }

          let sLat = parseFloat(order.stores?.lat);
          let sLng = parseFloat(order.stores?.lng);
          const storeAddressText2 = `${order.stores?.address || order.stores?.name || ''}`.toLowerCase();
          if (storeAddressText2.includes('sbr')) {
            sLat = 23.0396;
            sLng = 72.5100;
          } else if (isNaN(sLat) || isNaN(sLng) || sLat === 0 || (sLat === 23.0225 && sLng === 72.5714)) {
            const resolvedStore = await geocodeAddress(order.stores?.address || order.stores?.name || 'Ahmedabad');
            sLat = resolvedStore.lat;
            sLng = resolvedStore.lng;
          }
          const storeCoords = { lat: sLat, lng: sLng };
          const distToCustomer = routeToCustomer.distanceKm;

          const parseProductWeight = (prod) => {
            if (!prod) return 0.5;
            const searchStr = `${prod.name || ''} ${prod.description || ''}`.toLowerCase();
            const kgMatch = searchStr.match(/(\d+(?:\.\d+)?)\s*kg/);
            if (kgMatch) return parseFloat(kgMatch[1]);
            const gMatch = searchStr.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gram)/);
            if (gMatch) return parseFloat(gMatch[1]) / 1000;
            return 0.5;
          };

          let calculatedWeight = order.order_items?.reduce((sum, item) => {
            const itemWeight = parseProductWeight(item.products);
            return sum + (itemWeight * (item.quantity || 1));
          }, 0) || 0.5;

          const storeText = `${order.stores?.name || ''} ${order.stores?.address || ''}`.toLowerCase();
          const dropText = `${dropAddr} ${order.addresses?.society || ''}`.toLowerCase();
          if (storeText.includes('sbr') && (dropText.includes('sindhu') || dropText.includes('sindhubhavan'))) {
            calculatedWeight = 1.8;
          }

          setIncomingOrder({
            id: `#ORD-${order.id.substring(0,6).toUpperCase()}`,
            store: order.stores?.name || 'Passwala Partner Store',
            storeArea: order.stores?.address?.split(',')[0] || 'Nearby',
            customerName: order.users?.full_name || 'Customer',
            area: order.addresses?.society || 'Near Ahmedabad',
            pickupAddress: order.stores?.address || 'Nearby Market',
            dropAddress: dropAddr,
            distance: `${distToCustomer.toFixed(1)} km`, 
            earnings: `₹${order.total_amount || 50}`, 
            time: `${routeToCustomer.durationMins ? Math.round(routeToCustomer.durationMins) : Math.round(distToCustomer * 3.5 + 5)} mins`, 
            items: order.order_items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1,
            weight: calculatedWeight,
            dbId: order.id,
            storeCoords: storeCoords,
            customerCoords: customerCoords
          });
          
          if (lastAlertedOrderId.current !== order.id) {
            lastAlertedOrderId.current = order.id;
            playNotificationSound();
            toast.success(`New Delivery Request! (${distToCustomer.toFixed(1)} km)`, { icon: "🔔" });
          }
        }
      }
      } catch (err) {
        console.error("Order polling error", err);
      }
    };

    fetchPendingOrder();

    const pollingInterval = setInterval(() => {
      fetchPendingOrder();
    }, 8000);

    const channel = supabase
      .channel('new-orders-broadcast')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'delivery_tracking' 
      }, () => {
        fetchPendingOrder();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'delivery_tracking' 
      }, () => {
        fetchPendingOrder();
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders' 
      }, () => {
        // New order placed - immediately poll
        fetchPendingOrder();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders' 
      }, () => {
        // Order status changed - refresh (e.g., another rider accepted it)
        fetchPendingOrder();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ticket_bookings'
      }, () => {
        fetchPendingOrder();
      })
      .subscribe();

    return () => {
      clearInterval(pollingInterval);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, activeOrder, incomingOrder, activeRide, rejectedOrderIds, mapCoords]);

  // Sync and clean up order/ride real-time updates
  useEffect(() => {
    if (!incomingOrder?.dbId) return;

    const channel = supabase
      .channel(`incoming-order-${incomingOrder.dbId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: incomingOrder.isRide ? 'ticket_bookings' : 'delivery_tracking', 
        filter: incomingOrder.isRide ? `id=eq.${incomingOrder.dbId}` : `order_id=eq.${incomingOrder.dbId}` 
      }, (payload) => {
        if (incomingOrder.isRide) {
          if (payload.new.vehicle_id !== null) {
            setIncomingOrder(null);
            toast('Ride taken by another driver', { icon: '🤝' });
          }
        } else {
          if (payload.new.rider_id !== null || (payload.new.status !== 'PENDING')) {
            setIncomingOrder(null);
            toast('Order taken by another rider', { icon: '🤝' });
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incomingOrder?.dbId, incomingOrder?.isRide]);

  // Simulated Real-Time Movement along Route
  const simIndexRef = useRef(0);
  const prevRouteKeyRef = useRef('');

  useEffect(() => {
    if (!isOnline || !riderId) return;

    let activeRoute = [];
    let routeKey = '';

    if (activeOrder) {
      if (deliveryStep === 0) {
        activeRoute = osrmRouteToStore;
        routeKey = `order-store-${activeOrder.id}`;
      } else if (deliveryStep === 1) {
        activeRoute = [];
        routeKey = `order-store-waiting-${activeOrder.id}`;
      } else {
        activeRoute = osrmRouteToCustomer;
        routeKey = `order-customer-${activeOrder.id}`;
      }
    } else if (activeRide) {
      if (rideStep < 2) {
        activeRoute = osrmRouteToStore;
        routeKey = `ride-pickup-${activeRide.id}`;
      } else if (rideStep === 2) {
        activeRoute = [];
        routeKey = `ride-pickup-waiting-${activeRide.id}`;
      } else {
        activeRoute = osrmRouteToCustomer;
        routeKey = `ride-drop-${activeRide.id}`;
      }
    }

    if (routeKey !== prevRouteKeyRef.current) {
      simIndexRef.current = 0;
      prevRouteKeyRef.current = routeKey;
    }

    if (activeRoute.length === 0) return;

    const interval = setInterval(async () => {
      if (simIndexRef.current >= activeRoute.length) {
        clearInterval(interval);
        return;
      }

      const nextPt = activeRoute[simIndexRef.current];
      if (nextPt && !isNaN(nextPt[0]) && !isNaN(nextPt[1])) {
        const newCoords = { lat: nextPt[0], lng: nextPt[1] };
        setMapCoords(newCoords);

        // Sync simulated location to DB
        try {
          await supabase
            .from('rider_locations')
            .upsert({
              rider_id: riderId,
              lat: nextPt[0],
              lng: nextPt[1],
              updated_at: new Date().toISOString()
            }, { onConflict: 'rider_id' });
        } catch (err) {
          console.warn("Simulated location sync failed:", err);
        }

        // Calculate remaining distance along activeRoute
        let remainingDist = 0;
        for (let i = simIndexRef.current; i < activeRoute.length - 1; i++) {
          const pt1 = activeRoute[i];
          const pt2 = activeRoute[i + 1];
          remainingDist += getStraightLineDistance(pt1[0], pt1[1], pt2[0], pt2[1]);
        }
        const remainingDuration = remainingDist > 0.05 ? Math.max(1, Math.round(remainingDist * 2.5)) : 0;
        setRouteStats({
          distanceKm: remainingDist.toFixed(1),
          durationMins: remainingDuration
        });

        simIndexRef.current += 1;
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOnline, riderId, activeOrder, activeRide, deliveryStep, rideStep, osrmRouteToStore, osrmRouteToCustomer]);

  // ── Google Map Initialization ────────────────────────────────────────────
  useEffect(() => {
    if (!isGoogleLoaded || !mapRef.current || googleMapInstance.current) return;
    googleMapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: mapCoords.lat || 23.0225, lng: mapCoords.lng || 72.5714 },
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: { position: window.google?.maps?.ControlPosition?.RIGHT_TOP },
      styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
    });
    return () => {
      activeMarkers.current.forEach(m => m.setMap(null));
      activePolylines.current.forEach(p => p.setMap(null));
      activeMarkers.current = []; activePolylines.current = [];
      googleMapInstance.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGoogleLoaded]);

  // ── Sync Google Maps markers & routes dynamically ────────────────────────
  useEffect(() => {
    if (!googleMapInstance.current) return;

    // Clear previous overlays
    activeMarkers.current.forEach(m => { if (m.setMap) m.setMap(null); else if (m.map !== undefined) m.map = null; });
    activePolylines.current.forEach(p => p.setMap(null));
    activeMarkers.current = []; activePolylines.current = [];

    // Helper: create marker using google.maps.Marker
    const createMarker = (pos, title, svgStr) => {
      return new window.google.maps.Marker({
        position: pos,
        map,
        title: title || '',
        icon: svgStr ? {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgStr),
          scaledSize: new window.google.maps.Size(42, 42),
          anchor: new window.google.maps.Point(21, 21)
        } : undefined
      });
    };

    const map = googleMapInstance.current;

    // Helper: create SVG icon
    const _svgIcon = (color, svgPath, rounded = false) => ({
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42"><rect x="0" y="0" width="42" height="42" rx="${rounded ? 12 : 21}" fill="${color}" stroke="white" stroke-width="3"/><g transform="translate(9,9)">${svgPath}</g></svg>`
      ),
      scaledSize: new window.google.maps.Size(42, 42),
      anchor: new window.google.maps.Point(21, 21)
    });

    // Helper: draw polyline
    const drawPoly = (pts, color, weight = 6, dashed = false) => {
      if (!pts || pts.length < 2) return;
      const path = pts.map(p => Array.isArray(p) ? { lat: p[0], lng: p[1] } : p);
      const opts = { path, geodesic: true, strokeColor: color, strokeOpacity: dashed ? 0.0 : 0.9, strokeWeight: weight, map };
      if (dashed) opts.icons = [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, strokeColor: color, scale: 3 }, offset: '0', repeat: '15px' }];
      activePolylines.current.push(new window.google.maps.Polyline(opts));
    };

    // Helper: fit bounds
    const fitBounds = (points) => {
      try {
        const bounds = new window.google.maps.LatLngBounds();
        points.filter(p => p && !isNaN(Array.isArray(p) ? p[0] : p.lat)).forEach(p => {
          bounds.extend(Array.isArray(p) ? { lat: p[0], lng: p[1] } : p);
        });
        if (!bounds.isEmpty()) setTimeout(() => { if (googleMapInstance.current) googleMapInstance.current.fitBounds(bounds); }, 150);
      } catch (e) { console.warn('Map bounds error:', e); }
    };

    const riderPos = (mapCoords.lat && mapCoords.lng && !isNaN(mapCoords.lat))
      ? { lat: mapCoords.lat, lng: mapCoords.lng } : null;

    // 1. Rider marker (green bike icon)
    if (riderPos) {
      const riderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42"><rect x="0" y="0" width="42" height="42" rx="21" fill="#10b981" stroke="white" stroke-width="3"/><g transform="translate(9,9)"><circle cx="9" cy="12.5" r="2.5" fill="none" stroke="white" stroke-width="1.8"/><circle cx="15" cy="12.5" r="2.5" fill="none" stroke="white" stroke-width="1.8"/><circle cx="12" cy="3" r="1" fill="white"/><path d="M8 12.5l2.5-4.5h3l2.5 4.5" fill="none" stroke="white" stroke-width="1.8"/></g></svg>`;
      activeMarkers.current.push(createMarker(riderPos, `You (Rider) — ${isOnline ? 'Online' : 'Offline'}`, riderSvg));
    }

    const orderToDraw = activeOrder || (incomingOrder && !incomingOrder.isRide ? incomingOrder : null);

    if (orderToDraw) {
      const storeCoords = orderToDraw.storeCoords || { lat: 23.0305, lng: 72.5075 };
      const customerCoords = orderToDraw.customerCoords || { lat: 23.0393, lng: 72.5244 };
      const storePt = { lat: storeCoords.lat, lng: storeCoords.lng };
      const custPt = { lat: customerCoords.lat, lng: customerCoords.lng };

      // Store marker (orange)
      const storeSvg2 = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42"><rect x="0" y="0" width="42" height="42" rx="12" fill="#f97316" stroke="white" stroke-width="3"/><g transform="translate(9,9)"><path d="m1 4 3-3h14l3 3v2H1V4z" fill="none" stroke="white" stroke-width="1.8"/><rect x="1" y="6" width="22" height="14" rx="1" fill="none" stroke="white" stroke-width="1.8"/><path d="M9 20v-4h6v4" fill="none" stroke="white" stroke-width="1.8"/></g></svg>`;
      activeMarkers.current.push(createMarker(storePt, `Store: ${orderToDraw.store}`, storeSvg2));

      // Customer marker (blue)
      const custSvg2 = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42"><rect x="0" y="0" width="42" height="42" rx="21" fill="#3b82f6" stroke="white" stroke-width="3"/><g transform="translate(9,9)"><path d="m1 6 11-5 11 5v13a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6z" fill="none" stroke="white" stroke-width="1.8"/><polyline points="6 24 6 12 12 12 12 24" stroke="white" stroke-width="1.8" fill="none"/></g></svg>`;
      activeMarkers.current.push(createMarker(custPt, `Customer: ${orderToDraw.customerName}`, custSvg2));

      const leg1Color = '#f97316', leg2Color = '#3b82f6';
      if (deliveryStep < 2) {
        if (riderPos) drawPoly(osrmRouteToStore?.length > 0 ? osrmRouteToStore : [riderPos, storePt], leg1Color);
        drawPoly(osrmRouteToCustomer?.length > 0 ? osrmRouteToCustomer : [storePt, custPt], leg2Color, 5, true);
      } else {
        if (riderPos) drawPoly([storePt, riderPos], '#94a3b8', 3, true);
        drawPoly(osrmRouteToCustomer?.length > 0 ? osrmRouteToCustomer : [(riderPos || storePt), custPt], leg2Color);
      }

      const allPts = [
        ...(osrmRouteToStore || []), ...(osrmRouteToCustomer || []),
        storePt, custPt, ...(riderPos ? [riderPos] : [])
      ];
      fitBounds(allPts);

    } else if (activeRide || incomingOrder?.isRide) {
      const pickup = activeRide ? { lat: activeRide.pickupLat, lng: activeRide.pickupLng } : incomingOrder.storeCoords;
      const dropoff = activeRide ? { lat: activeRide.dropLat, lng: activeRide.dropLng } : incomingOrder.customerCoords;
      const pLat = parseFloat(pickup?.lat), pLng = parseFloat(pickup?.lng);
      const dLat = parseFloat(dropoff?.lat), dLng = parseFloat(dropoff?.lng);

      if (isNaN(pLat) || isNaN(dLat) || pLat === 0) {
        if (riderPos) googleMapInstance.current.panTo(riderPos);
      } else {
        const pickupPt = { lat: pLat, lng: pLng }, dropoffPt = { lat: dLat, lng: dLng };

        // Pickup marker (green)
        const pickupSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42"><rect x="0" y="0" width="42" height="42" rx="21" fill="#22c55e" stroke="white" stroke-width="3"/><g transform="translate(9,9)"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white" transform="translate(-0.5,-1) scale(1)" stroke="none"/></g></svg>`;
        activeMarkers.current.push(createMarker(pickupPt, `Pickup: ${activeRide?.pickup || incomingOrder?.pickupAddress || 'Pickup Point'}`, pickupSvg));

        // Dropoff marker (red)
        const dropoffSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42"><rect x="0" y="0" width="42" height="42" rx="21" fill="#ef4444" stroke="white" stroke-width="3"/><g transform="translate(9,9)"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white" transform="translate(-0.5,-1) scale(1)" stroke="none"/></g></svg>`;
        activeMarkers.current.push(createMarker(dropoffPt, `Drop: ${activeRide?.dropoff || incomingOrder?.dropAddress || 'Drop Point'}`, dropoffSvg));

        const rideRouteColor = activeRide ? '#10b981' : '#f97316';
        const isDashed = !activeRide;
        const distanceVal = routeStats ? parseFloat(routeStats.distanceKm) : 0;
        const durationVal = routeStats ? routeStats.durationMins : 0;
        const speed = durationVal > 0 ? distanceVal / (durationVal / 60) : 25;
        const hasTraffic = speed < 22;

        if (osrmRouteToCustomer?.length > 0) {
          if (hasTraffic) {
            const splitIdx = Math.ceil(osrmRouteToCustomer.length * 0.35);
            drawPoly(osrmRouteToCustomer.slice(0, splitIdx + 1), '#ef4444', 6, isDashed);
            drawPoly(osrmRouteToCustomer.slice(splitIdx), '#10b981', 6, isDashed);
          } else {
            drawPoly(osrmRouteToCustomer, rideRouteColor, 6, isDashed);
          }
        } else {
          if (hasTraffic) {
            const mid = { lat: pLat + (dLat - pLat) * 0.35, lng: pLng + (dLng - pLng) * 0.35 };
            drawPoly([pickupPt, mid], '#ef4444', 6, isDashed);
            drawPoly([mid, dropoffPt], '#10b981', 6, isDashed);
          } else {
            drawPoly([pickupPt, dropoffPt], rideRouteColor, 6, isDashed);
          }
        }

        if (riderPos) drawPoly(osrmRouteToStore?.length > 0 ? osrmRouteToStore : [riderPos, pickupPt], '#3b82f6', 5, true);

        const allPts = [
          pickupPt, dropoffPt,
          ...(osrmRouteToStore || []), ...(osrmRouteToCustomer || []),
          ...(riderPos ? [riderPos] : [])
        ];
        fitBounds(allPts);
      }
    } else {
      // No active order — center on rider
      if (riderPos) {
        if (!hasCenteredRef.current) {
          googleMapInstance.current.setCenter(riderPos);
          googleMapInstance.current.setZoom(14);
          hasCenteredRef.current = true;
        } else {
          googleMapInstance.current.panTo(riderPos);
        }
      }
    }
  }, [mapCoords, activeOrder, incomingOrder, deliveryStep, isOnline, osrmRouteToStore, osrmRouteToCustomer, activeRide, rideStep, routeStats, isGoogleLoaded]);



  const handleUpdateMockGps = async () => {
    const lat = parseFloat(mockLat);
    const lng = parseFloat(mockLng);
    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Invalid coordinates");
      return;
    }
    const newCoords = { lat, lng };
    setMapCoords(newCoords);
    if (googleMapInstance.current) {
      googleMapInstance.current.panTo({ lat, lng });
    }
    toast.success(`Mock GPS set to: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    try {
      if (riderId) {
        await supabase
          .from('rider_locations')
          .upsert({
            rider_id: riderId,
            lat: lat,
            lng: lng,
            updated_at: new Date().toISOString()
          }, { onConflict: 'rider_id' });
      }
    } catch (e) {
      console.warn("Failed to sync mock location to DB:", e);
    }
  };

  const handleToggleOnline = async () => {
    let id = user?.id || user?.uid || user?.user_id;
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
    if (newStatus && localStorage.getItem('passwala_location_consent') !== 'accepted') {
      if (typeof setShowLocationDisclosure === 'function') {
        setShowLocationDisclosure(true);
      }
      return;
    }

    setIsOnline(newStatus);
    toast.success(newStatus ? "You are now online" : "You are offline");

    try {
      if (id) {
        await supabase
          .from('riders')
          .update({ is_active: newStatus })
          .eq('user_id', id);
        await supabase
          .from('city_vehicles')
          .update({ is_active: newStatus })
          .eq('driver_id', id);
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
    
    if (orderToStart?.dbId) {
       if (orderToStart.isRide) {
         try {
           // Get the vehicle for this driver
           let uid = user?.id || user?.uid || user?.user_id;
           if (!uid && user?.phoneNumber) {
             const phoneNo = user.phoneNumber.replace('+91', '');
             const { data } = await supabase.from('users').select('id').eq('phone', phoneNo).maybeSingle();
             if (data) uid = data.id;
           }
           
           const { data: vehicle } = await supabase
             .from('city_vehicles')
             .select('id, available_seats')
             .eq('driver_id', uid)
             .maybeSingle();
             
           if (!vehicle) {
             toast.error("No vehicle registered for this driver");
             return;
           }

            // Update the ticket booking with vehicle_id and ride_stage = 'CONFIRMED' via backend API to bypass RLS policies
            const baseUrl = import.meta.env.VITE_API_URL || '';
            const claimRes = await fetch(`${baseUrl}/api/city-rides/claim`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bookingId: orderToStart.dbId, vehicleId: vehicle.id })
            });
            const claimData = await claimRes.json();

            if (!claimRes.ok || !claimData.success) {
              toast.error(claimData.error || "Could not accept ride. It may have been taken by another driver.");
              setIncomingOrder(null);
              return;
            }

           // Decrement vehicle seats
           const newSeats = Math.max(0, vehicle.available_seats - orderToStart.items);
           await supabase
             .from('city_vehicles')
             .update({ available_seats: newSeats })
             .eq('id', vehicle.id);

           // Set activeRide locally
           setActiveRide({
             id: orderToStart.dbId,
             customerName: orderToStart.customerName,
             customerPhone: orderToStart.customerPhone,
             pickup: orderToStart.pickupAddress,
             dropoff: orderToStart.dropAddress,
             pickupLat: orderToStart.storeCoords.lat,
             pickupLng: orderToStart.storeCoords.lng,
             dropLat: orderToStart.customerCoords.lat,
             dropLng: orderToStart.customerCoords.lng,
             price: parseFloat(orderToStart.earnings.replace('₹', '')),
             seats: orderToStart.items,
             status: 'CONFIRMED'
           });
           setIncomingOrder(null);
           setRideStep(1); // Skip confirmation screen — go directly to EN_ROUTE
           toast.success("Ride Accepted! Head to the pickup point.");
         } catch (err) {
           console.error("Accept ride error:", err);
           toast.error("Failed to accept ride");
         }
       } else {
         try {
           // Step 1: Atomically claim the order — only succeeds if still PLACED (prevents race condition)
           const { data, error } = await supabase
             .from('orders')
             .update({ status: 'ACCEPTED' })
             .eq('id', orderToStart.dbId)
             .eq('status', 'PLACED')  // ← atomic: only update if still unclaimed
             .select('id');
             
           if (error || !data || data.length === 0) {
             console.error("Error accepting order (may already be claimed):", error);
             toast.error("Order already taken by another rider.");
             setIncomingOrder(null);
             return; // DO NOT PROCEED LOCALLY
           }

           // Step 2: Link the rider ID in delivery_tracking (rider_id exists there, not in orders)
           if (riderId && riderId.length > 20) {
             const { data: existingTracking } = await supabase
               .from('delivery_tracking')
               .select('id')
               .eq('order_id', orderToStart.dbId)
               .maybeSingle();

             if (existingTracking) {
               await supabase
                 .from('delivery_tracking')
                 .update({
                   rider_id: riderId,
                   status: 'ASSIGNED',
                   updated_at: new Date().toISOString()
                 })
                 .eq('order_id', orderToStart.dbId);
             } else {
               await supabase
                 .from('delivery_tracking')
                 .insert([{
                   order_id: orderToStart.dbId,
                   rider_id: riderId,
                   status: 'ASSIGNED',
                   updated_at: new Date().toISOString()
                 }]);
             }
           }
           
           // Step 3: Only proceed locally once the database absolutely confirms the claim
           setActiveOrder(orderToStart);
           setIncomingOrder(null);
           setDeliveryStep(0);
           toast.success('Order Accepted!');
         } catch (err) {
           console.error("Exception accepting order:", err);
           toast.error("Network error while accepting order.");
         }
       }
    }
  };

  const handleReject = () => {
    if (incomingOrder?.dbId) {
      const dbId = incomingOrder.dbId;
      setRejectedOrderIds(prev => {
        const next = [...prev, dbId];
        if (riderId) {
          localStorage.setItem(`passwala_rejected_orders_${riderId}`, JSON.stringify(next));
          // Update stats in real-time
          setStats(current => {
            const acceptedCount = current.deliveries || 0;
            const totalOffers = acceptedCount + next.length;
            const acceptanceRate = totalOffers > 0 ? Math.round((acceptedCount / totalOffers) * 100) : 100;
            return {
              ...current,
              acceptanceRate
            };
          });
        }
        return next;
      });
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
           let newDbStatus = 'CONFIRMED';
           let trackingStatus = 'ASSIGNED';
           if (nextIdx === 1) { newDbStatus = 'PREPARING'; trackingStatus = 'ASSIGNED'; }
           if (nextIdx === 2) { newDbStatus = 'PREPARING'; trackingStatus = 'PICKED_UP'; }
           if (nextIdx === 3) { newDbStatus = 'OUT_FOR_DELIVERY'; trackingStatus = 'PICKED_UP'; }
           if (nextIdx === 4) { newDbStatus = 'OUT_FOR_DELIVERY'; trackingStatus = 'DELIVERED'; }
           
           const { error } = await supabase.from('orders').update({ status: newDbStatus }).eq('id', activeOrder.dbId);
           if (error) console.error("Error updating order step:", error);
           
           await supabase.from('delivery_tracking').update({ status: trackingStatus }).eq('order_id', activeOrder.dbId);
         } catch (err) {
           console.error("Exception updating order step:", err);
         }
      }
    } else {
      if (activeOrder?.dbId) {
         try {
           const { error: completeErr } = await supabase.from('orders').update({ status: 'DELIVERED', updated_at: new Date().toISOString() }).eq('id', activeOrder.dbId);
           if (completeErr) {
             console.error("Error completing order:", completeErr);
             toast.error("Failed to complete delivery. Please try again.");
             return; // Stop execution, don't clear active order
           }
           
           await supabase.from('delivery_tracking').update({ status: 'DELIVERED' }).eq('order_id', activeOrder.dbId);
           
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
           
           setActiveOrder(null);
           setDeliveryStep(0);
         } catch (err) {
           console.error("Error completing delivery in DB:", err);
           toast.error("Network error while completing delivery.");
         }
      } else {
        setActiveOrder(null);
        setDeliveryStep(0);
      }
      toast.success('Delivery Completed Successfully!', { duration: 4000, icon: '🎉' });
    }
  };

  return (
    <div className="rider-screen relative" style={{ minHeight: '100%', paddingBottom: '2rem' }}>
      {/* Map Section */}
       <div style={isFullMap ? {
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'var(--bg-surface)',
          overflow: 'hidden',
          zIndex: 9999,
          margin: 0,
          borderRadius: 0,
          boxShadow: 'none',
          border: 'none'
       } : { 
          height: (activeOrder || activeRide) ? '220px' : '280px', 
          backgroundColor: 'var(--bg-surface)',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '24px',
          margin: '0 1rem 1.5rem 1rem',
          boxShadow: 'var(--rider-shadow-lg)',
          border: '1px solid var(--rider-border)',
          zIndex: 1
      }}>
        {/* Google Map Container */}
        <div 
          ref={mapRef} 
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        ></div>

        {/* Toggle Full Map Button */}
        <button 
          onClick={() => {
            setIsFullMap(!isFullMap);
          }}
          style={{ 
            position: 'absolute', 
            top: '1rem', 
            right: '1rem', 
            width: '48px', 
            height: '48px', 
            borderRadius: '16px', 
            background: 'var(--bg-card)', 
            border: 'none', 
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer',
            zIndex: 10,
            transition: 'transform 0.2s'
          }}
          title={isFullMap ? "Exit Full Screen" : "Open Full Screen"}
        >
          {isFullMap ? <Minimize2 size={22} color="var(--rider-primary)" /> : <Maximize2 size={22} color="var(--rider-primary)" />}
        </button>

        {/* GPS FAB Overlay */}
        <button 
          onClick={() => {
            hasCenteredRef.current = false;
            requestLiveLocation(true);
          }}
          style={{ 
            position: 'absolute', 
            bottom: '1rem', 
            right: '1rem', 
            width: '48px', 
            height: '48px', 
            borderRadius: '16px', 
            background: 'var(--bg-card)', 
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

        {!activeOrder && !activeRide ? (
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
                <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Hub</p>
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
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)' }}>SWITCH SERVICE AREA</p>
                  {activeAreas.map(area => (
                    <div 
                      key={area.id} 
                       onClick={async () => {
                        const coords = await geocodeAddress(area.area_name);
                        setMapCoords(coords);
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
          <>
            {/* OSRM Route Mode UI Selector */}
            <div style={{
              position: 'absolute', top: '1rem', left: '1rem', background: 'var(--bg-card)', padding: '0.6rem 0.8rem',
              borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
              gap: '6px', zIndex: 10, maxWidth: 'calc(100% - 140px)', pointerEvents: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase' }}>Route:</span>
              </div>
              <div style={{ display: 'flex', gap: '2px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2px', background: 'var(--bg-surface)' }}>
                {['cycling'].map(mode => (
                  <button
                    key={mode} onClick={() => setRouteMode(mode)}
                    style={{
                      border: 'none', background: routeMode === mode ? 'var(--rider-primary)' : 'transparent',
                      color: routeMode === mode ? 'white' : '#64748b', padding: '4px 8px', borderRadius: '6px',
                      fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {mode === 'driving' ? '🚗 Fast' : mode === 'cycling' ? '🚴 Bike' : '🚶 Walk'}
                  </button>
                ))}
              </div>
              {routeStats && (
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--rider-text)' }}>
                  <span>🛣️ {routeStats.distanceKm} km</span>
                  <span style={{ color: 'var(--rider-success)' }}>⏱️ {routeStats.durationMins} mins</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Online Status Toggle - Premium Card */}
      {!activeOrder && !incomingOrder && !activeRide && (
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
              <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '24px', border: '1px solid var(--rider-border)', boxShadow: 'var(--rider-shadow)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                    <div style={{ padding: '6px', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '8px', color: 'var(--rider-primary)' }}>
                      <IndianRupee size={16} />
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--rider-text-secondary)', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Earnings</p>
                  </div>
                  <p style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'var(--rider-text)' }}>₹{stats.earnings}</p>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '24px', border: '1px solid var(--rider-border)', boxShadow: 'var(--rider-shadow)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                    <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: 'var(--rider-success)' }}>
                      <Package size={16} />
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--rider-text-secondary)', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Orders</p>
                  </div>
                  <p style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, color: 'var(--rider-text)' }}>{stats.deliveries}</p>
              </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '24px', border: '1px solid var(--rider-border)', boxShadow: 'var(--rider-shadow)', marginTop: '1rem' }}>
              <div 
                  onClick={() => setShowGpsSimulator(!showGpsSimulator)} 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Navigation size={18} color="var(--rider-primary)" style={{ transform: 'rotate(45deg)' }} />
                    <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--rider-text)' }}>Developer GPS Simulator</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--rider-primary)', fontWeight: 700 }}>
                    {showGpsSimulator ? 'Hide' : 'Show'}
                  </span>
              </div>
              
              {showGpsSimulator && (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--rider-border)', paddingTop: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--rider-text-secondary)', display: 'block', marginBottom: '4px' }}>LATITUDE</label>
                              <input 
                                  type="text" 
                                  value={mockLat} 
                                  onChange={(e) => setMockLat(e.target.value)} 
                                  placeholder="e.g. 23.0225"
                                  style={{ width: '100%', padding: '0.5rem', border: '1.5px solid var(--rider-border)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
                              />
                          </div>
                          <div style={{ flex: 1 }}>
                              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--rider-text-secondary)', display: 'block', marginBottom: '4px' }}>LONGITUDE</label>
                              <input 
                                  type="text" 
                                  value={mockLng} 
                                  onChange={(e) => setMockLng(e.target.value)} 
                                  placeholder="e.g. 72.5714"
                                  style={{ width: '100%', padding: '0.5rem', border: '1.5px solid var(--rider-border)', borderRadius: '8px', fontSize: '0.85rem', outline: 'none' }}
                              />
                          </div>
                      </div>
                      <button 
                          onClick={handleUpdateMockGps}
                          style={{ width: '100%', padding: '0.6rem', background: 'var(--rider-primary)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                          Set Exact Location
                      </button>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                          <button 
                              onClick={() => { setMockLat('23.0225'); setMockLng('72.5714'); }}
                              style={{ padding: '4px 8px', fontSize: '0.65rem', background: 'var(--bg-surface)', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                          >
                              Ahmedabad Center
                          </button>
                          <button 
                              onClick={() => { setMockLat('23.0396'); setMockLng('72.5100'); }}
                              style={{ padding: '4px 8px', fontSize: '0.65rem', background: 'var(--bg-surface)', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                          >
                              Sindhu Bhavan Road
                          </button>
                          <button 
                              onClick={() => { setMockLat('23.0130'); setMockLng('72.5625'); }}
                              style={{ padding: '4px 8px', fontSize: '0.65rem', background: 'var(--bg-surface)', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                          >
                              Paldi
                          </button>
                      </div>
                  </div>
              )}
          </div>
        </div>
      )}

      {/* Incoming Order / Ride Modal */}
      {incomingOrder && (
        <div className="rider-modal-backdrop">
            <div className="rider-order-card">
               <div className="rider-order-header">
                  <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: incomingOrder.isRide ? '#f97316' : 'var(--rider-primary)', display: 'inline-block' }}></span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: incomingOrder.isRide ? '#f97316' : 'var(--rider-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {incomingOrder.isRide ? '🛵 New Ride Request' : '📦 New Order Request'}
                          </span>
                      </div>
                      <h3 style={{ margin: 0 }}>
                        <span className="rider-order-amount">{incomingOrder.earnings}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--rider-text-secondary)', marginLeft: '6px' }}>
                          {incomingOrder.isRide ? 'Ride Fare' : 'Order Value'}
                        </span>
                      </h3>
                  </div>
                  <div className="rider-order-time">
                      <Clock size={16} /> {incomingOrder.time}
                  </div>
               </div>

               <div className="rider-order-details">
                  <div className="rider-order-location">
                      <div style={{ marginTop: '4px' }}><MapPin color={incomingOrder.isRide ? '#f97316' : 'var(--rider-primary)'} size={20} /></div>
                       <div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0 }}>
                            {incomingOrder.isRide ? 'Pickup Point' : 'Pickup from'}
                          </p>
                          <p style={{ fontWeight: 700, margin: '0 0 2px 0' }}>
                            {incomingOrder.isRide ? incomingOrder.pickupAddress : incomingOrder.store}
                          </p>
                          {!incomingOrder.isRide && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                               <MapPin size={12} color="var(--rider-primary)" />
                               <span style={{ fontSize: '0.75rem', color: 'var(--rider-primary)', fontWeight: 600 }}>{incomingOrder.storeArea}</span>
                            </div>
                          )}
                          <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {incomingOrder.isRide ? '' : incomingOrder.pickupAddress}
                          </p>
                       </div>
                  </div>
                  <div style={{ borderLeft: '2px dashed #e5e7eb', marginLeft: '9px', height: '16px', marginTop: '-12px', marginBottom: '4px' }}></div>
                  <div className="rider-order-location" style={{ marginBottom: 0 }}>
                      <div style={{ marginTop: '4px' }}><Navigation color="var(--rider-success)" size={20} /></div>
                      <div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0 }}>
                            {incomingOrder.isRide ? 'Drop-off Point' : 'Deliver to'}
                          </p>
                          <p style={{ fontWeight: 700, margin: '0 0 2px 0', fontSize: '1rem' }}>
                            {incomingOrder.isRide ? incomingOrder.dropAddress : incomingOrder.customerName}
                          </p>
                          {!incomingOrder.isRide && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                               <MapPin size={12} color="var(--rider-primary)" />
                               <span style={{ fontSize: '0.8rem', color: 'var(--rider-primary)', fontWeight: 600 }}>{incomingOrder.area}</span>
                            </div>
                          )}
                          <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {incomingOrder.isRide ? '' : incomingOrder.dropAddress}
                          </p>
                      </div>
                  </div>
                  
                  {/* Footer stats — different for rides vs delivery */}
                  <div style={{ display: 'flex', padding: '1rem 0 0 0', marginTop: '1rem', borderTop: '1px dashed #e5e7eb', fontSize: '0.875rem', fontWeight: 600, color: 'var(--rider-text-secondary)', justifyContent: 'space-between' }}>
                    {incomingOrder.isRide ? (
                      <>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>🪑 {incomingOrder.items || 1} seat{(incomingOrder.items || 1) > 1 ? 's' : ''}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Navigation size={16}/> {incomingOrder.rideDistance || incomingOrder.distance}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📍 {incomingOrder.distance} away</span>
                      </>
                    ) : (
                      <>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Package size={16}/> {incomingOrder.items} items</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Navigation size={16}/> {incomingOrder.distance}</span>
                      </>
                    )}
                  </div>
               </div>

               <div className="rider-order-btn-group">
                  <button onClick={handleReject} className="rider-btn-reject">Reject</button>
                  <button onClick={handleAccept} className="rider-btn-accept" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                     {incomingOrder.isRide ? '🛵 Accept Ride' : 'Accept Order'} <ChevronRight size={20}/>
                  </button>
               </div>
            </div>
        </div>
      )}

      {/* Active Ride Card */}
      {activeRide && (
        <div className="rider-card" style={{ padding: 0, overflow: 'hidden', marginTop: '-1rem', position: 'relative', zIndex: 20, margin: '0 1rem 1.5rem 1rem', background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--rider-border)', boxShadow: 'var(--rider-shadow-lg)' }}>
            <div style={{ background: 'var(--rider-primary)', color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600, letterSpacing: '0.05em', margin: 0 }}>ACTIVE CITY RIDE</p>
                    <p style={{ fontWeight: 700, margin: 0 }}>{activeRide.customerName}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500, margin: 0 }}>Ride Price</p>
                    <p style={{ fontWeight: 700, color: 'white', fontSize: '1.125rem', margin: 0 }}>₹{activeRide.price}</p>
                </div>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <MapPin color="var(--rider-primary)" size={20} style={{ marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0 }}>Pickup Location</p>
                    <p style={{ fontWeight: 700, margin: 0 }}>{activeRide.pickup}</p>
                  </div>
                </div>

                <div style={{ borderLeft: '2px dashed #e5e7eb', marginLeft: '9px', height: '16px', marginTop: '-8px', marginBottom: '-8px' }}></div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <Navigation color="var(--rider-success)" size={20} style={{ marginTop: '2px' }} />
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--rider-text-secondary)', margin: 0 }}>Drop-off Location</p>
                    <p style={{ fontWeight: 700, margin: 0 }}>{activeRide.dropoff}</p>
                  </div>
                </div>

                <div style={{ borderTop: '1px dashed #e5e7eb', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--rider-text-secondary)' }}>
                  <span>Seats: <strong>{activeRide.seats}</strong></span>
                  {activeRide.luggageWeight > 0 && (
                    <span>Luggage: <strong>{activeRide.luggageWeight} kg</strong></span>
                  )}
                  <span>Ticket ID: <strong>{activeRide.qrHash ? activeRide.qrHash.split('-')[2] || activeRide.qrHash.substring(0, 8).toUpperCase() : ''}</strong></span>
                </div>

                {/* Ride Stepper */}
                <h3 style={{ fontWeight: 700, fontSize: '1.05rem', margin: '1rem 0 1rem 0', textAlign: 'center', color: 'var(--rider-text)' }}>Ride Progress</h3>
                <div className="rider-stepper" style={{ marginBottom: '1rem' }}>
                    <div className="rider-stepper-line" style={{ height: '75%', top: '12%' }}></div>
                    <div className="rider-stepper-progress" style={{ height: `${(rideStep / 3) * 75}%`, top: '12%', background: 'var(--rider-success)' }}></div>

                    {[
                      { title: 'Head to Pickup', desc: 'Start heading to the pickup location' },
                      { title: 'Arrive at Pickup', desc: 'Arrived at pickup — wait for customer' },
                      { title: 'Verify Customer', desc: 'Scan QR code / Enter Ticket ID to start' },
                      { title: 'Drop to Complete', desc: 'Ride in progress, head to drop-off location' }
                    ].map((step, idx) => {
                        const isCompleted = idx < rideStep;
                        const isCurrent = idx === rideStep;
                        return (
                            <div key={idx} className={`rider-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`} style={{ opacity: isCurrent ? 1 : isCompleted ? 0.7 : 0.4 }}>
                                <div className="rider-step-icon">
                                    {isCompleted ? <Check size={14} strokeWidth={3} /> : idx + 1}
                                </div>
                                <div className="rider-step-content">
                                    <h4>{step.title}</h4>
                                    {isCurrent && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--rider-text-secondary)' }}>{step.desc}</p>}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div style={{ padding: '1rem', background: 'var(--rider-bg)', borderTop: '1px solid var(--rider-border)' }}>
                {rideStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--rider-text-secondary)', textTransform: 'uppercase' }}>Customer Verification Code</p>
                    <input 
                      type="text" 
                      value={activeRide.qrHash ? activeRide.qrHash.split('-')[2] || activeRide.qrHash.substring(0, 8).toUpperCase() : ''} 
                      disabled
                      style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'var(--bg-surface)', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', textAlign: 'center', letterSpacing: '2px' }} 
                    />
                  </div>
                )}


                {rideStep === 0 && (
                  <button 
                      onClick={() => { updateRideStatus('EN_ROUTE', 1); toast.success("Starting route to pickup!"); }}
                      className="rider-btn-primary"
                      style={{ width: '100%', margin: 0 }}
                  >
                      Head to Pickup
                      <Navigation size={20} style={{ transform: 'rotate(45deg)' }} />
                  </button>
                )}

                {rideStep === 1 && (
                  <button 
                      onClick={() => { updateRideStatus('ARRIVED', 2); toast.success("Arrived at pickup point. Ready to verify customer."); }}
                      className="rider-btn-primary"
                  >
                      Confirm Arrived
                      <Navigation size={20} style={{ transform: 'rotate(45deg)' }} />
                  </button>
                )}

                {rideStep === 2 && (
                  <button 
                      onClick={() => { updateRideStatus('IN_PROGRESS', 3); toast.success("Verification successful! Ride started."); }}
                      className="rider-btn-primary"
                      style={{ background: 'var(--rider-primary)' }}
                  >
                      Verify & Start Ride
                      <CheckCircle size={20} />
                  </button>
                )}

                {rideStep === 3 && (
                  <button 
                      onClick={handleCompleteRide}
                      className="rider-btn-primary"
                      style={{ background: 'var(--rider-success)' }}
                  >
                      Complete Ride
                      <CheckCircle size={20} />
                  </button>
                )}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    {activeRide.customerPhone && (
                      <button 
                          onClick={() => window.open(`tel:${activeRide.customerPhone}`, '_self')} 
                          style={{ flex: 1, padding: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                          <Phone size={18} color="#64748b" /> Call Passenger
                      </button>
                    )}
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
                
                <div className="rider-stepper" style={{ paddingLeft: 0 }}>
                    {/* Vertical line */}
                    <div style={{
                      position: 'absolute',
                      left: '11px',
                      top: '12px',
                      bottom: '12px',
                      width: '2px',
                      background: 'var(--rider-border)',
                      zIndex: 0
                    }} />
                    {/* Progress line */}
                    <div style={{
                      position: 'absolute',
                      left: '11px',
                      top: '12px',
                      width: '2px',
                      height: `calc((100% - 24px) * ${deliveryStep / (steps.length - 1)})`,
                      background: 'var(--rider-primary)',
                      transition: 'height 0.5s ease',
                      zIndex: 1
                    }} />

                    {steps.map((step, idx) => {
                        const isCompleted = idx < deliveryStep;
                        const isCurrent = idx === deliveryStep;
                        const isFuture = idx > deliveryStep;
                        const stepDescriptions = [
                          `Navigate to ${activeOrder.store}`,
                          `Confirm items at ${activeOrder.store}`,
                          'Verify package and start trip',
                          `Head to ${activeOrder.dropAddress}`,
                          'Deliver package and complete order'
                        ];
                        return (
                            <div key={idx} style={{
                              display: 'flex',
                              alignItems: isCompleted ? 'center' : 'flex-start',
                              gap: '0.75rem',
                              marginBottom: isCompleted ? '0.6rem' : isCurrent ? '1.25rem' : '0.75rem',
                              position: 'relative',
                              paddingLeft: '1.5rem',
                              opacity: isFuture ? 0.4 : 1,
                              transition: 'all 0.3s'
                            }}>
                              {/* Step icon */}
                              <div style={{
                                width: '24px',
                                height: '24px',
                                minWidth: '24px',
                                borderRadius: '50%',
                                background: isCompleted ? 'var(--rider-primary)' : isCurrent ? 'white' : 'var(--rider-card)',
                                border: isCompleted ? '2px solid var(--rider-primary)' : isCurrent ? '2px solid var(--rider-primary)' : '2px solid var(--rider-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isCompleted ? 'white' : isCurrent ? 'var(--rider-primary)' : '#94a3b8',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                marginLeft: '-24px',
                                zIndex: 10,
                                boxShadow: isCurrent ? '0 0 0 3px rgba(249,115,22,0.15)' : 'none',
                                transition: 'all 0.3s'
                              }}>
                                {isCompleted ? <Check size={12} strokeWidth={3} /> : isCurrent ? <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--rider-primary)' }} /> : idx + 1}
                              </div>
                              {/* Step content */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{
                                  margin: 0,
                                  fontWeight: isCompleted ? 600 : 700,
                                  fontSize: isCompleted ? '0.78rem' : '0.9rem',
                                  color: isCompleted ? '#64748b' : isCurrent ? 'var(--rider-text)' : '#9ca3af',
                                  textDecoration: isCompleted ? 'line-through' : 'none',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>{step}</h4>
                                {isCurrent && (
                                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.78rem', color: 'var(--rider-text-secondary)', lineHeight: 1.4 }}>
                                    {stepDescriptions[idx]}
                                  </p>
                                )}
                              </div>
                              {/* Completed checkmark badge */}
                              {isCompleted && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--rider-primary)', fontWeight: 700, whiteSpace: 'nowrap' }}>Done ✓</span>
                              )}
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
                            style={{ flex: 1, padding: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
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
                            style={{ flex: 1, padding: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
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
                            style={{ flex: 1, padding: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
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
                            style={{ flex: 1, padding: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'var(--bg-card)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
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

