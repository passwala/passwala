'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase-client';
import { playNotificationPing, getApiUrl, getStraightLineDistance } from './utils';
import { toast } from 'react-hot-toast';

export interface RiderUser {
  id: string;
  user_id?: string;
  phone: string;
  name: string;
  vehicle_no: string;
  license_no: string;
  id_proof: string;
  vehicle_type?: string;
  is_active: boolean;
  is_verified: boolean;
  rating: number;
  total_deliveries: number;
}

export interface DeliveryItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ActiveDeliveryOrder {
  id: string; // Order UUID from DB
  order_number: string;
  store_name: string;
  store_address: string;
  store_phone: string;
  store_lat?: number;
  store_lng?: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_lat?: number;
  customer_lng?: number;
  total_amount: number;
  payment_mode: 'ONLINE' | 'COD';
  delivery_fee: number;
  items: DeliveryItem[];
  status: 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
  step: number; // 1: To Store, 2: At Store & Picked Up, 3: In Transit & Handover
  distance?: string;
  estimatedTime?: string;
}

export interface ActiveCityRide {
  id: string; // Booking UUID from ticket_bookings
  passenger_name: string;
  passenger_phone: string;
  pickup_area: string;
  drop_area: string;
  pickup_lat?: number;
  pickup_lng?: number;
  drop_lat?: number;
  drop_lng?: number;
  total_price: number;
  status: 'CONFIRMED' | 'EN_ROUTE' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  step: number; // 1: Heading to pickup, 2: At pickup & OTP, 3: Riding, 4: Completed
  otp?: string;
  seat_count?: number;
  distance?: string;
}

export interface RiderStats {
  earnings: number;
  deliveries: number;
  rides: number;
  acceptanceRate: number;
  cancellationRate: number;
}

interface RiderContextType {
  rider: RiderUser | null;
  isOnline: boolean;
  stats: RiderStats;
  sessionStartTime: number | null;
  onlineDuration: string;
  currentCoords: { lat: number; lng: number } | null;
  activeOrder: ActiveDeliveryOrder | null;
  activeRide: ActiveCityRide | null;
  incomingOrder: ActiveDeliveryOrder | null;
  incomingRide: ActiveCityRide | null;
  showLocationDisclosure: boolean;
  setShowLocationDisclosure: (show: boolean) => void;
  toggleOnlineStatus: () => void;
  login: (phone: string, name?: string) => Promise<void>;
  loginAsDemoRider: () => void;
  logout: () => void;
  acceptIncomingOrder: () => Promise<void>;
  rejectIncomingOrder: () => void;
  advanceOrderStep: () => Promise<void>;
  cancelActiveOrder: () => Promise<void>;
  acceptIncomingRide: () => Promise<void>;
  rejectIncomingRide: () => void;
  advanceRideStep: () => Promise<void>;
  cancelActiveRide: () => Promise<void>;
  refreshRider: () => Promise<void>;
  loading: boolean;
}

const RiderContext = createContext<RiderContextType | null>(null);

// Verified DB-backed partner for immediate seamless testing
export const DEMO_RIDER: RiderUser = {
  id: '713de5f7-af5c-4d0c-b10a-3fe897eec6fb',
  user_id: '189ea624-b768-44ee-9bcb-224c39182c7c',
  phone: '9099381062',
  name: 'RRD (Passwala Partner)',
  vehicle_no: 'gj01tw4453',
  license_no: 'MFJR95944U94U954',
  id_proof: '133957486476',
  vehicle_type: 'Bike',
  is_active: true,
  is_verified: true,
  rating: 4.95,
  total_deliveries: 124
};

export const RiderProvider = ({ children }: { children: React.ReactNode }) => {
  const [rider, setRider] = useState<RiderUser | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState<RiderStats>({
    earnings: 850,
    deliveries: 12,
    rides: 4,
    acceptanceRate: 98,
    cancellationRate: 1
  });
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [onlineDuration, setOnlineDuration] = useState('0h 0m');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [activeOrder, setActiveOrder] = useState<ActiveDeliveryOrder | null>(null);
  const [activeRide, setActiveRide] = useState<ActiveCityRide | null>(null);
  const [incomingOrder, setIncomingOrder] = useState<ActiveDeliveryOrder | null>(null);
  const [incomingRide, setIncomingRide] = useState<ActiveCityRide | null>(null);
  const [rejectedOrderIds, setRejectedOrderIds] = useState<string[]>([]);
  const [rejectedRideIds, setRejectedRideIds] = useState<string[]>([]);
  const [showLocationDisclosure, setShowLocationDisclosure] = useState(false);
  const [loading, setLoading] = useState(true);

  const watchIdRef = useRef<number | null>(null);
  const lastAlertedOrderId = useRef<string | null>(null);
  const lastAlertedRideId = useRef<string | null>(null);

  // 1. Initialize Session from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('passwala_rider_user');
      const savedOnline = localStorage.getItem('passwala_rider_online');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRider(parsed);
        if (savedOnline === 'true') {
          setIsOnline(true);
          const savedSession = localStorage.getItem('passwala_rider_session_start');
          setSessionStartTime(savedSession ? parseInt(savedSession) : Date.now());
        }
      } else {
        setRider(DEMO_RIDER);
      }

      const savedRejections = localStorage.getItem('passwala_rejected_orders');
      if (savedRejections) {
        setRejectedOrderIds(JSON.parse(savedRejections));
      }
      const savedRideRejections = localStorage.getItem('passwala_rejected_rides');
      if (savedRideRejections) {
        setRejectedRideIds(JSON.parse(savedRideRejections));
      }
    } catch (e) {
      console.warn('Could not restore rider session:', e);
      setRider(DEMO_RIDER);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Online Shift Duration Clock
  useEffect(() => {
    if (!isOnline || !sessionStartTime) {
      setOnlineDuration('0h 0m');
      return;
    }

    const updateTimer = () => {
      const diff = Date.now() - sessionStartTime;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setOnlineDuration(`${hours}h ${mins}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, [isOnline, sessionStartTime]);

  // 3. Live GPS Location Tracking & Supabase rider_locations Sync
  useEffect(() => {
    if (!isOnline || !rider?.id) {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentCoords(coords);

          try {
            if (rider.id && !rider.id.startsWith('demo-')) {
              await supabase.from('rider_locations').upsert({
                rider_id: rider.id,
                lat: coords.lat,
                lng: coords.lng,
                updated_at: new Date().toISOString()
              }, { onConflict: 'rider_id' });
            }
          } catch (err) {
            console.warn('GPS location sync warning:', err);
          }
        },
        (err) => {
          console.warn('Geolocation sensor warning:', err);
          setCurrentCoords({ lat: 23.0304, lng: 72.5178 }); // Satellite, Ahmedabad default
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isOnline, rider?.id]);

  // 4. Fetch Real Stats from Supabase
  const refreshStats = useCallback(async () => {
    if (!rider?.id) return;
    try {
      const { data: earningsData } = await supabase
        .from('rider_earnings')
        .select('amount')
        .eq('rider_id', rider.id);

      const totalEarn = (earningsData || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);

      const { data: trackingData } = await supabase
        .from('delivery_tracking')
        .select('order_id, status')
        .eq('rider_id', rider.id);

      const totalDeliveries = (trackingData || []).filter(t => t.status === 'DELIVERED').length;

      // Also count completed rides
      const { data: vehicleData } = await supabase
        .from('city_vehicles')
        .select('id')
        .eq('driver_id', rider.user_id || rider.id)
        .maybeSingle();

      let totalRides = 0;
      if (vehicleData) {
        const { count } = await supabase
          .from('ticket_bookings')
          .select('*', { count: 'exact', head: true })
          .eq('vehicle_id', vehicleData.id)
          .eq('status', 'COMPLETED');
        totalRides = count || 0;
      }

      setStats(prev => ({
        ...prev,
        earnings: totalEarn > 0 ? totalEarn : prev.earnings,
        deliveries: totalDeliveries > 0 ? totalDeliveries : prev.deliveries,
        rides: totalRides > 0 ? totalRides : prev.rides
      }));
    } catch (err) {
      console.warn('Failed to refresh stats:', err);
    }
  }, [rider?.id, rider?.user_id]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // 5. Fetch Ongoing Active Delivery Order from Supabase
  const fetchActiveDeliveryOrder = useCallback(async () => {
    if (!rider?.id || activeOrder) return;
    try {
      const { data: trackingRecords, error: trackErr } = await supabase
        .from('delivery_tracking')
        .select('order_id, status')
        .eq('rider_id', rider.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (trackErr || !trackingRecords || trackingRecords.length === 0) return;

      for (const record of trackingRecords) {
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select('*, stores(name, address, lat, lng, vendor_id), addresses(*), users(full_name, phone), order_items(id, quantity, products(name, description, price))')
          .eq('id', record.order_id)
          .maybeSingle();

        if (!orderErr && orderData && !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(orderData.status)) {
          // Determine step
          let step = 1;
          if (orderData.status === 'OUT_FOR_DELIVERY' || record.status === 'PICKED_UP') {
            step = 3;
          } else if (record.status === 'PICKED_UP') {
            step = 2;
          } else {
            step = 1;
          }

          let customerAddr = 'Customer Location';
          if (orderData.addresses) {
            const a = orderData.addresses;
            const parts = [a.house_no, a.floor, a.address_line_1, a.address_line_2, a.society, a.city, a.pincode].filter(Boolean);
            customerAddr = parts.join(', ') || 'Customer Location';
          }

          const storeCoords = {
            lat: parseFloat(orderData.stores?.lat) || 23.0396,
            lng: parseFloat(orderData.stores?.lng) || 72.5126
          };

          const customerCoords = {
            lat: parseFloat(orderData.addresses?.lat) || 23.0304,
            lng: parseFloat(orderData.addresses?.lng) || 72.5178
          };

          const deliveryFee = Number(orderData.delivery_fee) > 0
            ? Number(orderData.delivery_fee)
            : Math.max(45, Math.round(Number(orderData.total_amount) * 0.12));

          setActiveOrder({
            id: orderData.id,
            order_number: `#PW-${orderData.id.slice(0, 6).toUpperCase()}`,
            store_name: orderData.stores?.name || 'Passwala Partner Store',
            store_address: orderData.stores?.address || 'Ahmedabad',
            store_phone: '+91 98250 11223',
            store_lat: storeCoords.lat,
            store_lng: storeCoords.lng,
            customer_name: orderData.users?.full_name || 'Passwala Customer',
            customer_phone: orderData.users?.phone || '+91 98255 51169',
            customer_address: customerAddr,
            customer_lat: customerCoords.lat,
            customer_lng: customerCoords.lng,
            total_amount: Number(orderData.total_amount) || 250,
            payment_mode: orderData.payment_status === 'PAID' ? 'ONLINE' : 'COD',
            delivery_fee: deliveryFee,
            items: (orderData.order_items || []).map((item: any) => ({
              name: item.products?.name || 'Store Item',
              quantity: item.quantity || 1,
              price: item.products?.price ? Number(item.products.price) : 50
            })),
            status: record.status as any || 'ASSIGNED',
            step
          });
          break;
        }
      }
    } catch (err) {
      console.warn('Error fetching active delivery order:', err);
    }
  }, [rider?.id, activeOrder]);

  // 6. Fetch Active City Passenger Ride
  const fetchActiveRide = useCallback(async () => {
    if (!isOnline || activeOrder || activeRide) return;
    const uid = rider?.user_id || rider?.id;
    if (!uid) return;

    try {
      const apiBase = getApiUrl();
      const res = await fetch(`${apiBase}/api/city-rides/active-ride?driverId=${uid}`);
      const data = await res.json();

      if (data.success && data.booking) {
        const b = data.booking;
        const stage = b.seat_numbers?.ride_stage || b.status;
        let step = 1;
        if (stage === 'EN_ROUTE' || stage === 'CONFIRMED') step = 1;
        else if (stage === 'ARRIVED') step = 2;
        else if (stage === 'IN_PROGRESS') step = 3;
        else if (stage === 'COMPLETED') step = 4;

        setActiveRide({
          id: b.id,
          passenger_name: b.users?.full_name || 'Passenger',
          passenger_phone: b.users?.phone || '+91 98255 51169',
          pickup_area: b.pickup_area,
          drop_area: b.drop_area,
          pickup_lat: parseFloat(b.pickup_lat),
          pickup_lng: parseFloat(b.pickup_lng),
          drop_lat: parseFloat(b.drop_lat),
          drop_lng: parseFloat(b.drop_lng),
          total_price: Number(b.total_price),
          status: stage as any,
          step,
          seat_count: b.seat_count || 1
        });
      }
    } catch (err) {
      console.warn('Error fetching active ride:', err);
    }
  }, [isOnline, activeOrder, activeRide, rider?.user_id, rider?.id]);

  // 7. REAL-TIME DISPATCH ENGINE: Poll and match live orders & passenger rides
  const fetchPendingOffers = useCallback(async () => {
    if (!isOnline || activeOrder || activeRide || incomingOrder || incomingRide) return;

    try {
      const apiBase = getApiUrl();

      // Check 1: Real passenger rides from /api/city-rides/pending-rides
      try {
        const rideRes = await fetch(`${apiBase}/api/city-rides/pending-rides`);
        if (rideRes.ok) {
          const rideData = await rideRes.json();
          const rides = rideData.success ? rideData.bookings : [];
          const validRide = (rides || []).find((r: any) =>
            (!r.vehicle_id) &&
            (!rejectedRideIds.includes(r.id)) &&
            (!r.seat_numbers?.ride_stage || r.seat_numbers?.ride_stage === 'PENDING')
          );

          if (validRide) {
            setIncomingRide({
              id: validRide.id,
              passenger_name: validRide.users?.full_name || 'Passenger',
              passenger_phone: validRide.users?.phone || '+91 98255 51169',
              pickup_area: validRide.pickup_area,
              drop_area: validRide.drop_area,
              pickup_lat: parseFloat(validRide.pickup_lat),
              pickup_lng: parseFloat(validRide.pickup_lng),
              drop_lat: parseFloat(validRide.drop_lat),
              drop_lng: parseFloat(validRide.drop_lng),
              total_price: Number(validRide.total_price),
              status: 'CONFIRMED',
              step: 1,
              seat_count: validRide.seat_count || 1
            });

            if (lastAlertedRideId.current !== validRide.id) {
              lastAlertedRideId.current = validRide.id;
              playNotificationPing();
              toast.success(`New Passenger Ride Offer: ₹${validRide.total_price}!`);
            }
            return;
          }
        }
      } catch (err) {
        console.warn('City ride pending check warning:', err);
      }

      // Check 2: Real unassigned orders from Supabase `orders`
      const twoDaysAgo = new Date();
      twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

      let orderQuery = supabase
        .from('orders')
        .select('*, stores(name, address, lat, lng, vendor_id), addresses(*), users(full_name, phone), order_items(id, quantity, products(name, description, price))')
        .in('status', ['PLACED', 'PREPARING'])
        .gt('total_amount', 0)
        .gt('created_at', twoDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (rejectedOrderIds.length > 0) {
        orderQuery = orderQuery.not('id', 'in', `(${rejectedOrderIds.join(',')})`);
      }

      const { data: orders, error: ordErr } = await orderQuery.limit(5);

      if (ordErr || !orders || orders.length === 0) return;

      // Filter out orders that already have an active rider assigned in delivery_tracking
      for (const order of orders) {
        const { data: tracking } = await supabase
          .from('delivery_tracking')
          .select('id, rider_id, status')
          .eq('order_id', order.id)
          .maybeSingle();

        // If another rider has claimed it, skip
        if (tracking && tracking.rider_id) continue;

        // Skip test items or service provider items
        const isService = order.order_items?.some((i: any) =>
          i.products?.description === 'Service item auto-registered'
        );
        if (isService) continue;

        let customerAddr = 'Customer Location';
        if (order.addresses) {
          const a = order.addresses;
          const parts = [a.house_no, a.floor, a.address_line_1, a.address_line_2, a.society, a.city, a.pincode].filter(Boolean);
          customerAddr = parts.join(', ') || 'Customer Location';
        }

        const storeCoords = {
          lat: parseFloat(order.stores?.lat) || 23.0396,
          lng: parseFloat(order.stores?.lng) || 72.5126
        };

        const customerCoords = {
          lat: parseFloat(order.addresses?.lat) || 23.0304,
          lng: parseFloat(order.addresses?.lng) || 72.5178
        };

        const deliveryFee = Number(order.delivery_fee) > 0
          ? Number(order.delivery_fee)
          : Math.max(45, Math.round(Number(order.total_amount) * 0.12));

        const dist = getStraightLineDistance(
          storeCoords.lat,
          storeCoords.lng,
          customerCoords.lat,
          customerCoords.lng
        );

        setIncomingOrder({
          id: order.id,
          order_number: `#PW-${order.id.slice(0, 6).toUpperCase()}`,
          store_name: order.stores?.name || 'Passwala Partner Store',
          store_address: order.stores?.address || 'Ahmedabad',
          store_phone: '+91 98250 11223',
          store_lat: storeCoords.lat,
          store_lng: storeCoords.lng,
          customer_name: order.users?.full_name || 'Passwala Customer',
          customer_phone: order.users?.phone || '+91 98255 51169',
          customer_address: customerAddr,
          customer_lat: customerCoords.lat,
          customer_lng: customerCoords.lng,
          total_amount: Number(order.total_amount) || 250,
          payment_mode: order.payment_status === 'PAID' ? 'ONLINE' : 'COD',
          delivery_fee: deliveryFee,
          items: (order.order_items || []).map((item: any) => ({
            name: item.products?.name || 'Store Item',
            quantity: item.quantity || 1,
            price: item.products?.price ? Number(item.products.price) : 50
          })),
          status: 'ASSIGNED',
          step: 1,
          distance: `${dist} km`,
          estimatedTime: `${Math.round(dist * 3.5 + 8)} mins`
        });

        if (lastAlertedOrderId.current !== order.id) {
          lastAlertedOrderId.current = order.id;
          playNotificationPing();
          toast.success(`New Delivery Offer: ₹${deliveryFee}!`);
        }
        break;
      }
    } catch (err) {
      console.warn('Real-time order polling error:', err);
    }
  }, [isOnline, activeOrder, activeRide, incomingOrder, incomingRide, rejectedOrderIds, rejectedRideIds]);

  // 8. Lifecycle Hooks: Polling & WebSocket Channels
  useEffect(() => {
    if (isOnline) {
      fetchActiveDeliveryOrder();
      fetchActiveRide();
      fetchPendingOffers();

      // Poll every 5s for robust live synchronization
      const pollTimer = setInterval(() => {
        fetchActiveDeliveryOrder();
        fetchActiveRide();
        fetchPendingOffers();
      }, 5000);

      // Realtime channel for instant push updates
      const channel = supabase
        .channel('rider-live-feed')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          fetchPendingOffers();
          fetchActiveDeliveryOrder();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_tracking' }, () => {
          fetchPendingOffers();
          fetchActiveDeliveryOrder();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_bookings' }, () => {
          fetchPendingOffers();
          fetchActiveRide();
        })
        .subscribe();

      return () => {
        clearInterval(pollTimer);
        supabase.removeChannel(channel);
      };
    }
  }, [isOnline, fetchActiveDeliveryOrder, fetchActiveRide, fetchPendingOffers]);

  // 9. Real-time active order cancellation / state sync
  useEffect(() => {
    if (!activeOrder?.id) return;
    const channel = supabase
      .channel(`active-order-${activeOrder.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${activeOrder.id}`
      }, (payload) => {
        if (['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(payload.new.status)) {
          setActiveOrder(null);
          toast(`Order updated to ${payload.new.status}`, { icon: 'ℹ️' });
          refreshStats();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrder?.id, refreshStats]);

  // 10. Real-time active ride cancellation / state sync
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
        if (payload.new.status === 'CANCELLED') {
          setActiveRide(null);
          toast.error('Passenger cancelled the trip');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRide?.id]);

  // Online status toggling
  const toggleOnlineStatus = () => {
    if (!isOnline) {
      const consented = localStorage.getItem('passwala_location_consent');
      if (consented !== 'accepted') {
        setShowLocationDisclosure(true);
        return;
      }
      const now = Date.now();
      setIsOnline(true);
      setSessionStartTime(now);
      localStorage.setItem('passwala_rider_online', 'true');
      localStorage.setItem('passwala_rider_session_start', now.toString());

      if (rider?.id) {
        supabase.from('riders').update({ is_active: true }).eq('id', rider.id).then();
        supabase.from('city_vehicles').update({ is_active: true }).eq('driver_id', rider.user_id || rider.id).then();
      }
      toast.success('Shift Started! Radar listening for live dispatches.');
    } else {
      setIsOnline(false);
      setSessionStartTime(null);
      localStorage.setItem('passwala_rider_online', 'false');
      localStorage.removeItem('passwala_rider_session_start');

      if (rider?.id) {
        supabase.from('riders').update({ is_active: false }).eq('id', rider.id).then();
        supabase.from('city_vehicles').update({ is_active: false }).eq('driver_id', rider.user_id || rider.id).then();
        supabase.from('rider_locations').delete().eq('rider_id', rider.id).then();
      }
      toast('Shift Ended. You are now offline.');
    }
  };

  // Login handler
  const login = async (phone: string, name?: string) => {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone}`)
        .maybeSingle();

      let riderUser: RiderUser;

      if (userData) {
        const { data: riderData } = await supabase
          .from('riders')
          .select('*')
          .eq('user_id', userData.id)
          .maybeSingle();

        riderUser = {
          id: riderData?.id || userData.id,
          user_id: userData.id,
          phone: cleanPhone,
          name: name || userData.full_name || 'Rider Partner',
          vehicle_no: riderData?.vehicle_no || 'GJ 01 AB 8842',
          license_no: riderData?.license_no || 'Verified',
          id_proof: riderData?.id_proof || 'Verified',
          vehicle_type: 'Motorcycle',
          is_active: Boolean(riderData?.is_active),
          is_verified: Boolean(riderData?.is_verified),
          rating: riderData?.rating || 4.9,
          total_deliveries: riderData?.total_deliveries || 0
        };
      } else {
        riderUser = {
          ...DEMO_RIDER,
          phone: cleanPhone,
          name: name || 'Rider Partner'
        };
      }

      setRider(riderUser);
      localStorage.setItem('passwala_rider_user', JSON.stringify(riderUser));
      toast.success(`Logged in as ${riderUser.name}`);
    } catch (err) {
      console.error('Rider login error:', err);
      loginAsDemoRider();
    }
  };

  const loginAsDemoRider = () => {
    setRider(DEMO_RIDER);
    localStorage.setItem('passwala_rider_user', JSON.stringify(DEMO_RIDER));
    toast.success('Logged in as Passwala Demo Partner');
  };

  const logout = () => {
    if (isOnline) toggleOnlineStatus();
    setRider(null);
    setActiveOrder(null);
    setActiveRide(null);
    setIncomingOrder(null);
    setIncomingRide(null);
    localStorage.removeItem('passwala_rider_user');
    localStorage.removeItem('passwala_rider_online');
    localStorage.removeItem('passwala_rider_session_start');
    toast('Logged out successfully');
  };

  // ACCEPT INCOMING DELIVERY ORDER
  const acceptIncomingOrder = async () => {
    if (!incomingOrder || !rider?.id) return;
    const orderToClaim = incomingOrder;

    try {
      // 1. Atomic claim check: ensure order is still available
      const { data, error: claimErr } = await supabase
        .from('orders')
        .update({ status: 'ACCEPTED' })
        .eq('id', orderToClaim.id)
        .in('status', ['PLACED', 'PREPARING'])
        .select('id');

      if (claimErr || !data || data.length === 0) {
        toast.error('Order was already accepted by another rider!');
        setIncomingOrder(null);
        return;
      }

      // 2. Link rider in delivery_tracking
      const { data: existingTrack } = await supabase
        .from('delivery_tracking')
        .select('id')
        .eq('order_id', orderToClaim.id)
        .maybeSingle();

      if (existingTrack) {
        await supabase
          .from('delivery_tracking')
          .update({
            rider_id: rider.id,
            status: 'ASSIGNED',
            updated_at: new Date().toISOString()
          })
          .eq('order_id', orderToClaim.id);
      } else {
        await supabase
          .from('delivery_tracking')
          .insert([{
            order_id: orderToClaim.id,
            rider_id: rider.id,
            status: 'ASSIGNED',
            updated_at: new Date().toISOString()
          }]);
      }

      setActiveOrder({
        ...orderToClaim,
        step: 1,
        status: 'ASSIGNED'
      });
      setIncomingOrder(null);
      toast.success('Order Claimed! Head to the store for pickup.');
    } catch (err) {
      console.error('Error accepting order:', err);
      toast.error('Failed to accept order. Please check connection.');
    }
  };

  const rejectIncomingOrder = () => {
    if (!incomingOrder) return;
    const orderId = incomingOrder.id;
    setRejectedOrderIds(prev => {
      const next = [...prev, orderId];
      localStorage.setItem('passwala_rejected_orders', JSON.stringify(next));
      return next;
    });
    setIncomingOrder(null);
    toast('Delivery offer declined');
  };

  // STEP ADVANCE FOR DELIVERY ORDER
  const advanceOrderStep = async () => {
    if (!activeOrder || !rider?.id) return;

    try {
      if (activeOrder.step === 1) {
        // Step 1 -> Step 2: Arrived at store
        await supabase.from('delivery_tracking').update({ status: 'ASSIGNED' }).eq('order_id', activeOrder.id);
        await supabase.from('orders').update({ status: 'PREPARING' }).eq('id', activeOrder.id);
        setActiveOrder(prev => prev ? { ...prev, step: 2 } : null);
        toast.success('Arrived at store! Please verify packaged items.');
      } else if (activeOrder.step === 2) {
        // Step 2 -> Step 3: Picked up, in transit to customer
        await supabase.from('delivery_tracking').update({ status: 'PICKED_UP' }).eq('order_id', activeOrder.id);
        await supabase.from('orders').update({ status: 'OUT_FOR_DELIVERY' }).eq('id', activeOrder.id);
        setActiveOrder(prev => prev ? { ...prev, step: 3, status: 'PICKED_UP' } : null);
        toast.success('Order Picked Up! Head to customer delivery point.');
      } else {
        // Step 3 -> Delivered
        const { error: ordErr } = await supabase
          .from('orders')
          .update({ status: 'DELIVERED', updated_at: new Date().toISOString() })
          .eq('id', activeOrder.id);

        if (ordErr) {
          toast.error('Failed to mark order completed in database');
          return;
        }

        await supabase
          .from('delivery_tracking')
          .update({ status: 'DELIVERED', updated_at: new Date().toISOString() })
          .eq('order_id', activeOrder.id);

        // Record earnings
        const earningsFee = activeOrder.delivery_fee || 50;
        await supabase.from('rider_earnings').insert([{
          rider_id: rider.id,
          order_id: activeOrder.id,
          amount: earningsFee
        }]);

        setStats(prev => ({
          ...prev,
          earnings: prev.earnings + earningsFee,
          deliveries: prev.deliveries + 1
        }));

        setActiveOrder(null);
        toast.success(`Delivery Complete! +₹${earningsFee} added to earnings.`, { duration: 5000 });
      }
    } catch (err) {
      console.error('Error advancing order step:', err);
      toast.error('Network error updating status');
    }
  };

  const cancelActiveOrder = async () => {
    if (!activeOrder) return;
    try {
      await supabase.from('orders').update({ status: 'CANCELLED' }).eq('id', activeOrder.id);
      await supabase.from('delivery_tracking').update({ status: 'CANCELLED' }).eq('order_id', activeOrder.id);
      setActiveOrder(null);
      toast.error('Order delivery cancelled');
    } catch (err) {
      console.error('Error cancelling order:', err);
    }
  };

  // ACCEPT INCOMING PASSENGER RIDE
  const acceptIncomingRide = async () => {
    if (!incomingRide || !rider?.id) return;
    const rideToClaim = incomingRide;

    try {
      const apiBase = getApiUrl();
      // 1. Fetch vehicle for this driver
      let { data: vehicle } = await supabase
        .from('city_vehicles')
        .select('id')
        .eq('driver_id', rider.user_id || rider.id)
        .maybeSingle();

      if (!vehicle) {
        // Auto-create bike vehicle for driver if missing
        const { data: newVeh } = await supabase
          .from('city_vehicles')
          .insert({
            driver_id: rider.user_id || rider.id,
            vehicle_type: 'Bike',
            license_plate: rider.vehicle_no || 'GJ01-PW-0000',
            total_seats: 1,
            available_seats: 1,
            is_active: true
          })
          .select()
          .single();
        vehicle = newVeh;
      }

      if (!vehicle) {
        toast.error('No driver vehicle record found');
        return;
      }

      // 2. Claim ride booking via backend API
      const claimRes = await fetch(`${apiBase}/api/city-rides/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: rideToClaim.id, vehicleId: vehicle.id })
      });
      const claimData = await claimRes.json();

      if (!claimRes.ok || !claimData.success) {
        toast.error(claimData.error || 'Ride already claimed by another driver.');
        setIncomingRide(null);
        return;
      }

      setActiveRide({
        ...rideToClaim,
        step: 1,
        status: 'EN_ROUTE'
      });
      setIncomingRide(null);
      toast.success('Ride Accepted! Navigate to passenger pickup location.');
    } catch (err) {
      console.error('Error accepting ride:', err);
      toast.error('Network error claiming ride');
    }
  };

  const rejectIncomingRide = () => {
    if (!incomingRide) return;
    const rideId = incomingRide.id;
    setRejectedRideIds(prev => {
      const next = [...prev, rideId];
      localStorage.setItem('passwala_rejected_rides', JSON.stringify(next));
      return next;
    });
    setIncomingRide(null);
    toast('Passenger trip declined');
  };

  // STEP ADVANCE FOR PASSENGER RIDE
  const advanceRideStep = async () => {
    if (!activeRide) return;
    const apiBase = getApiUrl();

    try {
      if (activeRide.step === 1) {
        // Step 1 -> Step 2: Arrived at passenger pickup
        const res = await fetch(`${apiBase}/api/city-rides/update-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: activeRide.id, status: 'ARRIVED' })
        });
        if (res.ok) {
          setActiveRide(prev => prev ? { ...prev, step: 2, status: 'ARRIVED' } : null);
          toast.success('Arrived at pickup! Ask passenger for their ride OTP.');
        }
      } else if (activeRide.step === 2) {
        // Step 2 -> Step 3: Verified OTP, start trip
        const res = await fetch(`${apiBase}/api/city-rides/update-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: activeRide.id, status: 'IN_PROGRESS' })
        });
        if (res.ok) {
          setActiveRide(prev => prev ? { ...prev, step: 3, status: 'IN_PROGRESS' } : null);
          toast.success('OTP Confirmed! Ride in progress to drop point.');
        }
      } else {
        // Step 3 -> Trip Completed
        const res = await fetch(`${apiBase}/api/city-rides/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: activeRide.id })
        });
        if (res.ok) {
          const fare = activeRide.total_price || 60;
          setStats(prev => ({
            ...prev,
            earnings: prev.earnings + fare,
            rides: prev.rides + 1
          }));
          setActiveRide(null);
          toast.success(`Trip Completed! +₹${fare} added to earnings.`, { duration: 5000 });
        }
      }
    } catch (err) {
      console.error('Error updating ride step:', err);
      toast.error('Failed to update trip stage');
    }
  };

  const cancelActiveRide = async () => {
    if (!activeRide) return;
    const apiBase = getApiUrl();
    try {
      await fetch(`${apiBase}/api/city-rides/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: activeRide.id, status: 'CANCELLED' })
      });
      setActiveRide(null);
      toast.error('Ride trip cancelled');
    } catch (err) {
      console.error('Error cancelling ride:', err);
    }
  };

  const refreshRider = async () => {
    if (rider?.phone) {
      await login(rider.phone, rider.name);
    }
  };

  return (
    <RiderContext.Provider
      value={{
        rider,
        isOnline,
        stats,
        sessionStartTime,
        onlineDuration,
        currentCoords,
        activeOrder,
        activeRide,
        incomingOrder,
        incomingRide,
        showLocationDisclosure,
        setShowLocationDisclosure,
        toggleOnlineStatus,
        login,
        loginAsDemoRider,
        logout,
        acceptIncomingOrder,
        rejectIncomingOrder,
        advanceOrderStep,
        cancelActiveOrder,
        acceptIncomingRide,
        rejectIncomingRide,
        advanceRideStep,
        cancelActiveRide,
        refreshRider,
        loading
      }}
    >
      {children}
    </RiderContext.Provider>
  );
};

export const useRider = () => {
  const context = useContext(RiderContext);
  if (!context) {
    throw new Error('useRider must be used within a RiderProvider');
  }
  return context;
};
