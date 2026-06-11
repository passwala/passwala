import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Receipt } from 'lucide-react';
import { toast } from 'react-hot-toast';

const EventCheckout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { event, user } = location.state || {};

  const [selectedTierId, setSelectedTierId] = useState(
    event?.event_ticket_tiers?.length > 0 ? event.event_ticket_tiers[0].id : null
  );
  const [ticketCount, setTicketCount] = useState(1);
  const [loading, setLoading] = useState(false);

  if (!event || !user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Invalid checkout state.</p>
        <button onClick={() => navigate('/events')}>Back to Events</button>
      </div>
    );
  }

  const selectedTier = event.event_ticket_tiers?.find(t => t.id === selectedTierId);
  const baseAmount = (selectedTier?.price || 0) * ticketCount;
  
  // Gujarat GST calculation
  const cgstAmount = Number((baseAmount * 0.09).toFixed(2));
  const sgstAmount = Number((baseAmount * 0.09).toFixed(2));
  const totalAmount = baseAmount + cgstAmount + sgstAmount;

  const handleBookTicket = async () => {
    if (!selectedTier) return;
    
    if (ticketCount > selectedTier.available_seats) {
      toast.error(`Only ${selectedTier.available_seats} seats available in this tier.`);
      return;
    }

    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/events/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          eventId: event.id,
          tierId: selectedTier.id,
          ticketCount
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success('Event Tickets Booked Successfully!');
      navigate('/events/ticket', { state: { booking: data.booking, event, tier: selectedTier } });
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error booking tickets');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg-surface)', minHeight: '100vh', paddingBottom: '100px' }}>
      <div style={{ background: 'white', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Confirm Booking</h2>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Event Summary */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, color: 'var(--secondary)' }}>{event.title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
            <Calendar size={16} /> {new Date(event.event_date).toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <MapPin size={16} /> {event.venue_name}
          </div>
        </div>

        {/* Tier Selection */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>Select Category</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {event.event_ticket_tiers?.map(tier => (
              <div 
                key={tier.id}
                onClick={() => setSelectedTierId(tier.id)}
                style={{
                  border: `2px solid ${selectedTierId === tier.id ? 'var(--primary)' : 'var(--border-light)'}`,
                  background: selectedTierId === tier.id ? 'var(--primary-light)' : 'transparent',
                  borderRadius: '12px',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 4px 0', color: selectedTierId === tier.id ? 'var(--primary)' : 'var(--secondary)' }}>
                    {tier.tier_name}
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: tier.available_seats < 10 ? 'red' : 'var(--text-muted)' }}>
                    {tier.available_seats} seats left
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>₹{tier.price}</div>
              </div>
            ))}
          </div>

          {selectedTier && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>No. of Tickets</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'var(--bg-surface)', padding: '5px 15px', borderRadius: '20px' }}>
                <button 
                  onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                  style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--primary)' }}
                >-</button>
                <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{ticketCount}</span>
                <button 
                  onClick={() => setTicketCount(Math.min(selectedTier.available_seats, ticketCount + 1))}
                  style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--primary)' }}
                >+</button>
              </div>
            </div>
          )}
        </div>

        {/* Invoice Summary */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: 'var(--shadow-sm)' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={18} /> Tax Invoice Summary
          </h4>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Base Price ({ticketCount} x ₹{selectedTier?.price || 0})</span>
            <span style={{ fontWeight: 600 }}>₹{baseAmount}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>CGST (9%)</span>
            <span style={{ fontWeight: 600 }}>₹{cgstAmount}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>SGST (9%)</span>
            <span style={{ fontWeight: 600 }}>₹{sgstAmount}</span>
          </div>

          <hr style={{ border: 'none', borderTop: '1px dashed var(--border-light)', margin: '1rem 0' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Total Payable</span>
            <span style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--primary)' }}>₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>

      </div>

      {/* Fixed Bottom Bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', padding: '1rem 1.5rem', boxShadow: '0 -10px 20px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Amount</p>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>₹{totalAmount.toFixed(2)}</h3>
        </div>
        <button 
          onClick={handleBookTicket}
          disabled={loading || !selectedTier}
          style={{ 
            background: 'var(--primary)', 
            color: 'white', 
            border: 'none', 
            padding: '1rem 2rem', 
            borderRadius: '14px', 
            fontWeight: 800, 
            fontSize: '1rem', 
            cursor: loading ? 'not-allowed' : 'pointer', 
            opacity: loading ? 0.7 : 1,
            width: '50%' 
          }}
        >
          {loading ? 'Processing...' : 'Pay & Book'}
        </button>
      </div>
    </div>
  );
};

export default EventCheckout;
