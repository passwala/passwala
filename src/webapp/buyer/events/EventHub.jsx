import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, MapPin, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './EventHub.css';

const CATEGORIES = [
  'All', 'Music Concerts', 'Comedy Shows', 'College Programs', 
  'School Functions', 'Business Seminars', 'Workshops', 
  'Live Shows', 'Sports Events', 'Festival Events'
];

const EventHub = ({ onBack }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${baseUrl}/api/events/search?category=${activeCategory}&query=${searchQuery}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setEvents(data.events || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Add debounce for search query
    const delayDebounceFn = setTimeout(() => {
      fetchEvents();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [activeCategory, searchQuery]);

  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
  };

  return (
    <div className="event-hub-container">
      <div className="eh-header">
        <h2>Ahmedabad Events</h2>
      </div>

      <div className="eh-search-container">
        <div className="eh-search-bar">
          <Search size={20} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search events, concerts, workshops..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="eh-categories-scroll">
        {CATEGORIES.map(cat => (
          <button 
            key={cat} 
            className={`eh-category-chip ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="eh-events-list">
        {loading ? (
          <div className="eh-loading">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="eh-empty-state">
            <Calendar size={48} className="text-gray-300 mb-4" />
            <p>No events found for this category or search.</p>
          </div>
        ) : (
          events.map(event => (
            <div key={event.id} className="eh-event-card" onClick={() => navigate(`/events/${event.id}`)}>
              <div className="eh-event-banner-container">
                <img src={event.banner_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80'} alt={event.title} className="eh-event-banner" />
                {event.status === 'SOLD_OUT' && (
                  <div className="eh-sold-out-badge">SOLD OUT</div>
                )}
                <div className="eh-category-badge">{event.category}</div>
              </div>
              
              <div className="eh-event-content">
                <h3 className="eh-event-title">{event.title}</h3>
                
                <div className="eh-event-meta">
                  <div className="eh-meta-item">
                    <Calendar size={16} />
                    <span>{formatDate(event.event_date)}</span>
                  </div>
                  <div className="eh-meta-item">
                    <MapPin size={16} />
                    <span className="truncate">{event.venue_name}</span>
                  </div>
                </div>

                <div className="eh-event-footer">
                  <div className="eh-price-start">
                    <span className="eh-price-label">Starts from</span>
                    <span className="eh-price-amount">
                      ₹{event.event_ticket_tiers?.length ? Math.min(...event.event_ticket_tiers.map(t => t.price)) : 0}
                    </span>
                  </div>
                  <button className="eh-book-btn">Book Now</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventHub;
