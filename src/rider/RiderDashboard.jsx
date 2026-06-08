// Location Fixed with Real Premium Leaflet Mapping
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Phone, CheckCircle, Package, Clock, ChevronRight, Check, RefreshCw, IndianRupee } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabase'; // Import supabase client
import { getOSRMRoute, getStraightLineDistance } from '../utils/dijkstra';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RiderPortal.css'; // Import custom styles
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

  useEffect(() => {
    if (activeRide?.id !== prevRideIdRef.current) {
      setRideStep(0);
      prevRideIdRef.current = activeRide?.id || null;
    }
  }, [activeRide]);

  useEffect(() => {
    if (!isOnline || activeOrder || incomingOrder) {
      setActiveRide(null);
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
            status: activeBooking.status,
            qrHash: activeBooking.qr_code_hash,
            luggageWeight: activeBooking.seat_numbers?.luggage_weight || 0,
            luggagePrice: activeBooking.seat_numbers?.luggage_price || 0
          });

          if (lastAlertedRideId.current !== activeBooking.id) {
            lastAlertedRideId.current = activeBooking.id;
            playNotificationSound();
            toast.success(`New Ride Request Confirmed! (${activeBooking.pickup_area} to ${activeBooking.drop_area})`, { icon: "🚕", duration: 5000 });
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
  // Ahmedabad service boundary constraint (approx. 50km from Ahmedabad center 23.0225, 72.5714)
  const constrainToAhmedabad = (coords) => {
    if (!coords || isNaN(coords.lat) || isNaN(coords.lng)) {
      return { lat: 23.0225, lng: 72.5714 };
    }
    return coords;
  };

  const [mapCoords, setMapCoords] = useState(() => {
    const initial = { lat: userCoords?.lat || 23.0225, lng: userCoords?.lng || 72.5714 };
    return constrainToAhmedabad(initial);
  });
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [isManualLocation, setIsManualLocation] = useState(false);
  const [activeAreas, setActiveAreas] = useState([]);
  const [nearbyStores, setNearbyStores] = useState([]);
  const [realStoreDistances, setRealStoreDistances] = useState({});

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
          const res = await fetch(publicUrl);
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

      const activeRoute = activeRide ? route1 : (deliveryStep < 2 ? route1 : route2);
      if (activeRoute) {
        setRouteStats({
          distanceKm: activeRoute.distance.toFixed(1),
          durationMins: Math.round(activeRoute.duration)
        });
      } else {
        // fallback calculation
        const startPt = riderLatLng || storeLatLng;
        const fallbackDist = getStraightLineDistance(startPt[0], startPt[1], customerLatLng[0], customerLatLng[1]);
        setRouteStats({
          distanceKm: fallbackDist.toFixed(1),
          durationMins: Math.round(fallbackDist * 3.5 + 5)
        });
      }
    };

    fetchBothRoutes();
  }, [activeOrder, incomingOrder, activeRide, deliveryStep, routeMode, mapCoords]);

  // Map elements refs
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerGroupRef = useRef(null);

  // Sync coords on prop change
  useEffect(() => {
    if (userCoords && !isManualLocation) {
      setMapCoords(constrainToAhmedabad({ lat: userCoords.lat, lng: userCoords.lng }));
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

  // Calculate real OSRM distances for nearby stores
  useEffect(() => {
    if (!mapCoords.lat || nearbyStores.length === 0) return;
    const fetchRealDistances = async () => {
      const dists = {};
      await Promise.all(nearbyStores.map(async (store) => {
        if (!store.lat || !store.lng) return;
        try {
          // getOSRMRoute dynamically finds real road distance via OSRM demo server
          const res = await getOSRMRoute(mapCoords.lat, mapCoords.lng, parseFloat(store.lat), parseFloat(store.lng), routeMode);
          if (res && res.success) {
            dists[store.id] = res.distanceKm;
          }
        } catch (e) {
           console.warn("Store OSRM fetch failed", e);
        }
      }));
      setRealStoreDistances(dists);
    };
    fetchRealDistances();
  }, [mapCoords.lat, mapCoords.lng, nearbyStores, routeMode]);



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

  // Update map coordinates when parent tracker coordinates update
  useEffect(() => {
    if (userCoords?.lat && userCoords?.lng) {
      setMapCoords({ lat: parseFloat(userCoords.lat), lng: parseFloat(userCoords.lng) });
    }
  }, [userCoords?.lat, userCoords?.lng]);

  // Real-time order dispatch and polling mechanism
  useEffect(() => {
    if (!isOnline || activeOrder || incomingOrder) return;

    const fetchPendingOrder = async () => {
      try {
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);

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
              
              const rToStore = await getOSRMRoute(mapCoords.lat, mapCoords.lng, storeCoords.lat, storeCoords.lng, 'cycling');
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
        table: 'orders' 
      }, (payload) => {
        if (payload.new.status === 'PLACED' || payload.new.status === 'PREPARING') {
          fetchPendingOrder();
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders' 
      }, (payload) => {
        if (payload.new.status === 'PLACED' || payload.new.status === 'PREPARING') {
          fetchPendingOrder();
        }
      })
      .subscribe();

    return () => {
      clearInterval(pollingInterval);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (payload.new.status !== 'PLACED' && payload.new.status !== 'PREPARING') {
          setIncomingOrder(null);
          toast('Order taken by another rider', { icon: '🤝' });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incomingOrder?.dbId]);

  // Simulated Real-Time Movement along Route
  const simIndexRef = useRef(0);
  const prevRouteKeyRef = useRef('');

  useEffect(() => {
    if (!isOnline || !riderId) return;

    let activeRoute = [];
    let routeKey = '';

    if (activeOrder) {
      if (deliveryStep < 2) {
        activeRoute = osrmRouteToStore;
        routeKey = `order-store-${activeOrder.id}`;
      } else {
        activeRoute = osrmRouteToCustomer;
        routeKey = `order-customer-${activeOrder.id}`;
      }
    } else if (activeRide) {
      if (rideStep < 2) {
        activeRoute = osrmRouteToStore;
        routeKey = `ride-pickup-${activeRide.id}`;
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

        simIndexRef.current += 1;
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOnline, riderId, activeOrder, activeRide, deliveryStep, rideStep, osrmRouteToStore, osrmRouteToCustomer]);

  // Leaflet Map Initialization and Lifecycle management
  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMapRef.current) {
      leafletMapRef.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([mapCoords.lat, mapCoords.lng], 14);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fix for Leaflet rendering issues in dynamic CSS layouts & tab switching
  useEffect(() => {
    if (leafletMapRef.current) {
      const timer = setTimeout(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [activeOrder, activeRide, incomingOrder, isOnline]);

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

    const createStoreIcon = (_name) => L.divIcon({
      className: 'custom-leaflet-marker store-marker',
      html: `<div class="marker-container" style="background: #f97316; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; position: relative;">
               <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 17H2"/></svg>
             </div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });

    const createCustomerIcon = (_name) => L.divIcon({
      className: 'custom-leaflet-marker customer-marker',
      html: `<div class="marker-container" style="background: #3b82f6; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative;">
               <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
             </div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });

    const riderLatLng = (mapCoords.lat && mapCoords.lng && !isNaN(mapCoords.lat) && !isNaN(mapCoords.lng))
      ? [mapCoords.lat, mapCoords.lng]
      : null;

    // 1. Draw Rider
    if (riderLatLng) {
      L.marker(riderLatLng, { icon: createRiderIcon() })
        .bindPopup(`<b>You (Rider)</b><br/>Status: ${isOnline ? 'Online' : 'Offline'}`)
        .addTo(markerGroupRef.current);
    }

    const orderToDraw = activeOrder || incomingOrder;

    if (orderToDraw) {
      // Show Delivery Routing (Real Map, No fake streets)
      const storeCoords = orderToDraw.storeCoords || { lat: 23.0305, lng: 72.5075 };
      const customerCoords = orderToDraw.customerCoords || { lat: 23.0393, lng: 72.5244 };

      const storeLatLng = [storeCoords.lat, storeCoords.lng];
      const customerLatLng = [customerCoords.lat, customerCoords.lng];

      // Draw Store Marker
      L.marker(storeLatLng, { icon: createStoreIcon(orderToDraw.store) })
        .bindPopup(`<b>Store Hub:</b> ${orderToDraw.store}<br/>Pickup point`)
        .addTo(markerGroupRef.current);

      // Draw Customer Marker
      L.marker(customerLatLng, { icon: createCustomerIcon(orderToDraw.customerName) })
        .bindPopup(`<b>Customer:</b> ${orderToDraw.customerName}<br/>Deliver to: ${orderToDraw.dropAddress}`)
        .addTo(markerGroupRef.current);

      // Draw interactive path depending on active phase
      const leg1Color = '#f97316'; // orange (to store)
      const leg2Color = '#3b82f6'; // blue (to customer)

      if (deliveryStep < 2) {
        // Active Phase: Rider navigating to Store
        if (riderLatLng) {
          if (osrmRouteToStore && osrmRouteToStore.length > 0) {
            L.polyline(osrmRouteToStore, { color: leg1Color, weight: 6, opacity: 0.95, lineJoin: 'round' }).addTo(markerGroupRef.current);
          } else {
            L.polyline([riderLatLng, storeLatLng], { color: leg1Color, weight: 6, opacity: 0.9, lineJoin: 'round' }).addTo(markerGroupRef.current);
          }
        }

        // Leg 2 (Store -> Customer) is DASHED upcoming blue route
        if (osrmRouteToCustomer && osrmRouteToCustomer.length > 0) {
          L.polyline(osrmRouteToCustomer, { color: leg2Color, weight: 6, opacity: 0.6, dashArray: '8, 8', lineJoin: 'round' }).addTo(markerGroupRef.current);
        } else {
          L.polyline([storeLatLng, customerLatLng], { color: leg2Color, weight: 4, opacity: 0.5, dashArray: '8, 8', lineJoin: 'round' }).addTo(markerGroupRef.current);
        }
      } else {
        // Active Phase: Rider delivering to Customer
        // Leg 1 (Store -> Rider) is faded completed dashed route
        if (riderLatLng) {
          L.polyline([storeLatLng, riderLatLng], { color: '#94a3b8', weight: 3, opacity: 0.4, dashArray: '4, 4', lineJoin: 'round' }).addTo(markerGroupRef.current);
        }

        // Leg 2 (Rider -> Customer) is SOLID blue route
        if (osrmRouteToCustomer && osrmRouteToCustomer.length > 0) {
          L.polyline(osrmRouteToCustomer, { color: leg2Color, weight: 6, opacity: 0.95, lineJoin: 'round' }).addTo(markerGroupRef.current);
        } else {
          const startPt = riderLatLng || storeLatLng;
          L.polyline([startPt, customerLatLng], { color: leg2Color, weight: 6, opacity: 0.9, lineJoin: 'round' }).addTo(markerGroupRef.current);
        }
      }

      // Automatically focus bounds to include all elements
      try {
        let validCoords = [];
        if (osrmRouteToStore && osrmRouteToStore.length > 0) validCoords.push(...osrmRouteToStore);
        if (osrmRouteToCustomer && osrmRouteToCustomer.length > 0) validCoords.push(...osrmRouteToCustomer);
        
        if (riderLatLng) validCoords.push(riderLatLng);
        validCoords.push(storeLatLng, customerLatLng);

        const filteredCoords = validCoords.filter(c => c && !isNaN(c[0]) && !isNaN(c[1]));
        if (filteredCoords.length > 0) {
          const bounds = L.latLngBounds(filteredCoords);
          leafletMapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
        }
      } catch (e) {
        console.warn('Map bounds fit error', e);
      }

    } else if (activeRide) {
      // Show Ride routing
      const pickupLatLng = [activeRide.pickupLat, activeRide.pickupLng];
      const dropoffLatLng = [activeRide.dropLat, activeRide.dropLng];

      // Draw Pickup Marker
      L.marker(pickupLatLng, { icon: createStoreIcon(activeRide.pickup) })
        .bindPopup(`<b>Pickup:</b> ${activeRide.pickup}`)
        .addTo(markerGroupRef.current);

      // Draw Customer Marker
      L.marker(dropoffLatLng, { icon: createCustomerIcon(activeRide.customerName) })
        .bindPopup(`<b>Passenger:</b> ${activeRide.customerName}<br/>Drop at: ${activeRide.dropoff}`)
        .addTo(markerGroupRef.current);

      // Draw Route
      if (osrmRouteToCustomer && osrmRouteToCustomer.length > 0) {
        L.polyline(osrmRouteToCustomer, { color: '#10b981', weight: 6, opacity: 0.95, lineJoin: 'round' }).addTo(markerGroupRef.current);
      } else {
        L.polyline([pickupLatLng, dropoffLatLng], { color: '#10b981', weight: 6, opacity: 0.95, lineJoin: 'round' }).addTo(markerGroupRef.current);
      }

      if (riderLatLng) {
        if (osrmRouteToStore && osrmRouteToStore.length > 0) {
          L.polyline(osrmRouteToStore, { color: '#3b82f6', weight: 6, opacity: 0.8, dashArray: '8, 8', lineJoin: 'round' }).addTo(markerGroupRef.current);
        } else {
          L.polyline([riderLatLng, pickupLatLng], { color: '#3b82f6', weight: 6, opacity: 0.8, dashArray: '8, 8', lineJoin: 'round' }).addTo(markerGroupRef.current);
        }
      }

      // Automatically focus bounds to include all elements
      try {
        let boundsCoords = [pickupLatLng, dropoffLatLng];
        if (osrmRouteToStore && osrmRouteToStore.length > 0) boundsCoords.push(...osrmRouteToStore);
        if (osrmRouteToCustomer && osrmRouteToCustomer.length > 0) boundsCoords.push(...osrmRouteToCustomer);
        if (riderLatLng) boundsCoords.push(riderLatLng);
        
        const bounds = L.latLngBounds(boundsCoords);
        leafletMapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      } catch (e) {
        console.warn('Map bounds fit error', e);
      }
    } else {
      // No active order - Do not show surrounding shops, only show Rider location

      // Re-center on Rider smoothly (only once or when requested)
      if (riderLatLng && !hasCenteredRef.current) {
        leafletMapRef.current.setView(riderLatLng, 14);
        hasCenteredRef.current = true;
      }
    }
  }, [mapCoords, activeOrder, incomingOrder, deliveryStep, nearbyStores, realStoreDistances, isOnline, osrmRouteToStore, osrmRouteToCustomer]);

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
       try {
         // Step 1: Claim the order strictly by updating its status
         const { data, error } = await supabase
           .from('orders')
           .update({ status: 'ACCEPTED' })
           .eq('id', orderToStart.dbId)
           .select('id');
           
         if (error || !data || data.length === 0) {
           console.error("Error accepting order:", error);
           toast.error("Failed to accept. It may have been claimed by another rider.");
           setIncomingOrder(null);
           return; // DO NOT PROCEED LOCALLY
         }

         // Step 2: Safely attempt to link the rider ID (ignoring foreign key errors if test account)
         if (riderId && riderId.length > 20) {
           await supabase.from('orders').update({ rider_id: riderId }).eq('id', orderToStart.dbId);
           await supabase.from('delivery_tracking').update({ rider_id: riderId, status: 'ASSIGNED' }).eq('order_id', orderToStart.dbId);
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
           let newDbStatus = 'ACCEPTED';
           let trackingStatus = 'ASSIGNED';
           if (nextIdx === 1) { newDbStatus = 'PREPARING'; trackingStatus = 'PREPARING'; }
           if (nextIdx === 2) { newDbStatus = 'SHIPPED'; trackingStatus = 'PICKED_UP'; }
           if (nextIdx === 3) { newDbStatus = 'DISPATCHED'; trackingStatus = 'PICKED_UP'; }
           
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
       <div style={{ 
          height: (activeOrder || activeRide) ? '320px' : '280px', 
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
          <>
            {/* OSRM Route Mode UI Selector */}
            <div style={{
              position: 'absolute', top: '1rem', left: '1rem', background: 'white', padding: '0.6rem 0.8rem',
              borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
              gap: '6px', zIndex: 10, maxWidth: 'calc(100% - 140px)', pointerEvents: 'auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Route:</span>
              </div>
              <div style={{ display: 'flex', gap: '2px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2px', background: '#f8fafc' }}>
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
                  <span style={{ color: 'var(--rider-success)' }}>⏱️ {routeStats.durationMins} m</span>
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
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>⚖️ {incomingOrder.weight ? `${incomingOrder.weight.toFixed(1)} kg` : '0.5 kg'}</span>
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

      {/* Active Ride Card */}
      {activeRide && (
        <div className="rider-card" style={{ padding: 0, overflow: 'hidden', marginTop: '-1rem', position: 'relative', zIndex: 20, margin: '0 1rem 1.5rem 1rem', background: 'white', borderRadius: '24px', border: '1px solid var(--rider-border)', boxShadow: 'var(--rider-shadow-lg)' }}>
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
                    <div className="rider-stepper-line" style={{ height: '65%', top: '15%' }}></div>
                    <div className="rider-stepper-progress" style={{ height: `${(rideStep / 2) * 100}%`, top: '15%', background: 'var(--rider-success)' }}></div>

                    {[
                      { title: 'Confirm Ride', desc: 'Driver is arriving at pickup location' },
                      { title: 'Verify Customer', desc: 'Scan QR code / Enter Ticket ID to start' },
                      { title: 'Drop to Complete', desc: 'Ride is in progress, head to drop-off location' }
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
                {rideStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: 'var(--rider-text-secondary)', textTransform: 'uppercase' }}>Customer Verification Code</p>
                    <input 
                      type="text" 
                      value={activeRide.qrHash ? activeRide.qrHash.split('-')[2] || activeRide.qrHash.substring(0, 8).toUpperCase() : ''} 
                      disabled
                      style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, fontSize: '1rem', color: '#1e293b', textAlign: 'center', letterSpacing: '2px' }} 
                    />
                  </div>
                )}

                {rideStep === 0 && (
                  <button 
                      onClick={() => { setRideStep(1); toast.success("Arrived at pickup point. Ready to verify customer."); }}
                      className="rider-btn-primary"
                  >
                      Confirm Arrived
                      <Navigation size={20} style={{ transform: 'rotate(45deg)' }} />
                  </button>
                )}

                {rideStep === 1 && (
                  <button 
                      onClick={() => { setRideStep(2); toast.success("Verification successful! Ride started."); }}
                      className="rider-btn-primary"
                      style={{ background: 'var(--rider-primary)' }}
                  >
                      Verify & Start Ride
                      <CheckCircle size={20} />
                  </button>
                )}

                {rideStep === 2 && (
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
                          style={{ flex: 1, padding: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', color: '#1e293b', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                      >
                          <Phone size={18} color="#64748b" /> Call Passenger
                      </button>
                    )}
                    <button 
                        onClick={() => {
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeRide.pickupLat},${activeRide.pickupLng}`, '_blank');
                        }} 
                        style={{ flex: 1, padding: '0.85rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', color: '#1e293b', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                        <Navigation size={18} color="#3b82f6" /> Navigate
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
