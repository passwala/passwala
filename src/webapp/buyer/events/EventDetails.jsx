import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Share2, Clock, Navigation, ChevronDown, ChevronUp, Globe, Users, Timer, Eye, ChevronRight, ChevronLeft, Ticket } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../supabase';
import { checkBookingWindow } from '../../../utils/checkBookingWindow';
import './EventDetails.css';


const EventDetails = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [similarEvents, setSimilarEvents] = useState([]);
  const [siblingSlots, setSiblingSlots] = useState([]);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const tiersRef = useRef(null);
  const similarRowRef = useRef(null);

  const baseUrl = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);

  const fetchEvent = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/api/events/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setEvent(data.event);

      // Fetch other slots of the same multiple show event
      if (data.event && (data.event.show_type === 'multiple' || data.event.show_type === 'festival' || data.event.show_type === 'tour')) {
        const { data: siblings } = await supabase
          .from('events')
          .select('id, event_date, venue_name')
          .eq('title', data.event.title)
          .eq('category', data.event.category)
          .eq('created_by', data.event.created_by)
          .neq('status', 'PENDING_APPROVAL')
          .neq('status', 'REJECTED')
          .order('event_date', { ascending: true });
        setSiblingSlots(siblings || []);
      } else {
        setSiblingSlots([]);
      }
      setActiveImgIndex(0);
    } catch (err) {
      if (!silent) { toast.error('Failed to load event details'); navigate('/events'); }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, baseUrl, navigate]);

  const fetchSimilar = useCallback(async (category) => {
    try {
      const { data } = await supabase
        .from('events')
        .select('id, title, banner_url, event_date, venue_name, event_ticket_tiers(price)')
        .eq('category', category)
        .neq('id', id)
        // Fix #7: removed 'PUBLISHED' — only valid statuses are UPCOMING/ONGOING/SOLD_OUT
        .in('status', ['UPCOMING', 'ONGOING', 'SOLD_OUT'])
        .limit(8);
      setSimilarEvents(data || []);
    } catch (_) { /* ignore */ }
  }, [id]);

  useEffect(() => { fetchEvent(false); }, [fetchEvent]);

  useEffect(() => {
    if (event?.category) fetchSimilar(event.category);
  }, [event?.category, fetchSimilar]);

  // Realtime seat count
  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel(`event-detail-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'event_ticket_tiers', filter: `event_id=eq.${id}` }, () => fetchEvent(true))
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [id, fetchEvent]);


  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: event.title, url: window.location.href }); }
      catch (err) { if (err.name !== 'AbortError') toast.error('Sharing failed'); }
    } else {
      try { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); }
      catch { toast.error('Failed to copy'); }
    }
  };

  if (loading) {
    return (
      <div className="ed-loading">
        <div className="ed-spinner" />
        <p>Loading event...</p>
      </div>
    );
  }
  if (!event) return null;

  const tiers = event.event_ticket_tiers || [];
  const eventDateObj = new Date(event.event_date);
  const hasEnded = event.event_date && eventDateObj < new Date();
  const anyTierOpen = !hasEnded && tiers.length > 0 && tiers.some(t => checkBookingWindow(t, event).open);
  const bookingNotOpenedYet = !anyTierOpen && !hasEnded && tiers.some(t => new Date(t.booking_open || event.booking_start) > new Date());
  const isSoldOut = event.status === 'SOLD_OUT';
  // Fix #9: isDisabled also covers events with no tiers (no tiers = can't book)
  const isDisabled = hasEnded || isSoldOut || !anyTierOpen || tiers.length === 0;
  const minPrice = tiers.length > 0 ? Math.min(...tiers.map(t => t.price)) : null;
  const totalSeats = tiers.reduce((s, t) => s + (t.available_seats || 0), 0);
  const description = event.description || '';
  const shortDesc = description.slice(0, 200);
  const formattedDate = eventDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formattedTime = eventDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Fix #23: Deduplicate tags — filter out any tag that exactly matches event.category
  // to prevent the category appearing twice (once in tags, once in guide section)
  const tags = event.tags
    ? (Array.isArray(event.tags) ? event.tags : event.tags.split(',').map(t => t.trim()))
    : (event.category ? [event.category] : []);
  const uniqueTags = [...new Set(tags)].filter(t => t && t !== 'Other Events');

  // Parse multiple banner images
  const bannerImages = (() => {
    if (!event?.banner_url) return ['https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80'];
    if (typeof event.banner_url === 'string' && event.banner_url.startsWith('[')) {
      try {
        const arr = JSON.parse(event.banner_url);
        if (Array.isArray(arr) && arr.length > 0) return arr;
      } catch (_) { /* ignore */ }
    }
    return [event.banner_url];
  })();

  return (
    <div className="ed2-root">
      {/* ── BANNER CAROUSEL ── */}
      <div className="ed2-banner" style={{ position: 'relative', overflow: 'hidden' }}>
        <img
          src={bannerImages[activeImgIndex]}
          alt={event.title}
          className="ed2-banner-img"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80';
          }}
        />
        {bannerImages.length > 1 && (
          <>
            <button className="carousel-control-btn prev" onClick={() => setActiveImgIndex(prev => (prev === 0 ? bannerImages.length - 1 : prev - 1))} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
              <ChevronLeft size={24} />
            </button>
            <button className="carousel-control-btn next" onClick={() => setActiveImgIndex(prev => (prev === bannerImages.length - 1 ? 0 : prev + 1))} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
              <ChevronRight size={24} />
            </button>
            <div className="carousel-indicators" style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 10 }}>
              {bannerImages.map((_, idx) => (
                <span key={idx} onClick={() => setActiveImgIndex(idx)} style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeImgIndex === idx ? '#ff6b00' : 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all 0.2s' }} />
              ))}
            </div>
          </>
        )}
        <div className="ed2-banner-overlay" />
        {event.status === 'SOLD_OUT' && <div className="ed2-soldout-badge">SOLD OUT</div>}
        <button className="ed2-share-btn" onClick={handleShare} title="Share">
          <Share2 size={18} />
        </button>
      </div>

      {/* ── TAG CHIPS ── */}
      {(() => {
        if (uniqueTags.length === 0 && !event.views) return null;
        return (
          <div className="ed2-tags-row">
            <div className="ed2-tags-inner">
              {uniqueTags.map((tag, i) => (
                <span key={i} className="ed2-tag">{tag}</span>
              ))}
              {event.views && (
                <span className="ed2-views"><Eye size={13} /> {event.views.toLocaleString('en-IN')} views</span>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── MAIN LAYOUT ── */}
      <div className="ed2-layout">
        {/* LEFT COLUMN */}
        <div className="ed2-main">

          {/* Sibling Slots (Dates/Times) for Multiple Shows */}
          {siblingSlots.length > 1 && (
            <section className="ed2-section" style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 800, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={18} /> Multiple Show Times / Dates Available
              </h3>
              <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#7c2d12' }}>Choose a different date/venue stop for this event:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {siblingSlots.map(slot => {
                  const isActive = slot.id === event.id;
                  const dateStr = new Date(slot.event_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => { if (!isActive) navigate(`/events/${slot.id}`); }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: isActive ? '2px solid #ff6b00' : '1px solid #e2e8f0',
                        background: isActive ? '#fff' : '#fafafa',
                        color: isActive ? '#ff6b00' : '#475569',
                        fontWeight: isActive ? 800 : 600,
                        textAlign: 'left',
                        cursor: isActive ? 'default' : 'pointer',
                        fontSize: '0.85rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>📅 {dateStr}</span>
                      <span style={{ fontSize: '0.78rem', opacity: 0.8 }}>📍 {slot.venue_name}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* About the Event */}
          <section className="ed2-section">
            <h2 className="ed2-section-title"><span className="ed2-title-bar" />About the Event</h2>
            {event.short_description && (
              <p className="ed2-short-desc">{event.short_description}</p>
            )}
            <p className="ed2-desc">
              {showFullDesc ? description : shortDesc}
              {description.length > 200 && (
                <>
                  {!showFullDesc && '...'}
                  <button className="ed2-show-more" onClick={() => setShowFullDesc(v => !v)}>
                    {showFullDesc ? ' Show less' : ' Show more'}
                  </button>
                </>
              )}
            </p>
          </section>

          {/* Event Guide */}
          <section className="ed2-section">
            <div className="ed2-section-header">
              <h2 className="ed2-section-title"><span className="ed2-title-bar" />Event Guide</h2>
            </div>
            {(() => {
              const displayDuration = (() => {
                if (event.duration) return event.duration;
                if (event.event_date && event.ends_at) {
                  const start = new Date(event.event_date);
                  const end = new Date(event.ends_at);
                  const diffMs = end.getTime() - start.getTime();
                  if (diffMs > 0) {
                    const diffHrs = diffMs / (1000 * 60 * 60);
                    if (diffHrs < 24) {
                      const hrs = Math.floor(diffHrs);
                      const mins = Math.round((diffHrs - hrs) * 60);
                      if (mins > 0) {
                        return `${hrs}h ${mins}m`;
                      }
                      return `${hrs} hrs`;
                    }
                    return 'Multi-day';
                  }
                }
                return '2-3 hrs';
              })();

              return (
                <div className="ed2-guide-grid">
                  <div className="ed2-guide-pill">
                    <Ticket size={22} className="ed2-guide-icon" />
                    <span className="ed2-guide-label">SHOW TYPE</span>
                    <span className="ed2-guide-value">
                      {(event.show_type === 'festival' || event.show_type === 'tour') ? 'Tour / Festival' : event.show_type === 'multiple' ? 'Multiple Shows' : 'Single Show'}
                    </span>
                  </div>
                  <div className="ed2-guide-pill">
                    <Globe size={22} className="ed2-guide-icon" />
                    <span className="ed2-guide-label">LANGUAGE</span>
                    <span className="ed2-guide-value">{event.language || 'Hindi / English'}</span>
                  </div>
                  <div className="ed2-guide-pill">
                    <Timer size={22} className="ed2-guide-icon" />
                    <span className="ed2-guide-label">DURATION</span>
                    <span className="ed2-guide-value">{displayDuration}</span>
                  </div>
                  <div className="ed2-guide-pill">
                    <Users size={22} className="ed2-guide-icon" />
                    <span className="ed2-guide-label">ENTRY</span>
                    <span className="ed2-guide-value">{event.age_restriction || 'All Ages'}</span>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* Ticket Tiers */}
          {tiers.length > 0 && (
            <section className="ed2-section" ref={tiersRef}>
              <h2 className="ed2-section-title"><span className="ed2-title-bar" />Ticket Tiers</h2>
              <div className="ed2-tiers-list">
                {tiers.map(tier => {
                  const wc = checkBookingWindow(tier, event);
                  return (
                    <div key={tier.id} className="ed2-tier-card">
                      <div>
                        <p className="ed2-tier-name">{tier.tier_name}</p>
                        <p className={`ed2-tier-seats ${tier.available_seats < 10 ? 'low' : ''}`}>
                          {tier.available_seats === 0 ? '🔴 Sold Out' : `${tier.available_seats} seats left`}
                        </p>
                        <span className={`ed2-window-badge ${wc.open ? 'open' : 'closed'}`}>
                          <Clock size={11} /> {wc.open ? 'Booking Open' : (wc.reason || 'Closed')}
                        </span>
                      </div>
                      <div className="ed2-tier-price">₹{tier.price}</div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Artist */}
          {event.artist_name && (
            <section className="ed2-section">
              <h2 className="ed2-section-title"><span className="ed2-title-bar" />🎵 Artist</h2>
              <div className="ed2-artists-row">
                <div className="ed2-artist-card">
                  <div className="ed2-artist-avatar">
                    {event.artist_image ? (
                      <img src={event.artist_image} alt={event.artist_name} />
                    ) : (
                      <span>{event.artist_name.charAt(0)}</span>
                    )}
                  </div>
                  <p className="ed2-artist-name">{event.artist_name}</p>
                </div>
              </div>
            </section>
          )}

          {/* Venue */}
          <section className="ed2-section">
            <h2 className="ed2-section-title"><span className="ed2-title-bar" />Venue</h2>
            <div className="ed2-venue-card">
              <div className="ed2-venue-info">
                <p className="ed2-venue-name">
                  <MapPin size={14} color="#5a4fcf" /> {event.venue_name || 'Venue TBA'}
                </p>
                {event.venue_address && (
                  <p className="ed2-venue-addr">{event.venue_address}</p>
                )}
              </div>
              {event.venue_name && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((event.venue_name || '') + ', ' + (event.city || 'Ahmedabad') + ', India')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="ed2-directions-btn"
                >
                  <Navigation size={13} /> Get Directions
                </a>
              )}
            </div>
            {event.venue_name && (
              <div className="ed2-map-wrapper">
                <iframe
                  title="Venue Map"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent((event.venue_name || '') + ', ' + (event.city || 'Ahmedabad') + ', India')}&output=embed&z=15`}
                  width="100%" height="240"
                  style={{ border: 'none', display: 'block' }}
                  loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen
                />
              </div>
            )}
          </section>

          {/* Terms & Conditions */}
          <section className="ed2-section">
            <button className="ed2-terms-toggle" onClick={() => setTermsOpen(v => !v)}>
              <span className="ed2-section-title" style={{ margin: 0 }}><span className="ed2-title-bar" />Terms &amp; Conditions</span>
              {termsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {termsOpen && (
              <div className="ed2-terms-body">
                <ul>
                  <li>Tickets once booked cannot be cancelled or refunded.</li>
                  <li>Outside food and beverages are not permitted.</li>
                  <li>Entry is subject to security check. Please cooperate.</li>
                  <li>Management reserves the right to deny entry without refund.</li>
                  <li>Please carry a valid photo ID for verification at entry.</li>
                  {event.terms && <li>{event.terms}</li>}
                </ul>
              </div>
            )}
          </section>

          {/* Similar Events */}
          {similarEvents.length > 0 && (
            <section className="ed2-section">
              <div className="ed2-section-header">
                <h2 className="ed2-section-title"><span className="ed2-title-bar" />Events You May Enjoy</h2>
              </div>
              <div className="ed2-similar-row" ref={similarRowRef}>
                {similarEvents.map(ev => {
                  const evDate = new Date(ev.event_date);
                  const evMin = ev.event_ticket_tiers?.length > 0
                    ? Math.min(...ev.event_ticket_tiers.map(t => t.price))
                    : null;
                  let evImg = ev.banner_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=70';
                  if (typeof evImg === 'string' && evImg.startsWith('[')) {
                    try {
                      const arr = JSON.parse(evImg);
                      if (Array.isArray(arr) && arr.length > 0) {
                        evImg = arr[0];
                      }
                    } catch (_) { /* ignore */ }
                  }
                  return (
                    <div key={ev.id} className="ed2-similar-card" onClick={() => navigate(`/events/${ev.id}`)}>
                      <div className="ed2-similar-img-wrap">
                        <img src={evImg} alt={ev.title} />
                      </div>
                      <div className="ed2-similar-info">
                        <p className="ed2-similar-title">{ev.title}</p>
                        <p className="ed2-similar-date">{evDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                        {evMin && <p className="ed2-similar-price">From ₹{evMin}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT STICKY CARD */}
        <aside className="ed2-sticky-card">
          <h3 className="ed2-sticky-title">{event.title}</h3>
          <div className="ed2-sticky-row">
            <Calendar size={14} className="ed2-sticky-icon" />
            <div>
              <p className="ed2-sticky-label">Date &amp; Time</p>
              <p className="ed2-sticky-val">{formattedDate}, {formattedTime}</p>
            </div>
          </div>
          {event.age_restriction && (
            <div className="ed2-sticky-row">
              <Users size={14} className="ed2-sticky-icon" />
              <div>
                <p className="ed2-sticky-label">Age Group</p>
                <p className="ed2-sticky-val">{event.age_restriction}</p>
              </div>
            </div>
          )}
          <div className="ed2-sticky-row">
            <MapPin size={14} className="ed2-sticky-icon" />
            <div>
              <p className="ed2-sticky-label">Venue</p>
              <p className="ed2-sticky-val">{event.venue_name || 'TBA'}{event.city ? `, ${event.city}` : ''}</p>
            </div>
          </div>
          {!hasEnded && anyTierOpen && (
            <div className="ed2-sticky-seats">
              <span className={`ed2-seats-dot ${totalSeats === 0 ? 'sold' : totalSeats < 50 ? 'low' : 'avail'}`} />
              {totalSeats === 0 ? 'Sold Out' : `${totalSeats} Available`}
            </div>
          )}
          {/* Fix #9: Only show the book button if there are tiers available */}
          <button
            className={`ed2-book-btn ${isDisabled ? 'disabled' : ''}`}
            disabled={isDisabled}
            onClick={() => {
              if (!user) { toast.error('Please login to book tickets'); navigate('/auth'); return; }
              navigate('/events/checkout', { state: { event, user } });
            }}
          >
            {hasEnded ? 'Event Ended' : isSoldOut ? 'Sold Out' : tiers.length === 0 ? 'No Tickets' : (bookingNotOpenedYet ? 'Booking Not Opened' : (!anyTierOpen ? 'Booking Closed' : 'Book Tickets'))}
          </button>
        </aside>
      </div>

      {/* ── MOBILE BOTTOM BAR ── */}
      <div className="ed2-bottom-bar">
        {minPrice && <div className="ed2-bottom-price">From <strong>₹{minPrice}</strong></div>}
        {/* Fix #9: Only show book button if tiers exist */}
        <button
          className={`ed2-book-btn ${isDisabled ? 'disabled' : ''}`}
          disabled={isDisabled}
          onClick={() => {
            if (!user) { toast.error('Please login to book tickets'); navigate('/auth'); return; }
            navigate('/events/checkout', { state: { event, user } });
          }}
        >
          {hasEnded ? 'Event Ended' : isSoldOut ? 'Sold Out' : tiers.length === 0 ? 'No Tickets' : (bookingNotOpenedYet ? 'Booking Not Opened' : (!anyTierOpen ? 'Booking Closed' : 'Book Tickets'))}
        </button>
      </div>
    </div>
  );
};

export default EventDetails;
