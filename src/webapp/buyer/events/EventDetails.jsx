import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Share2, Clock, Map as MapIcon } from 'lucide-react';
import GoogleMapWrapper from '../../../utils/GoogleMapWrapper';
import { toast } from 'react-hot-toast';
import './EventDetails.css';
import { AHMEDABAD_AREAS } from '../../../utils/constants';

const EventDetails = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [venueCoords, setVenueCoords] = useState(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${baseUrl}/api/events/${id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setEvent(data.event);
      } catch (err) {
        toast.error('Failed to load event details');
        navigate('/events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id, navigate]);

  useEffect(() => {
    if (!event) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const eventTime = new Date(event.event_date).getTime();
      const distance = eventTime - now;

      if (distance < 0) {
        setTimeLeft('Event Started');
        clearInterval(interval);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [event]);

  useEffect(() => {
    if (event?.venue_lat && event?.venue_lng && !isNaN(parseFloat(event.venue_lat)) && !isNaN(parseFloat(event.venue_lng))) {
      setVenueCoords({ lat: parseFloat(event.venue_lat), lng: parseFloat(event.venue_lng) });
    } else if (event?.venue_name) {
      const lowerVenue = event.venue_name.toLowerCase();
      const matchedArea = AHMEDABAD_AREAS.find(area => {
        const nameMatch = area.name.toLowerCase() === lowerVenue || lowerVenue.includes(area.name.toLowerCase());
        const aliasMatch = area.aliases?.some(alias => alias.toLowerCase() === lowerVenue || lowerVenue.includes(alias.toLowerCase()));
        return nameMatch || aliasMatch;
      });

      if (matchedArea) {
        setVenueCoords({ lat: matchedArea.lat, lng: matchedArea.lng });
      } else {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(event.venue_name + ', Ahmedabad')}&limit=1`,
          { headers: { 'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)' } })
        .then(r => r.json())
        .then(d => {
          if (d && d[0]) {
            setVenueCoords({ lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) });
          }
        })
        .catch(err => console.warn('Event venue geocoding error:', err));
      }
    }
  }, [event]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!event) return null;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          url: window.location.href
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          toast.error('Sharing failed');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Event link copied to clipboard!');
      } catch (err) {
        toast.error('Failed to copy event link to clipboard');
      }
    }
  };

  return (
    <div className="ed-container">
      <div className="ed-hero">
        <button className="ed-share-btn" onClick={handleShare}>
          <Share2 size={20} />
        </button>
        <img src={event.banner_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80'} alt={event.title} className="ed-hero-img" />
        <div className="ed-hero-overlay"></div>
        {event.status === 'SOLD_OUT' && <div className="ed-hero-soldout">SOLD OUT</div>}
      </div>

      <div className="ed-content">
        <div className="ed-title-section">
          <div className="ed-category">{event.category}</div>
          <h1>{event.title}</h1>
          <p className="ed-desc">{event.description}</p>
        </div>

        <div className="ed-info-grid">
          <div className="ed-info-card">
            <Calendar className="text-primary" />
            <div>
              <p className="label">Date & Time</p>
              <p className="value">
                {new Date(event.event_date).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
          <div className="ed-info-card">
            <Clock className="text-primary" />
            <div>
              <p className="label">Starts In</p>
              <p className="value font-mono">{timeLeft || 'Calculating...'}</p>
            </div>
          </div>
          <div className="ed-info-card full-width">
            <MapPin className="text-primary" />
            <div>
              <p className="label">Venue</p>
              <p className="value">{event.venue_name}, Ahmedabad</p>
            </div>
          </div>
        </div>

        <div className="ed-section">
          <h3>Ticket Tiers</h3>
          <div className="ed-tiers-list">
            {event.event_ticket_tiers?.map(tier => (
              <div key={tier.id} className="ed-tier-card">
                <div className="ed-tier-info">
                  <h4>{tier.tier_name}</h4>
                  <p className={tier.available_seats < 10 ? 'text-red-500 font-bold' : 'text-gray-500'}>
                    {tier.available_seats === 0 ? 'Sold Out' : `${tier.available_seats} seats left`}
                  </p>
                </div>
                <div className="ed-tier-price">
                  ₹{tier.price}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ed-section">
          <h3><MapIcon size={18} className="inline mr-2" /> Venue Map</h3>
          <div className="ed-map-container">
            {venueCoords ? (
              <GoogleMapWrapper
                center={[venueCoords.lat, venueCoords.lng]}
                zoom={15}
                markers={[{
                  position: [venueCoords.lat, venueCoords.lng],
                  title: event.venue_name
                }]}
                style={{ height: '100%', width: '100%', borderRadius: '16px' }}
              />
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '16px', color: '#64748b' }}>
                <MapPin size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
                <p style={{ margin: 0, fontWeight: 600 }}>{event.venue_name || 'Venue location not available'}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="ed-bottom-bar">
        <button 
          className="ed-book-btn"
          disabled={event.status === 'SOLD_OUT'}
          onClick={() => {
            if (!user) {
              toast.error('Please login to book tickets');
              navigate('/auth');
              return;
            }
            navigate('/events/checkout', { state: { event, user } });
          }}
        >
          {event.status === 'SOLD_OUT' ? 'Sold Out' : 'Select Tickets'}
        </button>
      </div>
    </div>
  );
};

export default EventDetails;
