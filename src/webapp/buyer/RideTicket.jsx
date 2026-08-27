import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCode } from 'react-qr-code';
import { ArrowLeft, MapPin, Navigation, Share2, XCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabase';
import GoogleMapWrapper from '../../utils/GoogleMapWrapper';
import { useTranslation } from '../LanguageContext';

const RideTicket = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { booking, vehicle } = location.state || {};
  const [bookingData, setBookingData] = useState(booking || null);
  const [driverLoc, setDriverLoc] = useState(vehicle ? [vehicle.current_lat || 23.0225, vehicle.current_lng || 72.5714] : [23.0225, 72.5714]);
  const [ticketStatus, setTicketStatus] = useState(booking?.status || 'CONFIRMED');
  const [osrmRouteToPickup, setOsrmRouteToPickup] = useState([]);
  const [osrmRouteToDropoff, setOsrmRouteToDropoff] = useState([]);
  const [onlineRiders, setOnlineRiders] = useState([]);
  const [pickupRouteInfo, setPickupRouteInfo] = useState({ distance: 0, duration: 0 });
  const [dropoffRouteInfo, setDropoffRouteInfo] = useState({ distance: 0, duration: 0 });
  const [fetchLoading, setFetchLoading] = useState(!booking && !!(new URLSearchParams(location.search).get('id') || new URLSearchParams(location.search).get('bookingId')));
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Read query parameters for shared link loading
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const queryBookingId = searchParams.get('id') || searchParams.get('bookingId');
    
    if (!bookingData && queryBookingId) {
      const fetchFullBooking = async () => {
        setFetchLoading(true);
        try {
          const { data, error } = await supabase
            .from('ticket_bookings')
            .select(`
              *,
              city_vehicles (
                id,
                driver_id,
                vehicle_type,
                license_plate,
                current_lat,
                current_lng,
                last_location_update
              )
            `)
            .eq('id', queryBookingId)
            .maybeSingle();

          if (error) throw error;
          if (data) {
            setBookingData(data);
            if (data.city_vehicles) {
              setDriverLoc([data.city_vehicles.current_lat || 23.0225, data.city_vehicles.current_lng || 72.5714]);
            }
            if (data.status) {
              setTicketStatus(data.status);
            }
          } else {
            toast.error('Shared booking not found');
          }
        } catch (err) {
          console.error('Failed to fetch shared booking details:', err);
          toast.error('Failed to load shared ticket details');
        } finally {
          setFetchLoading(false);
        }
      };
      fetchFullBooking();
    }
  }, [location.search, bookingData]);

  // Fetch all online riders if the ticket is PENDING
  useEffect(() => {
    if (ticketStatus !== 'PENDING') {
      setOnlineRiders([]);
      return;
    }

    const fetchOnlineRiders = async () => {
      try {
        const { data, error } = await supabase
          .from('rider_locations')
          .select('rider_id, lat, lng, updated_at');
        
        if (!error && data) {
          const now = Date.now();
          // Filter to locations active in the last 15 minutes
          const active = data.filter(loc => {
            const lastUpdate = new Date(loc.updated_at).getTime();
            return now - lastUpdate < 900000;
          });
          setOnlineRiders(active);
        }
      } catch (err) {
        console.warn("Failed to fetch online riders:", err);
      }
    };

    fetchOnlineRiders();
    const interval = setInterval(fetchOnlineRiders, 6000);

    const channel = supabase
      .channel('rider-locations-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rider_locations' }, () => {
        fetchOnlineRiders();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [ticketStatus]);

  useEffect(() => {
    if (!bookingData) return;

    const pollStatus = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${baseUrl}/api/city-rides/booking-status?bookingId=${bookingData.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (data.status) {
              setTicketStatus(prevStatus => {
                if (prevStatus !== 'COMPLETED' && data.status === 'COMPLETED') {
                  toast.success('Ride Completed Successfully! Returning Home...', { id: 'ride-complete-toast' });
                  setTimeout(() => {
                    navigate('/');
                  }, 3000);
                }
                if (prevStatus !== 'CANCELLED' && data.status === 'CANCELLED') {
                  toast.success('Ride Cancelled! Returning Home...', { id: 'ride-cancel-toast' });
                  setTimeout(() => {
                    navigate('/');
                  }, 1000);
                }
                return data.status;
              });
            }
            if (data.driverLocation) {
              setDriverLoc([data.driverLocation.lat, data.driverLocation.lng]);
            }
          }
        }
      } catch (err) {
        console.error("Error polling booking status:", err);
      }
    };

    pollStatus();

    // Subscribe to status updates in real-time
    const bookingSub = supabase
      .channel(`booking-status-${bookingData.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'ticket_bookings',
        filter: `id=eq.${bookingData.id}`
      }, (payload) => {
        if (payload.new && payload.new.status) {
          setTicketStatus(prevStatus => {
            if (prevStatus !== 'COMPLETED' && payload.new.status === 'COMPLETED') {
              toast.success('Ride Completed Successfully! Returning Home...', { id: 'ride-complete-toast' });
              setTimeout(() => {
                navigate('/');
              }, 3000);
            }
            if (prevStatus !== 'CANCELLED' && payload.new.status === 'CANCELLED') {
              toast.success('Ride Cancelled! Returning Home...', { id: 'ride-cancel-toast' });
              setTimeout(() => {
                navigate('/');
              }, 1000);
            }
            return payload.new.status;
          });
        }
      })
      .subscribe();

    const interval = setInterval(pollStatus, 4000);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(bookingSub);
    };
  }, [bookingData, navigate]);

  // Fetch OSRM route from driver to pickup
  useEffect(() => {
    if (!bookingData || !driverLoc) return;

    const fetchPickupRoute = async () => {
      try {
        const startLng = driverLoc[1];
        const startLat = driverLoc[0];
        const endLng = parseFloat(bookingData.pickup_lng);
        const endLat = parseFloat(bookingData.pickup_lat);
        
        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)'
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map(pt => [pt[1], pt[0]]);
            setOsrmRouteToPickup(coords);
            setPickupRouteInfo({
              distance: data.routes[0].distance / 1000,
              duration: data.routes[0].duration / 60
            });
          }
        }
      } catch (e) {
        console.warn("Failed to fetch OSRM route to pickup:", e);
      }
    };

    fetchPickupRoute();
  }, [bookingData, driverLoc]);

  // Fetch OSRM route from pickup to dropoff
  useEffect(() => {
    if (!bookingData) return;

    const fetchDropoffRoute = async () => {
      try {
        const startLng = parseFloat(bookingData.pickup_lng);
        const startLat = parseFloat(bookingData.pickup_lat);
        const endLng = parseFloat(bookingData.drop_lng);
        const endLat = parseFloat(bookingData.drop_lat);

        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)'
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map(pt => [pt[1], pt[0]]);
            setOsrmRouteToDropoff(coords);
            setDropoffRouteInfo({
              distance: data.routes[0].distance / 1000,
              duration: data.routes[0].duration / 60
            });
          }
        }
      } catch (e) {
        console.warn("Failed to fetch OSRM route to dropoff:", e);
      }
    };

    fetchDropoffRoute();
  }, [bookingData]);

  const handleCancel = async () => {
    if (!bookingData) return;
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/city-rides/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingData.id,
          userId: bookingData.user_id
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setTicketStatus('CANCELLED');
      toast.success('Ticket cancelled successfully');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err) {
      toast.error(err.message || 'Error cancelling ticket');
    }
  };

  const handleShare = async () => {
    if (!bookingData) return;
    
    // Construct shared URL with the booking ID as query param
    const shareUrl = `${window.location.origin}/ride-ticket?id=${bookingData.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Passwala City Ride Ticket',
          url: shareUrl
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          toast.error('Sharing failed');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Ticket link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy link to clipboard');
      }
    }
  };

  if (fetchLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '40px', height: '40px',
          border: '4px solid rgba(255,107,0,0.15)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #fff7f2 0%, #fff 60%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center'
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', background: 'var(--bg-card)', border: '1px solid #e2e8f0', borderRadius: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-secondary)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <ArrowLeft size={16} /> {t('back')}
        </button>

        <div style={{
          width: 110, height: 110, borderRadius: '32px',
          background: 'linear-gradient(135deg, #ff7622, #ff9a5c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '2rem',
          boxShadow: '0 20px 60px rgba(255,118,34,0.3)',
          animation: 'float 3s ease-in-out infinite'
        }}>
          <span style={{ fontSize: '3rem' }}>🎫</span>
        </div>

        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
          {t('no_ticket_found')}
        </h2>
        <p style={{ margin: '0 0 2rem', fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 280 }}>
          {t('no_ticket_found_sub')}
        </p>

        <button
          onClick={() => navigate('/city-ride')}
          style={{
            background: 'linear-gradient(135deg, #ff7622, #ff9a5c)',
            color: 'white',
            border: 'none',
            borderRadius: 16,
            padding: '1rem 2.5rem',
            fontSize: '1rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(255,118,34,0.35)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          🛵 {t('book_city_ride')}
        </button>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
          }
        `}</style>
      </div>
    );
  }

  const googleMarkers = [];
  if (bookingData?.pickup_lat && bookingData?.pickup_lng) {
    googleMarkers.push({
      position: [parseFloat(bookingData.pickup_lat), parseFloat(bookingData.pickup_lng)],
      title: 'Pickup Location',
      svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="13" fill="#f97316" stroke="white" stroke-width="2" /><g transform="translate(7, 7)"><path d="M12 6c0 3.6-4.8 7.2-4.8 7.2S2.4 9.6 2.4 6a4.8 4.8 0 0 1 9.6 0Z" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="7.2" cy="6" r="1.8" fill="none" stroke="white" stroke-width="1.8"/></g></svg>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  }
  if (bookingData?.drop_lat && bookingData?.drop_lng) {
    googleMarkers.push({
      position: [parseFloat(bookingData.drop_lat), parseFloat(bookingData.drop_lng)],
      title: 'Dropoff Location',
      svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><circle cx="15" cy="15" r="13" fill="#3b82f6" stroke="white" stroke-width="2" /><g transform="translate(7, 7)"><path d="m1.8 5.4 5.4-4.2 5.4 4.2V12a1.2 1.2 0 0 1-1.2 1.2H3a1.2 1.2 0 0 1-1.2-1.2Z" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><polyline points="5.4 13.2 5.4 7.2 9 7.2 9 13.2" fill="none" stroke="white" stroke-width="1.8"/></g></svg>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  }
  if (ticketStatus !== 'PENDING' && driverLoc) {
    googleMarkers.push({
      position: driverLoc,
      title: 'Assigned Driver Live Location',
      svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="#10b981" stroke="white" stroke-width="2.5" /><g transform="translate(9, 9)"><circle cx="13.8" cy="13.1" r="1.8" fill="none" stroke="white" stroke-width="1.8" /><circle cx="4.1" cy="13.1" r="1.8" fill="none" stroke="white" stroke-width="1.8" /><circle cx="11.2" cy="3.7" r="0.75" fill="none" stroke="white" stroke-width="1.5" /><path d="M9 13.1V10.5L6.7 8.2l3-2.2 1.5 2.2H13" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></g></svg>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  }
  if (ticketStatus === 'PENDING') {
    onlineRiders.forEach(rider => {
      googleMarkers.push({
        position: [rider.lat, rider.lng],
        title: 'Passwala Rider Online',
        svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="#f97316" stroke="white" stroke-width="2" /><g transform="translate(7, 7)"><circle cx="10.7" cy="10.2" r="1.4" fill="none" stroke="white" stroke-width="1.4" /><circle cx="3.2" cy="10.2" r="1.4" fill="none" stroke="white" stroke-width="1.4" /><circle cx="8.7" cy="2.9" r="0.5" fill="none" stroke="white" stroke-width="1.2" /><path d="M7 10.2V8.2L5.2 6.4l2.3-1.7 1.2 1.7h1.6" fill="none" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></g></svg>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
    });
  }

  const googlePolylines = [];
  if (osrmRouteToPickup && osrmRouteToPickup.length > 0) {
    googlePolylines.push({ path: osrmRouteToPickup, color: '#3b82f6', weight: 5, style: 'dashed' });
  } else if (driverLoc && bookingData?.pickup_lat) {
    googlePolylines.push({ path: [driverLoc, [parseFloat(bookingData.pickup_lat), parseFloat(bookingData.pickup_lng)]], color: '#3b82f6', weight: 4, style: 'dashed' });
  }

  if (osrmRouteToDropoff && osrmRouteToDropoff.length > 0) {
    const speed = dropoffRouteInfo.duration > 0 ? dropoffRouteInfo.distance / (dropoffRouteInfo.duration / 60) : 25;
    if (speed < 22) {
      const sliceIdx = Math.ceil(osrmRouteToDropoff.length * 0.35);
      googlePolylines.push({ path: osrmRouteToDropoff.slice(0, sliceIdx + 1), color: '#ef4444', weight: 6 });
      googlePolylines.push({ path: osrmRouteToDropoff.slice(sliceIdx), color: '#10b981', weight: 6 });
    } else {
      googlePolylines.push({ path: osrmRouteToDropoff, color: '#10b981', weight: 6 });
    }
  } else if (bookingData?.pickup_lat && bookingData?.drop_lat) {
    const p1 = [parseFloat(bookingData.pickup_lat), parseFloat(bookingData.pickup_lng)];
    const p2 = [parseFloat(bookingData.drop_lat), parseFloat(bookingData.drop_lng)];
    const speed = (bookingData.distance_km && dropoffRouteInfo.duration > 0) ? bookingData.distance_km / (dropoffRouteInfo.duration / 60) : 25;
    if (speed < 22) {
      const mid = [p1[0] + (p2[0] - p1[0]) * 0.35, p1[1] + (p2[1] - p1[1]) * 0.35];
      googlePolylines.push({ path: [p1, mid], color: '#ef4444', weight: 5 });
      googlePolylines.push({ path: [mid, p2], color: '#10b981', weight: 5 });
    } else {
      googlePolylines.push({ path: [p1, p2], color: '#10b981', weight: 5 });
    }
  }

  const fitPoints = [];
  if (driverLoc) fitPoints.push(driverLoc);
  if (bookingData?.pickup_lat) fitPoints.push([parseFloat(bookingData.pickup_lat), parseFloat(bookingData.pickup_lng)]);
  if (bookingData?.drop_lat) fitPoints.push([parseFloat(bookingData.drop_lat), parseFloat(bookingData.drop_lng)]);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-main)', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>{t('digital_ticket')}</h2>
        </div>
        <Share2 
          size={20} 
          color="var(--primary)" 
          style={{ cursor: 'pointer' }} 
          onClick={handleShare}
        />
      </div>

      {/* Map Area - Fixed height to show route and driver clearly without overlap */}
      <div style={{ height: '40vh', width: '100%', position: 'relative', borderBottom: '1px solid #e2e8f0' }}>
        {bookingData?.pickup_lat && bookingData?.pickup_lng && bookingData?.drop_lat && bookingData?.drop_lng ? (
          <GoogleMapWrapper
            center={driverLoc}
            zoom={14}
            markers={googleMarkers}
            polylines={googlePolylines}
            fitBoundsPoints={fitPoints}
            style={{ height: '100%', width: '100%' }}
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface)', color: '#94a3b8', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '2rem' }}>🗺️</span>
            <p style={{ margin: 0, fontWeight: 600 }}>Map unavailable</p>
          </div>
        )}
      </div>

      {/* Ticket Details Container in normal layout flow */}
      <div style={{ 
        flex: 1,
        background: 'var(--bg-card)', 
        borderTopLeftRadius: '30px', 
        borderTopRightRadius: '30px', 
        padding: '2rem 1.5rem', 
        marginTop: '-25px', // overlapping effect over the map
        boxShadow: '0 -10px 30px rgba(0,0,0,0.08)',
        zIndex: 100,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontWeight: 800 }}>
              {ticketStatus === 'PENDING' ? t('finding_driver') : 
               ticketStatus === 'CONFIRMED' ? t('ride_confirmed') : 
               ticketStatus === 'ARRIVED' ? t('driver_arrived') :
               ticketStatus === 'IN_PROGRESS' ? t('ride_in_progress') :
               ticketStatus === 'COMPLETED' ? t('ride_completed') : t('ride_cancelled')}
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {ticketStatus === 'PENDING' ? t('finding_driver_sub') : 
               ticketStatus === 'CONFIRMED' ? t('show_qr_to_driver') : 
               ticketStatus === 'ARRIVED' ? t('driver_arrived_sub') :
               ticketStatus === 'IN_PROGRESS' ? t('way_to_destination') :
               ticketStatus === 'COMPLETED' ? t('thanks_riding') : 
               t('booking_cancelled_sub')}
            </p>
          </div>
          <div style={{ 
            background: ticketStatus === 'PENDING' ? '#f59e0b' : 
                        ticketStatus === 'CONFIRMED' ? '#22c55e' : 
                        ticketStatus === 'ARRIVED' ? '#8b5cf6' :
                        ticketStatus === 'IN_PROGRESS' ? '#3b82f6' :
                        ticketStatus === 'COMPLETED' ? '#10b981' : '#ef4444', 
            color: 'white', 
            padding: '6px 14px', 
            borderRadius: '20px', 
            fontSize: '0.75rem', 
            fontWeight: 800 
          }}>
            {ticketStatus === 'PENDING' ? t('pending') || 'PENDING' : 
             ticketStatus === 'CONFIRMED' ? t('confirmed') || 'CONFIRMED' : 
             ticketStatus === 'ARRIVED' ? t('arrived') || 'ARRIVED' :
             ticketStatus === 'IN_PROGRESS' ? t('in_progress') || 'IN_PROGRESS' :
             ticketStatus === 'COMPLETED' ? t('completed') || 'COMPLETED' : t('cancelled') || 'CANCELLED'}
          </div>
        </div>

        {/* Real-time trip stats */}
        {(ticketStatus !== 'CANCELLED' && ticketStatus !== 'COMPLETED') && (
          <div style={{
            background: 'rgba(255, 107, 0, 0.04)',
            border: '1.5px solid rgba(255, 107, 0, 0.12)',
            borderRadius: '20px',
            padding: '1.2rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            boxShadow: '0 4px 15px rgba(255, 107, 0, 0.02)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {ticketStatus === 'IN_PROGRESS' ? t('time_to_destination') : t('driver_arrival_time')}
              </span>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={20} />
                {(() => {
                  if (ticketStatus === 'PENDING') {
                    return `${Math.round(dropoffRouteInfo.duration || (bookingData.distance_km * 2.5 + 5))} mins`;
                  }
                  if (ticketStatus === 'IN_PROGRESS') {
                    return `${Math.round(dropoffRouteInfo.duration || 5)} mins`;
                  }
                  const mins = Math.round(pickupRouteInfo.duration);
                  return mins <= 1 ? 'Arriving Now' : `${mins} mins`;
                })()}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid rgba(0,0,0,0.06)', paddingLeft: '1rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('estimated_dropoff')}
              </span>
              <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Navigation size={20} style={{ transform: 'rotate(45deg)' }} />
                {(() => {
                  const now = new Date(currentTime);
                  let totalDurationMins = 0;
                  if (ticketStatus === 'PENDING') {
                    totalDurationMins = Math.round(dropoffRouteInfo.duration || (bookingData.distance_km * 2.5 + 5));
                  } else if (ticketStatus === 'IN_PROGRESS') {
                    totalDurationMins = Math.round(dropoffRouteInfo.duration || 5);
                  } else {
                    totalDurationMins = Math.round(pickupRouteInfo.duration) + Math.round(dropoffRouteInfo.duration);
                  }
                  now.setMinutes(now.getMinutes() + totalDurationMins);
                  return now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                })()}
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '16px', border: '1px solid var(--border-light)', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <QRCode value={bookingData.qr_code_hash} size={100} style={{ opacity: (ticketStatus === 'CANCELLED' || ticketStatus === 'COMPLETED') ? 0.2 : 1 }} />
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('ticket_id')}</p>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{bookingData.qr_code_hash ? bookingData.qr_code_hash.split('-')[2] || bookingData.qr_code_hash.substring(0, 8).toUpperCase() : 'N/A'}</h4>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('seats_booked')}</p>
              <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>{bookingData.seat_count}</h4>
            </div>
            {bookingData.seat_numbers?.luggage_weight > 0 && (
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('luggage_weight_label')}</p>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {bookingData.seat_numbers.luggage_weight} kg (₹{bookingData.seat_numbers.luggage_price})
                </h4>
              </div>
            )}
          </div>
        </div>

        {!(ticketStatus === 'CANCELLED' || ticketStatus === 'COMPLETED' || ticketStatus === 'IN_PROGRESS') && (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              onClick={handleCancel}
              style={{ 
                flex: 1, 
                background: 'rgba(239, 68, 68, 0.08)', 
                color: '#ef4444', 
                border: 'none', 
                padding: '1rem', 
                borderRadius: '14px', 
                fontWeight: 700, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <XCircle size={18} /> {t('cancel_ride')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RideTicket;

