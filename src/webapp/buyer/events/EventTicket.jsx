import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCode } from 'react-qr-code';
import { ArrowLeft, Download, XCircle, Calendar, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';

const EventTicket = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { booking, event, tier } = location.state || {};
  const [ticketStatus, setTicketStatus] = useState(booking?.status || 'CONFIRMED');

  if (!booking || !event) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>No ticket found.</p>
        <button onClick={() => navigate('/events')}>Browse Events</button>
      </div>
    );
  }

  const handleCancel = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/events/cancel`, {
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

  const handleDownloadInvoice = () => {
    // In a real scenario, this would generate a PDF using jspdf or fetch from backend
    toast.success(`Downloading Invoice: ${booking.invoice_number}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: '2rem' }}>
      <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Your Ticket</h2>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <div style={{ 
          background: 'white', 
          width: '100%', 
          maxWidth: '400px', 
          borderRadius: '24px', 
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Top Banner section */}
          <div style={{ position: 'relative', height: '160px' }}>
            <img src={event.banner_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80'} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.8) 100%)' }}></div>
            <div style={{ position: 'absolute', bottom: '15px', left: '15px', right: '15px' }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: 900 }}>{event.title}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                 <span style={{ color: 'white', fontSize: '0.8rem', background: 'var(--primary)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                   {tier?.tier_name || 'Standard'}
                 </span>
                 <span style={{ color: '#e5e7eb', fontSize: '0.8rem' }}>{booking.ticket_count} Admit</span>
              </div>
            </div>
          </div>

          {/* Ticket Info */}
          <div style={{ padding: '1.5rem', background: 'white', borderBottom: '2px dashed var(--border-light)', position: 'relative' }}>
             {/* Cutouts for ticket effect */}
             <div style={{ position: 'absolute', bottom: '-15px', left: '-15px', width: '30px', height: '30px', background: 'var(--bg-main)', borderRadius: '50%' }}></div>
             <div style={{ position: 'absolute', bottom: '-15px', right: '-15px', width: '30px', height: '30px', background: 'var(--bg-main)', borderRadius: '50%' }}></div>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <div style={{ display: 'flex', gap: '10px' }}>
                 <Calendar size={18} color="var(--primary)" />
                 <div>
                   <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date & Time</p>
                   <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>{new Date(event.event_date).toLocaleString('en-IN')}</p>
                 </div>
               </div>
               <div style={{ display: 'flex', gap: '10px' }}>
                 <MapPin size={18} color="var(--primary)" />
                 <div>
                   <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Venue</p>
                   <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>{event.venue_name}</p>
                 </div>
               </div>
             </div>
          </div>

          {/* QR Code Section */}
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fafafa' }}>
            <div style={{ 
              background: 'white', 
              padding: '15px', 
              borderRadius: '16px', 
              boxShadow: 'var(--shadow-sm)',
              opacity: ticketStatus === 'CANCELLED' ? 0.3 : 1
            }}>
              <QRCode value={booking.qr_code_hash} size={150} />
            </div>
            
            <p style={{ margin: '15px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '2px' }}>
              {booking.qr_code_hash.split('-')[2]}
            </p>

            <div style={{ 
              marginTop: '15px',
              background: ticketStatus === 'CONFIRMED' ? '#22c55e' : '#ef4444', 
              color: 'white', 
              padding: '6px 20px', 
              borderRadius: '20px', 
              fontSize: '0.85rem', 
              fontWeight: 800 
            }}>
              {ticketStatus}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '400px', marginTop: '2rem' }}>
          <button 
            onClick={handleDownloadInvoice}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'white', border: '1px solid var(--border-light)', padding: '1rem', borderRadius: '14px', fontWeight: 700, cursor: 'pointer', color: 'var(--secondary)' }}
          >
            <Download size={18} /> Invoice
          </button>
          <button 
            disabled={ticketStatus === 'CANCELLED'}
            onClick={handleCancel}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', padding: '1rem', borderRadius: '14px', fontWeight: 700, cursor: ticketStatus === 'CANCELLED' ? 'not-allowed' : 'pointer', color: '#ef4444', opacity: ticketStatus === 'CANCELLED' ? 0.5 : 1 }}
          >
            <XCircle size={18} /> Cancel
          </button>
        </div>

      </div>
    </div>
  );
};

export default EventTicket;
