import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, History, Clock, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../supabase';
import './EventHub.css';

const CATEGORIES = [
  'All',
  'Music & Concerts',
  'Comedy & Theatre',
  'Workshops & Classes',
  'Parties & Nightlife',
  'Festivals & Fairs',
  'Sports & Fitness',
  'Corporate & Business',
];

const PAGE_SIZE = 12;
const BASE_URL = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80';

const EventHub = () => {
  const navigate = useNavigate();
  const [events, setEvents]             = useState([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery]   = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [timeFilter, setTimeFilter]     = useState('upcoming');
  const [page, setPage]                 = useState(1);
  const abortRef   = useRef(null);
  const refreshRef = useRef(null);

  // Debounce search input by 400ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [activeCategory, debouncedQuery, timeFilter]);

  // Fix #11: Pass page/pageSize to server — only fetch 12 events per request
  const fetchEvents = useCallback(async (silent = false) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        category: activeCategory,
        query: debouncedQuery,
        page: String(page),
        pageSize: String(PAGE_SIZE),
        ...(timeFilter === 'past' ? { filter: 'past' } : {})
      });
      const res = await fetch(`${BASE_URL}/api/events/search?${params}`, {
        signal: abortRef.current.signal
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvents(data.events || []);
      setTotal(data.total ?? 0);  // Fix #11: use server total for pagination
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(err);
      if (!silent) toast.error('Failed to load events');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeCategory, debouncedQuery, timeFilter, page]);

  // Fetch on filter or page change
  useEffect(() => { fetchEvents(false); }, [fetchEvents]);

  // Fix #14: Decouple Realtime channel from fetchEvents deps.
  const fetchEventsRef = useRef(fetchEvents);
  useEffect(() => { fetchEventsRef.current = fetchEvents; }, [fetchEvents]);

  // Realtime + 60s polling — stable channel lifecycle
  useEffect(() => {
    const channel = supabase
      .channel('event-hub-seats')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_ticket_tiers' }, () => fetchEventsRef.current(true))
      .subscribe();
    refreshRef.current = setInterval(() => fetchEventsRef.current(true), 60000);
    return () => { supabase.removeChannel(channel); clearInterval(refreshRef.current); };
  }, []); // empty deps: channel created once, never torn down on filter change



  // Fix #11: Pagination computed from server total, not client array length
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="eh-root">
      {/* ── Top Header ── */}
      <div className="eh-topbar">
        <h2 className="eh-heading">Events Near You</h2>
        <div className="eh-time-toggle">
          <button
            className={`eh-toggle-btn ${timeFilter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setTimeFilter('upcoming')}
          >
            <Calendar size={14} /> Upcoming
          </button>
          <button
            className={`eh-toggle-btn ${timeFilter === 'past' ? 'active-past' : ''}`}
            onClick={() => setTimeFilter('past')}
          >
            <History size={14} /> Past
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="eh-search-wrap">
        <div className="eh-search-bar">
          <Search size={18} className="eh-search-icon" />
          <input
            id="event-search-input"
            type="text"
            placeholder="Search events, concerts, workshops..."
            aria-label="Search events"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="eh-search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
      </div>

      {/* ── Category Chips ── */}
      <div className="eh-cats">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`eh-cat-chip ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Result count ── */}
      {!loading && total > 0 && (
        <p className="eh-result-count">
          {total} event{total !== 1 ? 's' : ''} found
          {activeCategory !== 'All' ? ` in "${activeCategory}"` : ''}
          {totalPages > 1 ? ` — page ${page} of ${totalPages}` : ''}
        </p>
      )}

      {/* ── Event Grid ── */}
      {loading ? (
        <div className="eh-loader">
          <div className="eh-spinner" />
          <p>Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="eh-empty">
          <Calendar size={52} color="#ffe4cc" />
          <p>No {timeFilter === 'past' ? 'past' : 'upcoming'} events found{activeCategory !== 'All' ? ` in "${activeCategory}"` : ''}.</p>
          {activeCategory !== 'All' && (
            <button className="eh-reset-btn" onClick={() => setActiveCategory('All')}>Show all events</button>
          )}
        </div>
      ) : (
        <>
          <div className="eh-grid">
            {events.map(event => {
              const tiers     = event.event_ticket_tiers || [];
              const minPrice  = tiers.length > 0 ? Math.min(...tiers.map(t => t.price)) : null;
              const totalSeats = tiers.reduce((s, t) => s + (t.available_seats || 0), 0);
              const totalCap   = tiers.reduce((s, t) => s + (t.total_seats || 0), 0);
              const pct        = totalCap > 0 ? (totalSeats / totalCap) * 100 : 100;
              const isSoldOut  = event.status === 'SOLD_OUT' || totalSeats === 0;
              // Filter out "Other Events" category label
              const categoryLabel = (event.category && event.category !== 'Other Events') ? event.category : null;

              return (
                <div
                  key={event.id}
                  className="eh-card"
                  onClick={() => navigate(`/events/${event.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/events/${event.id}`)}
                >
                  {/* Poster */}
                  <div className="eh-card-img-wrap">
                    {(() => {
                      let cardImg = event.banner_url || FALLBACK_IMG;
                      if (typeof cardImg === 'string' && cardImg.startsWith('[')) {
                        try {
                          const parsed = JSON.parse(cardImg);
                          if (Array.isArray(parsed) && parsed.length > 0) {
                            cardImg = parsed[0];
                          }
                        } catch (_) { /* ignore */ }
                      }
                      return (
                        <img
                          src={cardImg}
                          alt={event.title}
                          className="eh-card-img"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FALLBACK_IMG;
                          }}
                        />
                      );
                    })()}
                    <div className="eh-date-badge">
                      <span className="eh-date-day">{new Date(event.event_date).getDate()}</span>
                      <span className="eh-date-month">{new Date(event.event_date).toLocaleString('en-IN', { month: 'short' }).toUpperCase()}</span>
                    </div>
                    {isSoldOut && <div className="eh-soldout-ribbon">SOLD OUT</div>}
                    {timeFilter === 'past' && <div className="eh-past-badge"><Clock size={10} /> PAST</div>}
                  </div>

                  {/* Info */}
                  <div className="eh-card-info">
                    {categoryLabel && <span className="eh-card-category">{categoryLabel}</span>}
                    <h3 className="eh-card-title">{event.title}</h3>
                    <p className="eh-card-venue">
                      <MapPin size={12} style={{ marginRight: '4px', flexShrink: 0 }} />
                      <span>{event.venue_name}{event.city ? `, ${event.city}` : ''}</span>
                    </p>
                    
                    <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        {minPrice !== null ? (
                          <span className="eh-card-price">₹{minPrice}<span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginLeft: '2px' }}>onwards</span></span>
                        ) : (
                          <span className="eh-card-price" style={{ color: '#16a34a' }}>Free</span>
                        )}
                        
                        {!isSoldOut && totalCap > 0 && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: pct < 20 ? '#ef4444' : '#16a34a' }}>
                            {pct < 20 ? `Only ${totalSeats} left!` : `${totalSeats} available`}
                          </span>
                        )}
                      </div>
                      
                      {!isSoldOut && totalCap > 0 && (
                        <div className="eh-avail-bar">
                          <div
                            className="eh-avail-fill"
                            style={{ width: `${pct}%`, background: pct < 20 ? '#ef4444' : '#22c55e' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="eh-pagination">
              <button
                className="eh-page-btn"
                disabled={page === 1}
                onClick={() => {
                  setPage(p => p - 1);
                  // Fix #10: Use .webapp-main scroll container, not window (PWA/WebView)
                  document.querySelector('.webapp-main')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <div className="eh-page-nums">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    className={`eh-page-num ${n === page ? 'active' : ''}`}
                    onClick={() => {
                    setPage(n);
                    document.querySelector('.webapp-main')?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                className="eh-page-btn"
                disabled={page === totalPages}
                onClick={() => {
                  setPage(p => p + 1);
                  document.querySelector('.webapp-main')?.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EventHub;
