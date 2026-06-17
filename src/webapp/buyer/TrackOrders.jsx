/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle, Clock, MapPin, ChevronRight, MessageCircle, X, Store, CreditCard, Wrench, Download, Bike, Navigation } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import './TrackOrders.css';
import '../profile_pages/ProfilePages.css';
import { supabase } from '../../supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNotifications } from '../../context/NotificationContext';
import { AHMEDABAD_AREA_COORDS } from '../../utils/constants';

// ── Google Maps Order Tracking Map ───────────────────────────────────────────
function OrderTrackingMap({ order, riderCoords, userCoords, isService }) {
  const googleMapRef = useRef(null);
  const googleMapInstance = useRef(null);
  const activeMarkers = useRef([]);
  const activePolylines = useRef([]);
  const isMapReady = useRef(false);
  const isGoogleLoaded = useGoogleMaps();

  // Local state for coordinates and routes
  const [storeLatLng, setStoreLatLng] = useState(null);
  const [customerLatLng, setCustomerLatLng] = useState(null);
  const [routeToStorePoints, setRouteToStorePoints] = useState([]);
  const [routeToCustomerPoints, setRouteToCustomerPoints] = useState([]);
  const [providerDetails, setProviderDetails] = useState(null);

  // Geocode helper using local lookup then Nominatim fallback
  const geocodeAddress = useCallback(async (address) => {
    if (!address) return null;
    const lower = address.toLowerCase().replace(/[.,]/g, ' ');
    const words = lower.split(/\s+/).filter(Boolean);
    for (let len = Math.min(words.length, 4); len >= 1; len--) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        if (AHMEDABAD_AREA_COORDS[phrase]) return AHMEDABAD_AREA_COORDS[phrase];
      }
    }
    for (const [area, coords] of Object.entries(AHMEDABAD_AREA_COORDS)) {
      if (lower.includes(area)) return coords;
    }
    try {
      const city = userCoords?.city || 'Ahmedabad';
      const q = lower.includes(city.toLowerCase()) ? address : `${address}, ${city}, Gujarat, India`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=in`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Passwalaa-App/1.0' } });
      if (res.ok) {
        const data = await res.json();
        if (data?.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (e) { console.warn('Geocoding error:', e); }
    return AHMEDABAD_AREA_COORDS['ahmedabad'] || [23.0225, 72.5714];
  }, [userCoords?.city]);

  // Fetch service provider details if this is a service order
  useEffect(() => {
    if (!isService || !order.items?.length) return;
    const serviceName = order.items[0].name;
    const fetchProvider = async () => {
      try {
        const { data: sd } = await supabase.from('services').select('provider_id').ilike('title', `%${serviceName}%`).limit(1).maybeSingle();
        if (sd?.provider_id) {
          const { data: prov } = await supabase.from('service_providers').select('*').eq('id', sd.provider_id).maybeSingle();
          if (prov) setProviderDetails(prov);
        }
      } catch (e) { console.error('Provider fetch error:', e); }
    };
    fetchProvider();
  }, [isService, order]);

  // Track service provider in real-time
  useEffect(() => {
    if (!isService || !providerDetails?.id) return;
    const channel = supabase.channel(`provider-${providerDetails.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'service_providers', filter: `id=eq.${providerDetails.id}` }, (payload) => {
        if (payload.new?.lat != null) {
          setProviderDetails(prev => ({ ...prev, lat: parseFloat(payload.new.lat), lng: parseFloat(payload.new.lng) }));
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isService, providerDetails?.id]);

  // Resolve store + customer coordinates
  useEffect(() => {
    let active = true;
    const resolve = async () => {
      let storePos = null;
      if (isService && providerDetails) {
        storePos = await geocodeAddress(providerDetails.address || 'Ahmedabad') || [23.0305, 72.5075];
      } else if (order.stores?.lat && order.stores?.lng) {
        storePos = [parseFloat(order.stores.lat), parseFloat(order.stores.lng)];
      } else {
        storePos = await geocodeAddress(order.stores?.address || 'Ahmedabad') || [23.0305, 72.5075];
      }

      let custPos = null;
      if (order.addresses?.lat && order.addresses?.lng) {
        custPos = [parseFloat(order.addresses.lat), parseFloat(order.addresses.lng)];
      } else if (userCoords?.lat && userCoords?.lng) {
        custPos = [parseFloat(userCoords.lat), parseFloat(userCoords.lng)];
      } else {
        custPos = await geocodeAddress(order.addresses?.address_line_1 || 'Ahmedabad') || [23.0393, 72.5244];
      }

      if (active) { setStoreLatLng(storePos); setCustomerLatLng(custPos); }
    };
    resolve();
    return () => { active = false; };
  }, [order.stores, order.addresses, isService, providerDetails, userCoords?.lat, userCoords?.lng, geocodeAddress]);

  // Fetch OSRM road routes
  useEffect(() => {
    if (!storeLatLng || !customerLatLng) return;
    let riderLatLng = riderCoords?.lat && riderCoords?.lng
      ? [parseFloat(riderCoords.lat), parseFloat(riderCoords.lng)]
      : (isService && providerDetails?.lat && providerDetails?.lng
        ? [parseFloat(providerDetails.lat), parseFloat(providerDetails.lng)]
        : null);

    const fetchRoute = async (start, end) => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Passwalaa-App/1.0' } });
        const data = await res.json();
        if (data.code === 'Ok' && data.routes?.[0]) {
          return data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        }
      } catch (e) { console.warn('Route fetch error:', e); }
      return [];
    };

    const fetchAll = async () => {
      if (isService) {
        if (riderLatLng) setRouteToCustomerPoints(await fetchRoute(riderLatLng, customerLatLng));
        else { setRouteToStorePoints([]); setRouteToCustomerPoints([]); }
      } else if (riderLatLng) {
        if (['ACCEPTED', 'PREPARING'].includes(order.status)) {
          setRouteToStorePoints(await fetchRoute(riderLatLng, storeLatLng));
          setRouteToCustomerPoints(await fetchRoute(storeLatLng, customerLatLng));
        } else {
          setRouteToStorePoints(await fetchRoute(storeLatLng, riderLatLng));
          setRouteToCustomerPoints(await fetchRoute(riderLatLng, customerLatLng));
        }
      } else {
        setRouteToStorePoints([]);
        setRouteToCustomerPoints(await fetchRoute(storeLatLng, customerLatLng));
      }
    };
    fetchAll();
  }, [order.status, riderCoords, storeLatLng, customerLatLng, isService, providerDetails]);

  // ── Initialize Google Map once ────────────────────────────────────────────
  useEffect(() => {
    if (!isGoogleLoaded || !googleMapRef.current || googleMapInstance.current) return;
    const center = userCoords?.lat
      ? { lat: userCoords.lat, lng: userCoords.lng }
      : { lat: 23.0225, lng: 72.5714 };
    googleMapInstance.current = new window.google.maps.Map(googleMapRef.current, {
      center: center,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: { position: window.google?.maps?.ControlPosition?.RIGHT_TOP },
      styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
    });
    isMapReady.current = true;
    return () => {
      activeMarkers.current.forEach(m => m.setMap(null));
      activePolylines.current.forEach(p => p.setMap(null));
      activeMarkers.current = [];
      activePolylines.current = [];
      googleMapInstance.current = null;
      isMapReady.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGoogleLoaded]);

  // ── Helper: create SVG marker icon ──────────────────────────────────
  const makeSvgIcon = (bgColor, svgPath, shape = 'circle') => {
    const r = shape === 'rounded' ? '12' : '50%';
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42"><rect x="0" y="0" width="42" height="42" rx="${r}" fill="${bgColor}" stroke="white" stroke-width="3"/><g transform="translate(10,10)">${svgPath}</g></svg>`
      ),
      scaledSize: new window.google.maps.Size(42, 42),
      anchor: new window.google.maps.Point(21, 21)
    };
  };

  // ── Draw markers and polylines whenever data changes ─────────────────
  useEffect(() => {
    if (!isMapReady.current || !googleMapInstance.current || !storeLatLng || !customerLatLng) return;

    // Clear previous overlays
    activeMarkers.current.forEach(m => { if (m.setMap) m.setMap(null); else if (m.map !== undefined) m.map = null; });
    activePolylines.current.forEach(p => p.setMap(null));
    activeMarkers.current = [];
    activePolylines.current = [];

    const map = googleMapInstance.current;
    const riderPos = riderCoords?.lat && riderCoords?.lng
      ? { lat: parseFloat(riderCoords.lat), lng: parseFloat(riderCoords.lng) }
      : (isService && providerDetails?.lat && providerDetails?.lng
        ? { lat: parseFloat(providerDetails.lat), lng: parseFloat(providerDetails.lng) }
        : null);

    // Helper: create marker using google.maps.Marker
    const createMarker = (position, title, svgIconStr) => {
      return new window.google.maps.Marker({
        position, map, title: title || '',
        icon: svgIconStr ? {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIconStr),
          scaledSize: new window.google.maps.Size(42, 42),
          anchor: new window.google.maps.Point(21, 21)
        } : undefined
      });
    };

    const storePt = { lat: storeLatLng[0], lng: storeLatLng[1] };
    const custPt  = { lat: customerLatLng[0], lng: customerLatLng[1] };

    // Store marker
    const storeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42"><rect x="0" y="0" width="42" height="42" rx="12" fill="#f97316" stroke="white" stroke-width="3"/><g transform="translate(10,10)"><rect x="1" y="5" width="20" height="16" rx="2" fill="none" stroke="white" stroke-width="2"/><path d="M5 5V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2" stroke="white" stroke-width="2" fill="none"/></g></svg>`;
    const storeMarker = createMarker(storePt, isService && providerDetails ? (providerDetails.business_name || providerDetails.name) : (order.stores?.name || 'Partner Store'), storeSvg);
    activeMarkers.current.push(storeMarker);

    // Customer marker
    const custSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42"><rect x="0" y="0" width="42" height="42" rx="21" fill="#3b82f6" stroke="white" stroke-width="3"/><g transform="translate(10,10)"><path d="m1 7 9-7 9 7v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2z" fill="none" stroke="white" stroke-width="2"/><polyline points="7 22 7 12 11 12 11 22" stroke="white" stroke-width="2" fill="none"/></g></svg>`;
    const custMarker = createMarker(custPt, order.addresses?.address_line_1 || 'Delivery Location', custSvg);
    activeMarkers.current.push(custMarker);

    // Rider/Provider marker
    if (riderPos) {
      const riderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42"><rect x="0" y="0" width="42" height="42" rx="21" fill="#10b981" stroke="white" stroke-width="3"/><g transform="translate(10,10)">${isService ? '<path d="M12 2c0 .6-.1 1.2-.4 1.7L7 12H4a1 1 0 0 0-1 1v1h18v-1a1 1 0 0 0-1-1h-3L12.4 3.7A3.5 3.5 0 0 0 12 2z" fill="white" fill-opacity="0.8"/>' : '<polygon points="3 9 20 2 13 19 11 11 3 9" fill="none" stroke="white" stroke-width="2"/>'}</g></svg>`;
      const riderMarker = createMarker(riderPos, isService ? 'Service Expert' : `Rider: ${order.delivery_agent_name || 'Verified Partner'}`, riderSvg);
      activeMarkers.current.push(riderMarker);
    }

    // Draw polylines
    const drawPoly = (pts, color, weight = 6, dashed = false) => {
      if (!pts || pts.length < 2) return null;
      const path = pts.map(p => ({ lat: p[0], lng: p[1] }));
      const opts = { path, geodesic: true, strokeColor: color, strokeOpacity: dashed ? 0.0 : 0.9, strokeWeight: weight, map };
      if (dashed) {
        opts.icons = [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, strokeColor: color, scale: 3 }, offset: '0', repeat: '15px' }];
      }
      const poly = new window.google.maps.Polyline(opts);
      activePolylines.current.push(poly);
      return poly;
    };

    if (isService) {
      if (riderPos) {
        const pts = routeToCustomerPoints.length > 0 ? routeToCustomerPoints : (riderPos ? [[riderPos.lat, riderPos.lng], customerLatLng] : null);
        drawPoly(pts, '#10b981');
      }
    } else {
      if (order.status === 'ACCEPTED' || order.status === 'PREPARING') {
        if (riderPos) {
          const leg1 = routeToStorePoints.length > 0 ? routeToStorePoints : [[riderPos.lat, riderPos.lng], storeLatLng];
          drawPoly(leg1, '#f97316');
        }
        const leg2 = routeToCustomerPoints.length > 0 ? routeToCustomerPoints : [storeLatLng, customerLatLng];
        drawPoly(leg2, '#3b82f6');
      } else {
        if (riderPos) {
          const leg1 = routeToStorePoints.length > 0 ? routeToStorePoints : [storeLatLng, [riderPos.lat, riderPos.lng]];
          drawPoly(leg1, '#94a3b8', 4, true);
          const leg2 = routeToCustomerPoints.length > 0 ? routeToCustomerPoints : [[riderPos.lat, riderPos.lng], customerLatLng];
          drawPoly(leg2, '#3b82f6');
        } else {
          const leg2 = routeToCustomerPoints.length > 0 ? routeToCustomerPoints : [storeLatLng, customerLatLng];
          drawPoly(leg2, '#3b82f6');
        }
      }
    }

    // Fit bounds
    try {
      const bounds = new window.google.maps.LatLngBounds();
      [storePt, custPt].forEach(p => bounds.extend(p));
      if (riderPos) bounds.extend(riderPos);
      [...(routeToStorePoints || []), ...(routeToCustomerPoints || [])].forEach(p => {
        if (p && !isNaN(p[0]) && !isNaN(p[1])) bounds.extend({ lat: p[0], lng: p[1] });
      });
      if (!bounds.isEmpty()) {
        setTimeout(() => {
          if (googleMapInstance.current) googleMapInstance.current.fitBounds(bounds);
        }, 150);
      }
    } catch (e) { console.warn('Map bounds error', e); }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.status, riderCoords, routeToStorePoints, routeToCustomerPoints, storeLatLng, customerLatLng, providerDetails, isService]);

  return (
    <div
      ref={googleMapRef}
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
    ></div>
  );
}
const TrackOrders = ({ onBack, user, userCoords }) => {
  const navigate = useNavigate();
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [cancelPromptId, setCancelPromptId] = useState(null);
  const [rideBookings, setRideBookings] = useState([]);
  const [rideLoading, setRideLoading] = useState(true);
  const [eventBookings, setEventBookings] = useState([]);
  const { addNotification } = useNotifications();

  // ── Fetch event bookings (event_bookings table) ─────────────────────────
  const fetchEventBookings = useCallback(async () => {
    if (!user) return;
    const uid = user.id || user.uid;
    if (!uid) return;
    try {
      // Resolve to UUID if needed
      let resolvedId = uid;
      if (!uid || uid.length !== 36) {
        const phone = user.phoneNumber?.replace(/\D/g, '').slice(-10) || user.phone?.replace(/\D/g, '').slice(-10);
        const orFilters = [];
        if (uid) orFilters.push(`uid.eq.${uid}`);
        if (user.email) orFilters.push(`email.eq.${user.email}`);
        if (phone) orFilters.push(`phone.eq.${phone}`);
        if (orFilters.length > 0) {
          const { data: u } = await supabase.from('users').select('id').or(orFilters.join(',')).maybeSingle();
          if (u?.id) resolvedId = u.id;
        }
      }
      if (!resolvedId || resolvedId.length !== 36) return;
      const { data, error } = await supabase
        .from('event_bookings')
        .select('*, events(id, title, banner_url, event_date, venue_name), event_ticket_tiers(tier_name, price)')
        .eq('user_id', resolvedId)
        .order('created_at', { ascending: false });
      if (!error) setEventBookings(data || []);
    } catch (e) {
      console.warn('Event bookings fetch failed:', e);
    }
  }, [user]);

  useEffect(() => {
    fetchEventBookings();
    // Realtime: update booking status live
    const uid = user?.id || user?.uid;
    const evtSub = uid ? supabase
      .channel('event_booking_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_bookings' }, (payload) => {
        setEventBookings(prev => prev.map(b =>
          b.id === payload.new.id ? { ...b, ...payload.new } : b
        ));
      })
      .subscribe() : null;
    return () => { if (evtSub) supabase.removeChannel(evtSub); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Fetch city ride bookings ────────────────────────────────────────────
  const fetchRideBookings = useCallback(async () => {
    if (!user) return;
    const uid = user.id || user.uid;
    if (!uid) return;
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${baseUrl}/api/city-rides/my-bookings?userId=${uid}`);
      const data = await res.json();
      if (data.success) setRideBookings(data.bookings || []);
    } catch (e) {
      console.warn('Ride bookings fetch failed:', e);
    } finally {
      setRideLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRideBookings();
    const interval = setInterval(fetchRideBookings, 15000); // Poll every 15s

    // Real-time ride booking updates
    const uid = user?.id || user?.uid;
    const rideSub = uid ? supabase
      .channel('ride_booking_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ticket_bookings' }, (payload) => {
        setRideBookings(prev => prev.map(b =>
          b.id === payload.new.id ? { ...b, ...payload.new } : b
        ));
        const shortId = payload.new.id.substring(0, 6).toUpperCase();
        toast.success(`Ride #${shortId} status: ${payload.new.status}`, { icon: '🚌' });
        addNotification({ text: `Ride Booking #${shortId} is now ${payload.new.status}`, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
      })
      .subscribe() : null;

    return () => {
      clearInterval(interval);
      if (rideSub) supabase.removeChannel(rideSub);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    fetchOrders();

    // Polling fallback — only fires if real-time channel drops (Supabase realtime handles live updates above)
    // 30s is sufficient; 5s caused 12 req/min per user and could trigger rate limits
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);

    // REAL-TIME: Listen for order status updates
    const sub = supabase.channel('order_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, async (payload) => {
        let isService = false;
        
        let freshTracking = [];
        try {
          const { data: trackingData } = await supabase
            .from('delivery_tracking')
            .select('order_id, rider_id')
            .eq('order_id', payload.new.id);
          if (trackingData) {
            freshTracking = trackingData;
          }
        } catch (e) {
          console.warn("Error fetching tracking in real-time:", e);
        }

        setActiveOrders(prev => {
          const matched = prev.find(o => o.id === payload.new.id);
          if (matched && (matched.items?.[0]?.type === 'service' || (matched.stores && !matched.stores.vendor_id))) {
            isService = true;
          }
          return prev.map(o => {
            if (o.id === payload.new.id) {
              return {
                ...o,
                ...payload.new,
                items: o.items,
                stores: o.stores || payload.new.stores,
                addresses: o.addresses || payload.new.addresses,
                delivery_tracking: freshTracking.length > 0 ? freshTracking : o.delivery_tracking
              };
            }
            return o;
          });
        });
        const shortId = payload.new.id.substring(0, 6).toUpperCase();
        toast.info(isService ? `Booking #${shortId} is now: ${payload.new.status}` : `Order #${shortId} is now: ${payload.new.status}`, { icon: isService ? '🛠️' : '🛵' });
        
        // Push Real-Time Notification to Context
        addNotification({
          text: isService ? `Update on Booking #${shortId}: Status changed to ${payload.new.status}` : `Update on Order #${shortId}: Status changed to ${payload.new.status}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getProgress = (status) => {
    switch(status) {
      case 'ORDERED':
      case 'PLACED': return 10;
      case 'ACCEPTED': return 25;
      case 'PREPARING': return 45;
      case 'DISPATCHED': 
      case 'SHIPPED': return 75;
      case 'DELIVERED': return 100;
      default: return 5;
    }
  };



  const fetchOrders = async () => {
    try {
      if (!user) return;
      
      let resolvedUserId = user.id || user.uid;
      const isUUID = resolvedUserId && resolvedUserId.length === 36;
      
      if (!isUUID) {
        // Resolve from database
        const phoneNo = user.phoneNumber?.replace('+91', '') || user.phone?.replace('+91', '');
        const orFilters = [];
        if (user.uid) orFilters.push(`uid.eq.${user.uid}`);
        if (user.email) orFilters.push(`email.eq.${user.email}`);
        if (phoneNo) {
          orFilters.push(`phone.eq.${phoneNo}`);
          orFilters.push(`phone.eq.+91${phoneNo}`);
        }
        
        if (orFilters.length > 0) {
          const { data: usr } = await supabase
            .from('users')
            .select('id')
            .or(orFilters.join(','))
            .maybeSingle();
          if (usr) {
            resolvedUserId = usr.id;
          } else {
            resolvedUserId = null;
          }
        } else {
          resolvedUserId = null;
        }
      }

      // 1. Fetch orders from Supabase using resolved UUID
      let dbOrders = [];
      if (resolvedUserId && resolvedUserId.length === 36) {
        try {
          const { data, error } = await supabase
            .from('orders')
            .select(`
              *,
              stores(name, address, lat, lng, vendor_id),
              addresses(*),
              users!orders_user_id_fkey(full_name, phone),
              order_items(
                id,
                quantity,
                price_at_purchase,
                products(name, description)
              )
            `)
            .eq('user_id', resolvedUserId)
            .order('created_at', { ascending: false });
          
          if (!error && data) {
            dbOrders = data;
            const orderIds = dbOrders.map(o => o.id);
            if (orderIds.length > 0) {
              const { data: trackingData, error: trackingError } = await supabase
                .from('delivery_tracking')
                .select('order_id, rider_id')
                .in('order_id', orderIds);
              if (!trackingError && trackingData) {
                dbOrders = dbOrders.map(order => {
                  const tracking = trackingData.filter(t => t.order_id === order.id);
                  return {
                    ...order,
                    delivery_tracking: tracking
                  };
                });
              }
            }
          }
        } catch (dbErr) {
          console.warn("Database fetch offline, using local storage orders fallback:", dbErr);
        }
      } else {
        console.warn("Could not resolve a valid 36-char user UUID, skipping Supabase query to avoid format crash.");
      }

      // Collect all product_ids where products is null (likely service items)
      const potentialServiceIds = [];
      dbOrders.forEach(order => {
        order.order_items?.forEach(oi => {
          if (!oi.products?.name && oi.product_id) {
            potentialServiceIds.push(oi.product_id);
          }
        });
      });

      const serviceNamesMap = {};
      if (potentialServiceIds.length > 0) {
        try {
          const { data: servicesData } = await supabase
            .from('services')
            .select('id, title')
            .in('id', potentialServiceIds);
          if (servicesData) {
            servicesData.forEach(s => {
              serviceNamesMap[s.id] = s.title;
            });
          }
        } catch (servErr) {
          console.warn("Could not load service titles:", servErr);
        }
      }

      // 3. Format
      const formattedDbOrders = dbOrders.map(order => {
        if (!order.addresses) {
          order.addresses = {
            id: 'fallback-addr',
            address_line_1: 'Thaltej, Ahmedabad',
            city: 'Ahmedabad',
            state: 'Gujarat',
            pincode: '380054',
            society: 'Thaltej, Ahmedabad',
            lat: null,
            lng: null
          };
        } else {
          // Parse society dynamically from address_line_1 if not present or generic
          if (!order.addresses.society || order.addresses.society.toLowerCase() === 'ahmedabad') {
            if (order.addresses.address_line_1 && order.addresses.address_line_1 !== 'Geo-location Pending') {
              const parts = order.addresses.address_line_1.split(',').map(p => p.trim());
              const lastPart = parts[parts.length - 1] || '';
              if (lastPart.toLowerCase() === 'ahmedabad') {
                order.addresses.society = parts[parts.length - 2] || parts[0] || 'Thaltej';
              } else {
                order.addresses.society = lastPart || 'Thaltej';
              }
            } else {
              order.addresses.address_line_1 = 'Thaltej, Ahmedabad';
              order.addresses.society = 'Thaltej';
            }
          }
        }

        return {
          ...order,
          items: order.order_items?.map(oi => {
            const isServiceItem = (oi.products?.type === 'service') || 
                                  (oi.products?.description === 'Service item auto-registered') ||
                                  (oi.products?.description?.toLowerCase().includes('service')) ||
                                  (serviceNamesMap[oi.product_id] ? true : false) ||
                                  (order.stores && !order.stores.vendor_id);
            return {
              name: oi.products?.name || serviceNamesMap[oi.product_id] || 'Service Booking',
              type: isServiceItem ? 'service' : (oi.products?.type || 'essential'),
              qty: oi.quantity,
              price: oi.price_at_purchase,
              store: order.stores?.name
            };
          }) || []
        };
      });

      setActiveOrders(formattedDbOrders);
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const [riderCoords, setRiderCoords] = useState(null);

  // Real-Time Supabase Rider Tracking
  useEffect(() => {
    const trackingStatuses = ['ACCEPTED', 'PREPARING', 'SHIPPED', 'DISPATCHED'];
    const activeShipment = activeOrders.find(o => trackingStatuses.includes(o.status));
    
    if (!activeShipment) return;

    // Supabase order rider tracking
    const targetRiderId = activeShipment.delivery_tracking?.[0]?.rider_id || activeShipment.rider_id;

    if (!targetRiderId) {
      setRiderCoords(null);
      return;
    }

    const getInitialPos = async () => {
      let query = supabase.from('rider_locations').select('lat, lng, updated_at').eq('rider_id', targetRiderId);
      
      const { data } = await query.maybeSingle();
      const activeRider = Array.isArray(data) ? data[0] : data;
      
      if (activeRider) {
        setRiderCoords({ lat: parseFloat(activeRider.lat), lng: parseFloat(activeRider.lng) });
      }
    };
    getInitialPos();

    const channel = supabase
      .channel(`rider-tracking-${targetRiderId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rider_locations',
        filter: `rider_id=eq.${targetRiderId}`
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setRiderCoords(null);
        } else if (payload.new && payload.new.lat && payload.new.lng) {
          setRiderCoords({ lat: parseFloat(payload.new.lat), lng: parseFloat(payload.new.lng) });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrders]);

  const handleDownloadInvoice = (order) => {
    const doc = new jsPDF();

    // ── Seller / Store info
    const storeName    = order.stores?.name || 'Passwala Partner Store';
    const storeAddress = order.stores?.address || 'Ahmedabad, Gujarat';
    // GSTIN: stores table doesn't have this column yet — show placeholder or Mahadev GSTIN
    const isMahadev    = storeName.toLowerCase().includes('mahadev');
    const isShiv       = storeName.toLowerCase().includes('shiv');
    const storeGSTIN   = order.stores?.gstin || 
                         (isMahadev ? '24AAAMH4812K1Z9' : 
                          (isShiv ? '24BCBR78R78UF1Z' : 'Not Registered'));
    const storePhone   = order.stores?.phone || '';

    // ── Buyer / Customer info (name from users join, address from addresses)
    const customerName    = order.users?.full_name ||
                            order.addresses?.name ||
                            user?.displayName ||
                            user?.full_name || 'Customer';
    const customerPhone   = order.users?.phone || user?.phone || '';
    const addrLine1       = order.addresses?.address_line_1 || '';
    const addrLine2       = order.addresses?.address_line_2 || '';
    const addrCity        = order.addresses?.city || 'Ahmedabad';
    const addrState       = order.addresses?.state || 'Gujarat';
    const addrPincode     = order.addresses?.pincode || '380001';
    // Build clean address (no duplicates)
    const customerAddress = [addrLine1, addrLine2, addrCity]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)  // deduplicate
      .join(', ');

    const orderId     = order.id ? String(order.id).substring(0, 8).toUpperCase() : 'N/A';
    const invoiceNo   = `PW-${orderId}-INV`;
    const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
    const deliveredDate = order.updated_at
      ? new Date(order.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : invoiceDate;

    // ── PDF setup
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.1);

    // ── HEADER BAND
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(storeName.toUpperCase(), 14, 13);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Powered by Passwala • Tax Invoice', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ORIGINAL FOR BUYER', 196, 16, { align: 'right' });

    doc.setTextColor(0, 0, 0);

    // ── TOP INFO GRID (4 panels in 2 rows)
    const G = { x: 14, y: 32, w: 182, rowH: 52 };
    doc.setDrawColor(180, 180, 180);
    doc.rect(G.x, G.y, G.w, G.rowH * 2);
    // Row divider
    doc.line(G.x, G.y + G.rowH, G.x + G.w, G.y + G.rowH);
    // Col divider
    doc.line(G.x + 111, G.y, G.x + 111, G.y + G.rowH * 2);

    // ─ Panel A: Seller Info (top-left)
    const pA = { x: G.x + 2, y: G.y + 4 };
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLD BY:', pA.x, pA.y);
    doc.setFontSize(8.5);
    doc.text(storeName, pA.x, pA.y + 5);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    const addrLines = doc.splitTextToSize(storeAddress, 105);
    doc.text(addrLines, pA.x, pA.y + 11);
    if (storePhone) doc.text(`Ph: ${storePhone}`, pA.x, pA.y + 11 + addrLines.length * 4);

    doc.setFont('helvetica', 'bold');
    doc.text('GSTIN:', pA.x, pA.y + 38);
    doc.setFont('helvetica', 'normal');
    doc.text(storeGSTIN, pA.x + 12, pA.y + 38);
    doc.setFont('helvetica', 'bold');
    doc.text('PAN:', pA.x + 45, pA.y + 38);
    doc.setFont('helvetica', 'normal');
    doc.text(storeGSTIN !== 'Not Registered' ? storeGSTIN.substring(2, 12) : 'N/A', pA.x + 55, pA.y + 38);
    doc.setFont('helvetica', 'bold');
    doc.text('State:', pA.x, pA.y + 43);
    doc.setFont('helvetica', 'normal');
    doc.text('Gujarat (24)', pA.x + 11, pA.y + 43);

    // ─ Panel B: Invoice details (top-right)
    const pB = { x: G.x + 113, y: G.y + 4 };
    const addRow = (label, value, yOff) => {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text(label, pB.x, pB.y + yOff);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value), pB.x + 28, pB.y + yOff);
    };
    addRow('Invoice No.:', invoiceNo, 0);
    addRow('Invoice Date:', invoiceDate, 6);
    addRow('Delivery Date:', deliveredDate, 12);
    addRow('Place of Supply:', 'Gujarat (24)', 18);
    addRow('Order ID:', orderId, 24);
    addRow('Payment Mode:', order.payment_method || 'Online', 30);
    addRow('Payment Status:', order.payment_status || 'PAID', 36);

    // ─ Panel C: Bill-to (bottom-left)
    const pC = { x: G.x + 2, y: G.y + G.rowH + 4 };
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', pC.x, pC.y);
    doc.setFontSize(8);
    doc.text(customerName, pC.x, pC.y + 5);
    if (customerPhone) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Ph: ${customerPhone}`, pC.x, pC.y + 10);
    }
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    const custAddrLines = doc.splitTextToSize(customerAddress, 105);
    doc.text(custAddrLines, pC.x, pC.y + 15);
    doc.setFont('helvetica', 'bold');
    doc.text('State:', pC.x, pC.y + 15 + custAddrLines.length * 4 + 2);
    doc.setFont('helvetica', 'normal');
    doc.text(`${addrState} (24)`, pC.x + 11, pC.y + 15 + custAddrLines.length * 4 + 2);
    doc.setFont('helvetica', 'bold');
    doc.text('Pincode:', pC.x + 50, pC.y + 15 + custAddrLines.length * 4 + 2);
    doc.setFont('helvetica', 'normal');
    doc.text(addrPincode, pC.x + 65, pC.y + 15 + custAddrLines.length * 4 + 2);

    // ─ Panel D: GSTIN of buyer (bottom-right)
    const pD = { x: G.x + 113, y: G.y + G.rowH + 4 };
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('BUYER GSTIN:', pD.x, pD.y);
    doc.setFont('helvetica', 'normal');
    doc.text('Unregistered Consumer', pD.x, pD.y + 5);

    // ── ITEM TABLE
    const tableStartY = G.y + G.rowH * 2 + 3;
    const tableColumns = [
      'Sr', 'HSN', 'Item Description', 'MRP', 'Disc.', 'Qty',
      'Taxable Val.', 'CGST%', 'CGST Rs.', 'SGST%', 'SGST Rs.', 'Total'
    ];
    const tableRows = [];
    let subtotal       = 0;
    let totalCGST      = 0;
    let totalSGST      = 0;
    let totalTaxable   = 0;
    const GST_RATE     = 5;   // 5% GST (CGST 2.5% + SGST 2.5%) — standard for grocery/food
    const CGST_RATE    = GST_RATE / 2;
    const SGST_RATE    = GST_RATE / 2;
    const HSN_DEFAULT  = '0401'; // Generic food HSN

    (order.items || []).forEach((item, idx) => {
      const mrp      = parseFloat(item.price || item.price_at_purchase || 0);
      const qty      = parseInt(item.qty || item.quantity || 1);
      const taxable  = mrp * qty;
      const cgst     = taxable * CGST_RATE / 100;
      const sgst     = taxable * SGST_RATE / 100;
      const lineTotal = taxable + cgst + sgst;

      subtotal     += lineTotal;
      totalCGST    += cgst;
      totalSGST    += sgst;
      totalTaxable += taxable;

      tableRows.push([
        idx + 1,
        HSN_DEFAULT,
        item.name || item.products?.name || 'Item',
        mrp.toFixed(2),
        '0.00',
        qty,
        taxable.toFixed(2),
        `${CGST_RATE}%`,
        cgst.toFixed(2),
        `${SGST_RATE}%`,
        sgst.toFixed(2),
        lineTotal.toFixed(2),
      ]);
    });

    // Delivery fee row
    const deliveryFee = parseFloat(order.delivery_fee || 0);
    if (deliveryFee > 0) {
      subtotal += deliveryFee;
      tableRows.push([
        tableRows.length + 1, '9965', 'Delivery Charges',
        deliveryFee.toFixed(2), '0.00', 1,
        deliveryFee.toFixed(2), '0%', '0.00', '0%', '0.00', deliveryFee.toFixed(2),
      ]);
    }

    autoTable(doc, {
      startY: tableStartY,
      head: [tableColumns],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 6, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.1 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 5.5 },
      columnStyles: {
        0:  { halign: 'center', cellWidth: 8 },
        1:  { halign: 'center', cellWidth: 14 },
        2:  { cellWidth: 40 },
        3:  { halign: 'right', cellWidth: 14 },
        4:  { halign: 'right', cellWidth: 12 },
        5:  { halign: 'center', cellWidth: 8 },
        6:  { halign: 'right', cellWidth: 18 },
        7:  { halign: 'center', cellWidth: 12 },
        8:  { halign: 'right', cellWidth: 14 },
        9:  { halign: 'center', cellWidth: 12 },
        10: { halign: 'right', cellWidth: 14 },
        11: { halign: 'right', cellWidth: 14 },
      },
      margin: { left: 14, right: 14 },
    });

    let finalY = doc.lastAutoTable.finalY + 2;

    // ── TAX SUMMARY TABLE (right-aligned block)
    const totalGST = totalCGST + totalSGST;
    const summaryRows = [
      ['Taxable Amount', `Rs. ${totalTaxable.toFixed(2)}`],
      [`CGST @ ${CGST_RATE}%`, `Rs. ${totalCGST.toFixed(2)}`],
      [`SGST @ ${SGST_RATE}%`, `Rs. ${totalSGST.toFixed(2)}`],
    ];
    if (deliveryFee > 0) {
      summaryRows.push(['Delivery Charges', `Rs. ${deliveryFee.toFixed(2)}`]);
    }
    summaryRows.push(['Total Tax (GST)', `Rs. ${totalGST.toFixed(2)}`]);
    summaryRows.push(['GRAND TOTAL', `Rs. ${subtotal.toFixed(2)}`]);

    autoTable(doc, {
      startY: finalY,
      head: [['Description', 'Amount']],
      body: summaryRows,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.1 },
      headStyles: { fillColor: [248, 250, 252], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      bodyStyles: { halign: 'right' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 30 } },
      margin: { left: 196 - 80, right: 14 },
      didParseCell: (data) => {
        if (data.row.index === summaryRows.length - 1) {
          data.cell.styles.fillColor = [15, 23, 42];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    finalY = doc.lastAutoTable.finalY + 2;

    // ── AMOUNT IN WORDS
    const toWords = (n) => {
      const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
        'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
      const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
      if (n === 0) return 'Zero';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
      if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + toWords(n%100) : '');
      if (n < 100000) return toWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + toWords(n%1000) : '');
      return toWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + toWords(n%100000) : '');
    };
    const rupees = Math.floor(subtotal);
    const paise  = Math.round((subtotal - rupees) * 100);
    const amtWords = `Indian Rupee ${toWords(rupees)}${paise > 0 ? ' and ' + toWords(paise) + ' Paise' : ''} Only`;

    doc.setFillColor(248, 250, 252);
    doc.rect(14, finalY, 182, 8, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.rect(14, finalY, 182, 8);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Amount in Words:', 16, finalY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(amtWords, 50, finalY + 5);
    finalY += 10;

    // ── TERMS
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', 14, finalY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('1. For issues/queries contact support@passwala.in or use in-app chat.', 14, finalY + 9);
    doc.text('2. Never share bank/UPI details with anyone. Passwala will never ask for them.', 14, finalY + 13);
    doc.text('3. MRP is as printed on package. Final amount may vary due to offers or revised GST rates.', 14, finalY + 17);
    finalY += 22;

    // ── FOOTER BAND
    doc.setFillColor(15, 23, 42);
    doc.rect(0, finalY, 210, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Platform / Facilitator: Passwala', 14, finalY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('CIN: U74999GJ2026PTC000000', 14, finalY + 11);
    doc.text('Email: support@passwala.in  |  Website: www.passwala.in', 14, finalY + 16);
    doc.setFont('helvetica', 'bold');
    doc.text('Authorised Signatory', 194, finalY + 16, { align: 'right' });
    doc.setDrawColor(150, 150, 150);
    doc.line(160, finalY + 12, 194, finalY + 12);

    // Reverse charge
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text('Whether tax is payable on reverse charge basis: No', 14, finalY + 25);

    doc.save(`Invoice_${storeName.replace(/\s+/g, '_')}_${orderId}.pdf`);
  };




  const confirmCancelOrder = async (orderId) => {
    try {
      const { error } = await supabase.from('orders').update({ status: 'CANCELLED' }).eq('id', orderId);
      
      if (error) throw new Error(error.message || 'Failed to cancel order');

      // Also update any matching service_bookings status to 'CANCELLED'
      try {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, orders!inner(user_id, store_id)')
          .eq('order_id', orderId);

        if (orderItems && orderItems.length > 0) {
          for (const item of orderItems) {
            if (item.orders) {
              await supabase
                .from('service_bookings')
                .update({ status: 'CANCELLED' })
                .eq('user_id', item.orders.user_id)
                .eq('provider_id', item.orders.store_id)
                .eq('service_id', item.product_id);
            }
          }
        }
      } catch (syncErr) {
        console.warn("Could not sync order cancellation to service_bookings:", syncErr);
      }
      
      toast.success("Order cancelled successfully");
      setCancelPromptId(null);
    } catch (err) {
      toast.error(`Failed to cancel: ${err.message}`);
      setCancelPromptId(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="track-orders-page"
    >
      <div className="track-head-row">
         <div className="live-status">
           <div className="live-pulse"></div> 
           <span>
             {activeOrders.filter(o => !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(o.status)).length + rideBookings.filter(b => b.status === 'CONFIRMED').length + eventBookings.filter(b => b.status === 'CONFIRMED').length} ACTIVE ORDERS
           </span>
         </div>
      </div>

      <div className="orders-list-v2" style={{ paddingBottom: '120px' }}>
        {loading ? <p>Syncing neighborhood cloud...</p> : activeOrders.filter(o => !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(o.status)).map((order, i) => {
          const progress = getProgress(order.status);
          const firstItem = order.items?.[0] || { name: 'Order' };
          const itemCount = order.items?.length || 0;
          const isService = firstItem.type === 'service' || (order.stores && !order.stores.vendor_id);

          return (
            <motion.div 
              key={order.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="tracking-card glass"
            >
              <div className="card-top">
                 <div className="shop-info">
                    <div className="shop-logo-box">
                       {isService ? <Truck size={20} /> : <Package size={20} />}
                    </div>
                     <div>
                        <h4>{isService ? (firstItem.provider || firstItem.store || 'Service Expert') : (order.stores?.name || firstItem.store || 'Partner')}</h4>
                        <p>{firstItem.name} {itemCount > 1 ? `+ ${itemCount - 1} more` : ''}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                          <MapPin size={12} color="#94a3b8" />
                          <span>{isService ? 'Service Location' : 'Delivery Location'}: <strong style={{ color: '#475569' }}>{order.addresses?.society || 'Thaltej'}</strong></span>
                        </div>
                     </div>
                 </div>
                 <div className="order-id-v2">#{order.id.slice(0, 8)}</div>
              </div>

              <div className="tracking-timeline">
                 <div className="timeline-progress-bg">
                    <motion.div 
                      className="timeline-progress-fill" 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                    ></motion.div>
                 </div>
                 <div className="timeline-labels">
                    <div className="label-item active"><CheckCircle size={14} /> {isService ? 'Booked' : 'Ordered'}</div>
                    <div className={`label-item ${progress >= 50 ? 'active' : ''}`}><Clock size={14} /> {isService ? 'En Route' : 'Shipped'}</div>
                    <div className={`label-item ${progress >= 90 ? 'active' : ''}`}><MapPin size={14} /> {isService ? 'Service' : 'Delivery'}</div>
                 </div>
              </div>

              <div className="live-tracking-map-v4" style={{ height: '240px', overflow: 'hidden', borderRadius: '20px', position: 'relative', zIndex: 1, border: '1px solid rgba(0,0,0,0.05)' }}>
                <div className="tom-map-container" style={{ position: 'relative', width: '100%', height: '220px', zIndex: 0, isolation: 'isolate' }}>
                  <OrderTrackingMap order={order} riderCoords={riderCoords} userCoords={userCoords} isService={isService} />
                </div>
                
                {/* Floating Overlay Info */}
                <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'white', padding: '8px 12px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: riderCoords ? '#22c55e' : '#94a3b8', animation: riderCoords ? 'pulse 2s infinite' : 'none' }}></div>
                   <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                     {['DELIVERED', 'COMPLETED'].includes(order.status) ? (isService ? 'Service Completed' : 'Delivered') :
                      riderCoords || ['SHIPPED', 'DISPATCHED'].includes(order.status) ? (isService ? 'Expert on the way' : 'Live Tracking Active') : 
                      ['ACCEPTED', 'PREPARING'].includes(order.status) ? (isService ? 'Preparing Kit...' : 'Preparing Order...') :
                      (isService ? 'Waiting for Expert...' : 'Waiting for Rider...')}
                   </span>
                </div>
              </div>

              <div className="tracking-meta-v4">
                <div className="eta-main">
                  <div className="eta-timer">
                    <Clock size={20} className="pulse-text" />
                    <span>
                      {order.status === 'PLACED' || order.status === 'PENDING' ? (isService ? 'Waiting for confirmation...' : 'Confirming order...') : 
                       ['DELIVERED', 'COMPLETED'].includes(order.status) ? (isService ? 'Completed!' : 'Arrived!') : 
                       <>Arriving in <strong>{order.eta || '10 mins'}</strong></>}
                    </span>
                  </div>
                  <p className="eta-status">
                    {order.status === 'PLACED' || order.status === 'PENDING' ? (isService ? 'Waiting for service provider to confirm booking...' : 'Confirming order with nearby riders...') : 
                     order.status === 'ACCEPTED' ? (isService ? 'Booking Confirmed, preparing service kit' : 'Rider Assigned, heading to the store') :
                     order.status === 'PREPARING' ? (isService ? 'Expert is preparing for service visit' : 'Rider is at the store picking up') :
                     order.status === 'SHIPPED' || order.status === 'DISPATCHED' ? (isService ? 'Expert is on the way to you' : 'Rider is on the way to you') : (isService ? 'Completed' : 'Delivered')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', position: 'relative', zIndex: 20 }}>
                  {['PENDING', 'PLACED', 'ORDERED', 'ACCEPTED', 'PREPARING', 'SHIPPED', 'DISPATCHED'].includes(order.status) && (
                    <button className="rider-contact-btn" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '0 12px' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCancelPromptId(order.id); }}>
                      Cancel
                    </button>
                  )}
                  
                  <button className="rider-contact-btn" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedOrderDetails(order); }}>
                    Details
                  </button>
                </div>
              </div>

              {((order.rider_id) || String(order.id).startsWith('local_')) && ['PREPARING', 'SHIPPED', 'DISPATCHED', 'DELIVERED', 'COMPLETED'].includes(order.status) && (
                <div className="agent-small-info">
                   <img src={`https://i.pravatar.cc/150?u=${order.rider_id || order.id}`} alt="Agent" />
                   <p>{order.delivery_agent_name || 'Verified Partner'} • {isService ? 'Verified Expert' : 'Verified Agent'}</p>
                </div>
              )}
            </motion.div>
          );
        })}
        {!loading && activeOrders.filter(o => !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(o.status)).length === 0 && rideBookings.filter(b => b.status === 'CONFIRMED').length === 0 && (
          <div className="empty-orders-placeholder-card" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
            <div className="placeholder-icon" style={{ background: '#f1f5f9', color: '#94a3b8' }}>📦</div>
            <h3 style={{ color: '#64748b' }}>No Active Orders</h3>
            <p style={{ color: '#94a3b8' }}>You don't have any ongoing deliveries at the moment.</p>
          </div>
        )}

        {/* ── CITY RIDE BOOKINGS SECTION ── */}
        {rideBookings.filter(b => b.status === 'CONFIRMED').length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', padding: '0 4px' }}>
              <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#f97316,#ea580c)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bike size={16} color="white" />
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Active Ride Bookings</h3>
              <span style={{ marginLeft: 'auto', background: '#fff7ed', color: '#f97316', fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20, border: '1px solid #fed7aa' }}>
                {rideBookings.filter(b => b.status === 'CONFIRMED').length} CONFIRMED
              </span>
            </div>
            {rideBookings.filter(b => b.status === 'CONFIRMED').map((booking, i) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="tracking-card glass"
                style={{ marginBottom: '1.25rem', border: '1.5px solid #fed7aa', boxShadow: '0 8px 24px rgba(249,115,22,0.10)' }}
              >
                {/* Card header */}
                <div className="card-top">
                  <div className="shop-info">
                    <div className="shop-logo-box" style={{ background: 'linear-gradient(135deg,#fff7ed,#ffedd5)', color: '#f97316' }}>
                      <Bike size={20} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 800 }}>{booking.city_vehicles?.vehicle_type || 'City Ride'}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {booking.seat_count} seat{booking.seat_count > 1 ? 's' : ''} • ₹{booking.total_price}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                        <MapPin size={12} color="#f97316" />
                        <span>{booking.pickup_area} → {booking.drop_area}</span>
                      </div>
                    </div>
                  </div>
                  <div className="order-id-v2" style={{ background: '#fff7ed', color: '#f97316' }}>#{booking.id.slice(0, 8)}</div>
                </div>

                {/* Vehicle plate + license */}
                {booking.city_vehicles?.license_plate && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#f8fafc', borderRadius: 12, margin: '0 0 12px' }}>
                    <Navigation size={14} color="#f97316" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Vehicle: {booking.city_vehicles.license_plate}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', background: booking.driverLocation ? '#dcfce7' : '#f1f5f9', color: booking.driverLocation ? '#16a34a' : '#94a3b8', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                      {booking.driverLocation ? '🟢 Driver Live' : '⚪ Awaiting driver'}
                    </span>
                  </div>
                )}

                {/* Live map */}
                <div style={{ height: 220, borderRadius: 18, overflow: 'hidden', position: 'relative', border: '1px solid rgba(0,0,0,0.06)', marginBottom: 12 }}>
                  <div style={{ position: 'relative', width: '100%', height: '100%', isolation: 'isolate' }}>
                    <RideTrackingMap booking={booking} />
                  </div>
                  <div style={{ position: 'absolute', top: 10, right: 10, background: 'white', padding: '6px 12px', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 6, zIndex: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: booking.driverLocation ? '#22c55e' : '#f97316', animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                      {booking.driverLocation ? 'Driver En Route' : 'Preparing Ride'}
                    </span>
                  </div>
                </div>

                {/* ETA + actions */}
                <div className="tracking-meta-v4">
                  <div className="eta-main">
                    <div className="eta-timer">
                      <Clock size={18} className="pulse-text" />
                      <span>Ride <strong>Confirmed</strong> — Board at pickup point</span>
                    </div>
                    <p className="eta-status">Show QR code to driver. Seat{booking.seat_count > 1 ? 's' : ''} reserved.</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="rider-contact-btn"
                      style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '0 14px' }}
                      onClick={() => {
                        const baseUrl = import.meta.env.VITE_API_URL || '';
                        fetch(`${baseUrl}/api/city-rides/cancel`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ bookingId: booking.id, userId: user?.id || user?.uid })
                        }).then(() => { fetchRideBookings(); toast.success('Ride booking cancelled'); }).catch(() => toast.error('Cancel failed'));
                      }}
                    >Cancel</button>
                    <button
                      className="rider-contact-btn"
                      style={{ background: 'var(--primary)', color: 'white', border: 'none' }}
                      onClick={() => navigate('/ride-ticket', { state: { booking, vehicle: booking.city_vehicles } })}
                    >🎟️ View Ticket</button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── EVENT BOOKINGS SECTION ── */}
        {eventBookings.filter(b => b.status !== 'CANCELLED').length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', padding: '0 4px' }}>
              <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 16 }}>🎫</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>My Event Tickets</h3>
              <span style={{ marginLeft: 'auto', background: '#f5f3ff', color: '#7c3aed', fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: 20, border: '1px solid #ddd6fe' }}>
                {eventBookings.filter(b => b.status !== 'CANCELLED').length} TICKET{eventBookings.filter(b => b.status !== 'CANCELLED').length !== 1 ? 'S' : ''}
              </span>
            </div>
            {eventBookings.filter(b => b.status !== 'CANCELLED').map((booking, i) => {
              const ev = booking.events;
              const tier = booking.event_ticket_tiers;
              const evDate = ev?.event_date ? new Date(ev.event_date) : null;
              return (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="tracking-card glass"
                  style={{ marginBottom: '1.25rem', border: '1.5px solid #ddd6fe', boxShadow: '0 8px 24px rgba(124,58,237,0.10)' }}
                >
                  <div className="card-top">
                    <div className="shop-info">
                      <div style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
                        {ev?.banner_url
                          ? <img src={ev.banner_url} alt={ev.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎫</div>
                        }
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontWeight: 800 }}>{ev?.title || 'Event Ticket'}</h4>
                        <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {tier?.tier_name || 'General'} × {booking.ticket_count} • ₹{booking.total_amount}
                        </p>
                        {evDate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                            📅 {evDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • 📍 {ev?.venue_name || 'Venue TBA'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="order-id-v2" style={{ background: '#f5f3ff', color: '#7c3aed' }}>#{booking.id.slice(0, 8)}</div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                    <button
                      className="rider-contact-btn"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: 'white', border: 'none' }}
                      onClick={() => navigate('/events/ticket', { state: { booking, event: ev, tier } })}
                    >🎫 View Ticket</button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <div className="past-orders-shortcut">
         <h4>Previous Orders ({activeOrders.filter(o => ['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(o.status)).length})</h4>
          {activeOrders.filter(o => ['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(o.status)).map(order => (
            <div key={order.id} className="past-item-row" onClick={() => setSelectedOrderDetails(order)} style={{ cursor: 'pointer' }}>
               <div className="past-meta">
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  <p>{order.items?.[0]?.name || 'Order'} • ₹{order.total_price || order.total_amount}</p>
               </div>
               <div className={order.status === 'CANCELLED' ? "cancelled-pill-small" : "fulfilled-pill-small"} style={order.status === 'CANCELLED' ? {background: '#fee2e2', color: '#ef4444', textTransform: 'uppercase', fontSize: '0.65rem', padding: '2px 10px', borderRadius: '6px', fontWeight: 800, marginLeft: 'auto', marginRight: '12px'} : {}}>
                 {order.status === 'CANCELLED' ? 'Cancelled' : 'Fulfilled'}
               </div>
               <ChevronRight size={16} color="#888" />
            </div>
         ))}
         {activeOrders.filter(o => ['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(o.status)).length === 0 && (
           <p className="no-past-p">No history available yet.</p>
         )}
      </div>

      {/* Custom Cancel Confirmation Modal */}
      {cancelPromptId && (
        <div className="past-order-modal-overlay" onClick={() => setCancelPromptId(null)} style={{ zIndex: 9999 }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="past-order-modal-content"
            style={{ maxWidth: '350px', margin: 'auto', borderRadius: '24px', padding: '24px', textAlign: 'center', background: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ background: '#fef2f2', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#ef4444' }}>
              <X size={32} />
            </div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.25rem', color: '#0f172a' }}>Cancel Order?</h3>
            <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Are you sure you want to cancel this order? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => setCancelPromptId(null)}
                style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                No, Keep It
              </button>
              <button 
                onClick={() => confirmCancelOrder(cancelPromptId)}
                style={{ flex: 1, padding: '12px', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Yes, Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrderDetails && (
        <div className="past-order-modal-overlay" onClick={() => setSelectedOrderDetails(null)}>
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="past-order-modal-content"
            onClick={e => e.stopPropagation()}
          >
            <div className="past-order-modal-header">
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Order Details</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {['PENDING', 'PLACED', 'ORDERED', 'ACCEPTED', 'PREPARING'].includes(selectedOrderDetails.status) && (
                  <button 
                    onClick={() => {
                      setCancelPromptId(selectedOrderDetails.id);
                      setSelectedOrderDetails(null);
                    }} 
                    style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: '#ef4444', fontWeight: 600, fontSize: '0.85rem' }}
                  >
                    Cancel Order
                  </button>
                )}
                {/* Download Invoice — only when order is completed/delivered */}
                {['DELIVERED', 'COMPLETED'].includes(selectedOrderDetails.status) && (
                  <button
                    onClick={() => handleDownloadInvoice(selectedOrderDetails)}
                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '6px 14px', cursor: 'pointer', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.82rem' }}
                    title="Download Invoice"
                  >
                    <Download size={15} /> Invoice
                  </button>
                )}
                <button onClick={() => setSelectedOrderDetails(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="past-order-modal-body">
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                  <Store size={24} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>{selectedOrderDetails.stores?.name || selectedOrderDetails.items?.[0]?.store || 'Passwala Partner'}</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} /> {['DELIVERED', 'COMPLETED'].includes(selectedOrderDetails.status) ? 'Delivered on' : 'Ordered on'} {new Date(selectedOrderDetails.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>

              {/* Address Section */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {(selectedOrderDetails.items?.[0]?.type === 'service' || (selectedOrderDetails.stores && !selectedOrderDetails.stores.vendor_id)) ? 'Service Address' : 'Delivery Address'}
                </h4>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
                  <MapPin size={20} color="#4f46e5" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ color: '#1e293b', fontWeight: 700, fontSize: '0.95rem' }}>{selectedOrderDetails.addresses?.society || 'Thaltej'}</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px', lineHeight: 1.4 }}>{selectedOrderDetails.addresses?.address_line_1 || ''}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items Summary</h4>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                  {(selectedOrderDetails.items || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: idx !== (selectedOrderDetails.items || []).length - 1 ? '1px solid #e2e8f0' : 'none', background: '#fff' }}>
                      <span style={{ color: '#334155', fontWeight: 500 }}>{item.qty || item.quantity || 1}x {item.name || item.products?.name || 'Item'}</span>
                      <span style={{ color: '#0f172a', fontWeight: 600 }}>₹{item.price_at_purchase || item.price || 0}</span>
                    </div>
                  ))}
                  {(!selectedOrderDetails.items || selectedOrderDetails.items.length === 0) && (
                    <div style={{ padding: '12px 16px', color: '#64748b' }}>Details not available</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>
                      {selectedOrderDetails.status?.toUpperCase() === 'CANCELLED' ? 'Total Refunded (Paytm)' : 'Total Paid'}
                    </span>
                    <span style={{ color: selectedOrderDetails.status?.toUpperCase() === 'CANCELLED' ? '#ef4444' : '#10b981', fontWeight: 800, fontSize: '1.1rem' }}>₹{selectedOrderDetails.total_price || selectedOrderDetails.total_amount}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Info</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f1f5f9', borderRadius: '12px' }}>
                  <CreditCard size={20} color="#64748b" />
                  <div>
                    <div style={{ color: '#334155', fontWeight: 600 }}>
                      {selectedOrderDetails.status?.toUpperCase() === 'CANCELLED' ? 'Refunded to Paytm' : (selectedOrderDetails.payment_method || 'Paid Online')}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '2px' }}>Transaction ID: {selectedOrderDetails.id?.split('-')[0] || ''}</div>
                  </div>
                  <div style={{ 
                    marginLeft: 'auto', 
                    background: selectedOrderDetails.status?.toUpperCase() === 'CANCELLED' ? '#ef4444' : '#10b981', 
                    color: 'white', 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    padding: '4px 8px', 
                    borderRadius: '8px' 
                  }}>
                    {selectedOrderDetails.status?.toUpperCase() === 'CANCELLED' ? 'REFUNDED' : 'SUCCESS'}
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      )}

    </motion.div>
  );
};

export default TrackOrders;
