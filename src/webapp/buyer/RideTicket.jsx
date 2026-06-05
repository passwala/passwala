import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import QRCode from 'react-qr-code';
import { ArrowLeft, MapPin, Navigation, Share2, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const RideTicket = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { booking, vehicle } = location.state || {};
  const [driverLoc, setDriverLoc] = useState(vehicle ? [vehicle.current_lat || 23.0225, vehicle.current_lng || 72.5714] : [23.0225, 72.5714]);
  const [ticketStatus, setTicketStatus] = useState(booking?.status || 'CONFIRMED');

  useEffect(() => {
    if (!booking) return;

    // Simulate driver moving towards pickup
    const interval = setInterval(() => {
      setDriverLoc(prev => {
        const newLat = prev[0] + (booking.pickup_lat - prev[0]) * 0.1;
        const newLng = prev[1] + (booking.pickup_lng - prev[1]) * 0.1;
        return [newLat, newLng];
      });
    }, 3000);

    return () => clearInterval(interval);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-main)' }}>
      <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ArrowLeft /></button>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Digital Ticket</h2>
        </div>
        <Share2 size={20} color="var(--primary)" />
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {booking.pickup_lat && booking.pickup_lng && booking.drop_lat && booking.drop_lng ? (
          <MapContainer center={driverLoc} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            <Marker position={[parseFloat(booking.pickup_lat), parseFloat(booking.pickup_lng)]}><Popup>Pickup</Popup></Marker>
            <Marker position={[parseFloat(booking.drop_lat), parseFloat(booking.drop_lng)]}><Popup>Dropoff</Popup></Marker>
            
            <Marker position={driverLoc}>
              <Popup>Vehicle Live Location</Popup>
            </Marker>

            <Polyline 
              positions={[
                driverLoc,
                [parseFloat(booking.pickup_lat), parseFloat(booking.pickup_lng)]
              ]} 
              color="#3b82f6" 
              weight={4}
              dashArray="5, 10"
            />
          </MapContainer>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '2rem' }}>🗺️</span>
            <p style={{ margin: 0, fontWeight: 600 }}>Map unavailable</p>
          </div>
        )}
      </div>

      <div style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        background: 'white', 
        borderTopLeftRadius: '30px', 
        borderTopRightRadius: '30px', 
        padding: '2rem', 
        boxShadow: '0 -10px 30px rgba(0,0,0,0.1)',
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem 0', fontWeight: 800 }}>Ride Confirmed</h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Show this QR code to the driver</p>
          </div>
          <div style={{ 
            background: ticketStatus === 'CONFIRMED' ? '#22c55e' : '#ef4444', 
            color: 'white', 
            padding: '4px 12px', 
            borderRadius: '20px', 
            fontSize: '0.75rem', 
            fontWeight: 800 
          }}>
            {ticketStatus}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div style={{ background: 'white', padding: '10px', borderRadius: '16px', border: '1px solid var(--border-light)', display: 'inline-block' }}>
            <QRCode value={booking.qr_code_hash} size={100} style={{ opacity: ticketStatus === 'CANCELLED' ? 0.2 : 1 }} />
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ticket ID</p>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>{booking.qr_code_hash ? booking.qr_code_hash.split('-')[2] || booking.qr_code_hash.substring(0, 8).toUpperCase() : 'N/A'}</h4>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Seats Booked</p>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>{booking.seat_count}</h4>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
          <button 
            disabled={ticketStatus === 'CANCELLED'}
            onClick={handleCancel}
            style={{ 
              flex: 1, 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              border: 'none', 
              padding: '1rem', 
              borderRadius: '14px', 
              fontWeight: 700, 
              cursor: ticketStatus === 'CANCELLED' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: ticketStatus === 'CANCELLED' ? 0.5 : 1
            }}
          >
            <XCircle size={18} /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RideTicket;
