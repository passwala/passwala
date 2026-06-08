import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { QRCode } from 'react-qr-code';
import { ArrowLeft, MapPin, Navigation, Share2, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabase';

// Helper component to center and fit map bounds dynamically when driver location or booking changes
const RecenterMap = ({ driverLoc, booking }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    // Invalidate size on mount/update to ensure map renders fully in dynamic layouts
    map.invalidateSize();
    
    const points = [];
    if (driverLoc && !isNaN(driverLoc[0]) && !isNaN(driverLoc[1])) {
      points.push(driverLoc);
    }
    if (booking?.pickup_lat && booking?.pickup_lng) {
      points.push([parseFloat(booking.pickup_lat), parseFloat(booking.pickup_lng)]);
    }
    if (booking?.drop_lat && booking?.drop_lng) {
      points.push([parseFloat(booking.drop_lat), parseFloat(booking.drop_lng)]);
    }

    if (points.length > 0) {
      try {
        map.fitBounds(points, { padding: [50, 50], maxZoom: 15 });
      } catch (e) {
        console.warn("Failed to fit map bounds:", e);
      }
    }
  }, [driverLoc, booking, map]);

  return null;
};

const RideTicket = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { booking, vehicle } = location.state || {};
  const [driverLoc, setDriverLoc] = useState(vehicle ? [vehicle.current_lat || 23.0225, vehicle.current_lng || 72.5714] : [23.0225, 72.5714]);
  const [ticketStatus, setTicketStatus] = useState(booking?.status || 'CONFIRMED');
  const [osrmRouteToPickup, setOsrmRouteToPickup] = useState([]);
  const [osrmRouteToDropoff, setOsrmRouteToDropoff] = useState([]);

  useEffect(() => {
    if (!booking) return;

    const pollStatus = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${baseUrl}/api/city-rides/booking-status?bookingId=${booking.id}`);
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
      .channel(`booking-status-${booking.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'ticket_bookings',
        filter: `id=eq.${booking.id}`
      }, (payload) => {
        if (payload.new && payload.new.status) {
          setTicketStatus(prevStatus => {
            if (prevStatus !== 'COMPLETED' && payload.new.status === 'COMPLETED') {
              toast.success('Ride Completed Successfully! Returning Home...', { id: 'ride-complete-toast' });
              setTimeout(() => {
                navigate('/');
              }, 3000);
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
  }, [booking]);

  // Fetch OSRM route from driver to pickup
  useEffect(() => {
    if (!booking || !driverLoc) return;

    const fetchPickupRoute = async () => {
      try {
        const startLng = driverLoc[1];
        const startLat = driverLoc[0];
        const endLng = parseFloat(booking.pickup_lng);
        const endLat = parseFloat(booking.pickup_lat);
        
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
          }
        }
      } catch (e) {
        console.warn("Failed to fetch OSRM route to pickup:", e);
      }
    };

    fetchPickupRoute();
  }, [booking, driverLoc]);

  // Fetch OSRM route from pickup to dropoff
  useEffect(() => {
    if (!booking) return;

    const fetchDropoffRoute = async () => {
      try {
        const startLng = parseFloat(booking.pickup_lng);
        const startLat = parseFloat(booking.pickup_lat);
        const endLng = parseFloat(booking.drop_lng);
        const endLat = parseFloat(booking.drop_lat);

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
          }
        }
      } catch (e) {
        console.warn("Failed to fetch OSRM route to dropoff:", e);
      }
    };

    fetchDropoffRoute();
  }, [booking]);

  if (!booking) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>No ticket found.</p>
        <button onClick={() => navigate('/city-ride')}>Go to Booking</button>
      </div>
    );
  }

  const handleCancel = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/city-rides/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          userId: booking.user_id
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setTicketStatus('CANCELLED');
      toast.success('Ticket cancelled successfully');
    } catch (err) {
      toast.error(err.message || 'Error cancelling ticket');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-main)', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#0f172a' }}>
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>Digital Ticket</h2>
        </div>
        <Share2 size={20} color="var(--primary)" style={{ cursor: 'pointer' }} />
      </div>

      {/* Map Area - Fixed height to show route and driver clearly without overlap */}
      <div style={{ height: '40vh', width: '100%', position: 'relative', borderBottom: '1px solid #e2e8f0' }}>
        {booking.pickup_lat && booking.pickup_lng && booking.drop_lat && booking.drop_lng ? (
          <MapContainer center={driverLoc} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <RecenterMap driverLoc={driverLoc} booking={booking} />
            
            <Marker position={[parseFloat(booking.pickup_lat), parseFloat(booking.pickup_lng)]}><Popup>Pickup</Popup></Marker>
            <Marker position={[parseFloat(booking.drop_lat), parseFloat(booking.drop_lng)]}><Popup>Dropoff</Popup></Marker>
            
            <Marker position={driverLoc}>
              <Popup>Vehicle Live Location</Popup>
            </Marker>

            {osrmRouteToPickup && osrmRouteToPickup.length > 0 ? (
              <Polyline positions={osrmRouteToPickup} color="#3b82f6" weight={5} dashArray="5, 10" />
            ) : (
              <Polyline 
                positions={[
                  driverLoc,
                  [parseFloat(booking.pickup_lat), parseFloat(booking.pickup_lng)]
                ]} 
                color="#3b82f6" 
                weight={4}
                dashArray="5, 10"
              />
            )}

            {osrmRouteToDropoff && osrmRouteToDropoff.length > 0 ? (
              <Polyline positions={osrmRouteToDropoff} color="#10b981" weight={6} />
            ) : (
              <Polyline 
                positions={[
                  [parseFloat(booking.pickup_lat), parseFloat(booking.pickup_lng)],
                  [parseFloat(booking.drop_lat), parseFloat(booking.drop_lng)]
                ]} 
                color="#10b981" 
                weight={5}
              />
            )}
          </MapContainer>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '2rem' }}>🗺️</span>
            <p style={{ margin: 0, fontWeight: 600 }}>Map unavailable</p>
          </div>
        )}
      </div>

      {/* Ticket Details Container in normal layout flow */}
      <div style={{ 
        flex: 1,
        background: 'white', 
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
              {ticketStatus === 'CONFIRMED' ? 'Ride Confirmed' : ticketStatus === 'COMPLETED' ? 'Ride Completed' : 'Ride Cancelled'}
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {ticketStatus === 'CONFIRMED' ? 'Show this QR code to the driver' : ticketStatus === 'COMPLETED' ? 'Thank you for riding with Passwala!' : 'This booking has been cancelled'}
            </p>
          </div>
          <div style={{ 
            background: ticketStatus === 'CONFIRMED' ? '#22c55e' : ticketStatus === 'COMPLETED' ? '#3b82f6' : '#ef4444', 
            color: 'white', 
            padding: '6px 14px', 
            borderRadius: '20px', 
            fontSize: '0.75rem', 
            fontWeight: 800 
          }}>
            {ticketStatus}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ background: 'white', padding: '10px', borderRadius: '16px', border: '1px solid var(--border-light)', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <QRCode value={booking.qr_code_hash} size={100} style={{ opacity: (ticketStatus === 'CANCELLED' || ticketStatus === 'COMPLETED') ? 0.2 : 1 }} />
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ticket ID</p>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{booking.qr_code_hash ? booking.qr_code_hash.split('-')[2] || booking.qr_code_hash.substring(0, 8).toUpperCase() : 'N/A'}</h4>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Seats Booked</p>
              <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>{booking.seat_count}</h4>
            </div>
            {booking.seat_numbers?.luggage_weight > 0 && (
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Luggage Weight</p>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {booking.seat_numbers.luggage_weight} kg (₹{booking.seat_numbers.luggage_price})
                </h4>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button 
            disabled={ticketStatus === 'CANCELLED' || ticketStatus === 'COMPLETED'}
            onClick={handleCancel}
            style={{ 
              flex: 1, 
              background: (ticketStatus === 'CANCELLED' || ticketStatus === 'COMPLETED') ? '#cbd5e1' : 'rgba(239, 68, 68, 0.08)', 
              color: (ticketStatus === 'CANCELLED' || ticketStatus === 'COMPLETED') ? '#94a3b8' : '#ef4444', 
              border: 'none', 
              padding: '1rem', 
              borderRadius: '14px', 
              fontWeight: 700, 
              cursor: (ticketStatus === 'CANCELLED' || ticketStatus === 'COMPLETED') ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <XCircle size={18} /> Cancel Ride
          </button>
        </div>
      </div>
    </div>
  );
};

export default RideTicket;
