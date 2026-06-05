import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, MapPin, CheckCircle, ShieldCheck, CreditCard, Ticket } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './RideCheckout.css';

const RideCheckout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { pickup, dropoff, rideData, user } = location.state || {};
  const [seatCount, setSeatCount] = useState(1);
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

  const selectedVehicle = rideData.vehicles[0]; // Auto select first available for now
  const pricePerSeat = rideData.estimatedPrice;
  const basePrice = pricePerSeat * seatCount;

  // Indian GST Tax Calculation (5% total: 2.5% CGST + 2.5% SGST)
  const CGST_RATE = 0.025; // 2.5%
  const SGST_RATE = 0.025; // 2.5%
  const cgstAmount = Number((basePrice * CGST_RATE).toFixed(2));
  const sgstAmount = Number((basePrice * SGST_RATE).toFixed(2));
  const totalTax = Number((cgstAmount + sgstAmount).toFixed(2));
  const totalPrice = Number((basePrice + totalTax).toFixed(2));

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
    <div className="ride-checkout-container">
      <div className="rc-header">
        <button onClick={() => navigate(-1)} className="rc-back-btn">
          <ArrowLeft size={20} />
        </button>
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

        {/* Seat Selector Card */}
        <div className="rc-card">
          <h4 className="rc-section-title">
            <Ticket size={18} color="var(--primary)" /> Select Seats
          </h4>
          <div className="rc-seat-selector">
            <span className="rc-passenger-label">Passengers</span>
            <div className="rc-counter-group">
              <button 
                onClick={() => setSeatCount(Math.max(1, seatCount - 1))}
                className="rc-counter-btn"
                disabled={seatCount <= 1}
              >
                -
              </button>
              <span className="rc-counter-value">{seatCount}</span>
              <button 
                onClick={() => setSeatCount(Math.min(selectedVehicle.available_seats, seatCount + 1))}
                className="rc-counter-btn"
                disabled={seatCount >= selectedVehicle.available_seats}
              >
                +
              </button>
            </div>
          </div>
          <p className="rc-seats-availability">
            <ShieldCheck size={14} color="var(--primary)" />
            {selectedVehicle.available_seats} seats currently available in {selectedVehicle.vehicle_type}
          </p>
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
          {bookingLoading ? 'Booking...' : 'Book Ticket'}
        </button>
      </div>
    </div>
  );
};

export default RideCheckout;
