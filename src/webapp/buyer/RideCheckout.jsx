import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, MapPin, CheckCircle, ShieldCheck, CreditCard, Ticket, Navigation, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './RideCheckout.css';

const RideCheckout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { pickup, dropoff, rideData, user } = location.state || {};
  const [seatCount, setSeatCount] = useState(1);
  const [luggageWeight, setLuggageWeight] = useState(0); // default weight in kg
  const [bookingLoading, setBookingLoading] = useState(false);

  if (!pickup || !dropoff || !rideData) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>No ride data found. Please go back and search again.</p>
        <button 
          onClick={() => navigate('/city-ride')} 
          style={{ 
            background: 'var(--primary)', 
            color: 'white', 
            border: 'none', 
            padding: '0.75rem 1.5rem', 
            borderRadius: '12px', 
            fontWeight: 700, 
            cursor: 'pointer' 
          }}
        >
          Back to Search
        </button>
      </div>
    );
  }

  const selectedVehicle = rideData.vehicles && rideData.vehicles[0] ? {
    ...rideData.vehicles[0],
    vehicle_type: 'Bike',
    available_seats: 1,
    total_seats: 1
  } : {
    id: 'default-bike',
    vehicle_type: 'Bike',
    available_seats: 1,
    total_seats: 1
  };

  // Calculate distance using Latitude & Longitude coordinates
  const getCoordinateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const distance = getCoordinateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
  const displayDistance = parseFloat(distance.toFixed(2));

  const pricePerSeat = rideData.estimatedPrice;
  const basePrice = pricePerSeat * seatCount;
  
  // Luggage Fare calculation: weight (kg) * distance (km) * 11 (rate per kg per km)
  const LUGGAGE_RATE_PER_KG_KM = 11;
  const luggagePrice = luggageWeight > 0 ? Number((luggageWeight * displayDistance * LUGGAGE_RATE_PER_KG_KM).toFixed(2)) : 0;

  const fareBeforeTax = basePrice + luggagePrice;

  // Indian GST Tax Calculation (5% total: 2.5% CGST + 2.5% SGST)
  const CGST_RATE = 0.025; // 2.5%
  const SGST_RATE = 0.025; // 2.5%
  const cgstAmount = Number((fareBeforeTax * CGST_RATE).toFixed(2));
  const sgstAmount = Number((fareBeforeTax * SGST_RATE).toFixed(2));
  const totalTax = Number((cgstAmount + sgstAmount).toFixed(2));
  const totalPrice = Number((fareBeforeTax + totalTax).toFixed(2));

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
          userId: user.id || user.uid,
          vehicleId: selectedVehicle.id,
          pickupLat: pickup.lat,
          pickupLng: pickup.lng,
          dropLat: dropoff.lat,
          dropLng: dropoff.lng,
          pickupArea: pickup.name,
          dropArea: dropoff.name,
          seatCount,
          totalPrice,
          luggageWeight,
          luggagePrice
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
    <div className="ride-checkout-container">
      <div className="rc-header">
        <h2>Confirm Ride</h2>
      </div>

      <div className="rc-body">
        {/* Route Details Card */}
        <div className="rc-card">
          <div className="rc-route-header">
            <span className="rc-route-title">Route Details</span>
            <span className="rc-route-badge">
              <Navigation size={12} style={{ transform: 'rotate(45deg)' }} /> {rideData.distanceKm} km
            </span>
          </div>
          
          <div className="rc-route-timeline">
            <div className="rc-timeline-visual">
              <div className="rc-timeline-dot-start"></div>
              <div className="rc-timeline-line"></div>
              <div className="rc-timeline-dot-end"></div>
            </div>
            <div className="rc-route-locations">
              <div className="rc-location-item">
                <p>Pickup Location</p>
                <h4>{pickup.name}</h4>
              </div>
              <div className="rc-location-item">
                <p>Drop-off Location</p>
                <h4>{dropoff.name}</h4>
              </div>
            </div>
          </div>
        </div>



        {/* Luggage Details Card */}
        <div className="rc-card">
          <h4 className="rc-section-title">
            <Package size={18} color="var(--primary)" /> Luggage Details
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Luggage Rate: <strong style={{ color: 'var(--primary)' }}>₹11 per kg per km</strong>
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '0.25rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Weight:</label>
              <input 
                type="number" 
                min="0" 
                max="50" 
                step="0.1"
                value={luggageWeight} 
                onChange={(e) => setLuggageWeight(Math.max(0, parseFloat(e.target.value) || 0))}
                style={{ 
                  width: '80px', 
                  padding: '6px 10px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-light, #e2e8f0)', 
                  fontWeight: 700,
                  fontSize: '1rem',
                  textAlign: 'center'
                }} 
              />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>kg</span>
              <input 
                type="range" 
                min="0" 
                max="50" 
                step="0.1"
                value={luggageWeight} 
                onChange={(e) => setLuggageWeight(parseFloat(e.target.value) || 0)}
                style={{ flex: 1, accentColor: 'var(--primary, #ff7622)', height: '6px', cursor: 'pointer' }}
              />
            </div>
            {luggageWeight > 0 && (
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700 }}>
                Luggage price is calculated using exact Latitude & Longitude coordinate distance ({displayDistance} km):<br/>
                ₹11 × {luggageWeight} kg × {displayDistance} km = ₹{luggagePrice.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* Fare Summary Card */}
        <div className="rc-card">
          <h4 className="rc-section-title">
            <CreditCard size={18} color="var(--primary)" /> Fare Summary
          </h4>
          <div className="rc-fare-summary">
            <div className="rc-fare-row">
              <span className="rc-fare-label">Base Seat Fare (₹{pricePerSeat} x {seatCount})</span>
              <span className="rc-fare-value">₹{basePrice.toFixed(2)}</span>
            </div>
            {luggageWeight > 0 && (
              <div className="rc-fare-row">
                <span className="rc-fare-label">Luggage Fee (₹11 × {luggageWeight} kg × {displayDistance} km)</span>
                <span className="rc-fare-value">₹{luggagePrice.toFixed(2)}</span>
              </div>
            )}
            <div className="rc-fare-row">
              <span className="rc-fare-label">CGST (2.5%)</span>
              <span className="rc-fare-value">₹{cgstAmount.toFixed(2)}</span>
            </div>
            <div className="rc-fare-row">
              <span className="rc-fare-label">SGST (2.5%)</span>
              <span className="rc-fare-value">₹{sgstAmount.toFixed(2)}</span>
            </div>
            <hr className="rc-divider" />
            <div className="rc-total-row">
              <span className="rc-total-label">Total Amount</span>
              <span className="rc-total-value">₹{totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="rc-bottom-bar">
        <div className="rc-payable-info">
          <p className="rc-payable-label">Total Payable</p>
          <h3 className="rc-payable-value">₹{totalPrice.toFixed(2)}</h3>
        </div>
        <button 
          onClick={handleBookTicket}
          disabled={bookingLoading}
          className="rc-book-btn rc-pulse"
        >
          {bookingLoading ? 'Booking...' : 'Book Ride'}
        </button>
      </div>
    </div>
  );
};

export default RideCheckout;
