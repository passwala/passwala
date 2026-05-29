import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, MapPin, CheckCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

const RideCheckout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { pickup, dropoff, rideData, user } = location.state || {};
  const [seatCount, setSeatCount] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);

  if (!pickup || !dropoff || !rideData) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>No ride data found. Please go back and search again.</p>
        <button onClick={() => navigate('/city-ride')}>Back to Search</button>
      </div>
    );
  }

  const selectedVehicle = rideData.vehicles[0]; // Auto select first available for now
  const pricePerSeat = rideData.estimatedPrice;
  const totalPrice = pricePerSeat * seatCount;

  const handleBookTicket = async () => {
    if (!user) {
      toast.error('Please login to book a ride');
      navigate('/auth');
      return;
    }

    if (seatCount > selectedVehicle.available_seats) {
      toast.error(`Only ${selectedVehicle.available_seats} seats available`);
      return;
    }

    setBookingLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/city-rides/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          vehicleId: selectedVehicle.id,
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          dropLat: dropoff.lat,
          dropLng: dropoff.lng,
          pickupArea: pickup.name,
          dropArea: dropoff.name,
          seatCount,
          totalPrice
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book ticket');
      }

      toast.success('Ticket Booked Successfully!');
      navigate('/ride-ticket', { state: { booking: data.booking, vehicle: selectedVehicle } });

    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error booking ride');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-surface)', minHeight: '100vh', paddingBottom: '100px' }}>
      <div style={{ background: 'white', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ArrowLeft /></button>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Confirm Ride</h2>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Route Details</span>
            <span style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>{rideData.distanceKm} km</span>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }}></div>
              <div style={{ width: 2, height: 30, background: 'var(--border-light)', margin: '4px 0' }}></div>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }}></div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pickup</p>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{pickup.name}</h4>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Drop-off</p>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{dropoff.name}</h4>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
           <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>Select Seats</h4>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
             <span style={{ fontSize: '1rem', fontWeight: 600 }}>Passengers</span>
             <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--bg-surface)', padding: '5px 15px', borderRadius: '20px' }}>
               <button 
                 onClick={() => setSeatCount(Math.max(1, seatCount - 1))}
                 style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--primary)' }}
               >-</button>
               <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{seatCount}</span>
               <button 
                 onClick={() => setSeatCount(Math.min(selectedVehicle.available_seats, seatCount + 1))}
                 style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--primary)' }}
               >+</button>
             </div>
           </div>
           <p style={{ margin: '1rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
             {selectedVehicle.available_seats} seats currently available in {selectedVehicle.vehicle_type}
           </p>
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>Fare Summary</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Seat Price</span>
            <span style={{ fontWeight: 600 }}>₹{pricePerSeat} x {seatCount}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Taxes & Fees</span>
            <span style={{ fontWeight: 600 }}>₹0</span>
          </div>
          <hr style={{ border: 'none', borderTop: '1px dashed var(--border-light)', margin: '1rem 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Total Amount</span>
            <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--primary)' }}>₹{totalPrice}</span>
          </div>
        </div>

      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', padding: '1rem 1.5rem', boxShadow: '0 -10px 20px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Payable</p>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>₹{totalPrice}</h3>
        </div>
        <button 
          onClick={handleBookTicket}
          disabled={bookingLoading}
          style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '1rem 2rem', borderRadius: '14px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', width: '50%' }}
        >
          {bookingLoading ? 'Booking...' : 'Book Ticket'}
        </button>
      </div>
    </div>
  );
};

export default RideCheckout;
