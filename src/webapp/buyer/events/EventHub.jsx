import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Calendar, History, Clock, ChevronLeft, ChevronRight, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../supabase';
import { useTranslation } from '../../LanguageContext';
import './EventHub.css';

const CATEGORIES = [
  'All',
  'Music & Concerts',
  'Comedy & Theatre',
  'Workshops & Classes',
  'Parties & Nightlife',
  'Festivals & Fairs',
  'Exhibitions & Expos',
  'Food & Drinks',
  'Conferences & Talks',
];

const EXPLORE_CATEGORIES = [
  { id: 'Music', label: 'Music', emoji: '🔊', bg: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', dbCategory: 'Music & Concerts' },
  { id: 'Nightlife', label: 'Nightlife', emoji: '🪩', bg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', dbCategory: 'Parties & Nightlife' },
  { id: 'Comedy', label: 'Comedy', emoji: '🎤', bg: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)', dbCategory: 'Comedy & Theatre' },
  { id: 'Sports', label: 'Sports', emoji: '🏆', bg: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%)', dbCategory: 'Sports' },
  { id: 'Performances', label: 'Performances', emoji: '🪭', bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)', dbCategory: 'Comedy & Theatre' },
  { id: 'Food & Drinks', label: 'Food & Drinks', emoji: '🍽️', bg: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', dbCategory: 'Food & Drinks' },
  { id: 'Social Mixers', label: 'Social Mixers', emoji: '🥂', bg: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)', dbCategory: 'Parties & Nightlife' },
  { id: 'Screenings', label: 'Screenings', emoji: '📽️', bg: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)', dbCategory: 'Exhibitions & Expos' },
  { id: 'Conferences', label: 'Conferences', emoji: '🎙️', bg: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', dbCategory: 'Conferences & Talks' },
  { id: 'Expos', label: 'Expos', emoji: '🎪', bg: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', dbCategory: 'Exhibitions & Expos' },
  { id: 'Open Mics', label: 'Open Mics', emoji: '🎤', bg: 'linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 100%)', dbCategory: 'Comedy & Theatre' },
];

const PAGE_SIZE = 12;
const BASE_URL = import.meta.env.VITE_API_URL || '';
const FALLBACK_IMG = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80';

const EventHub = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, currentLanguage } = useTranslation();
  const [events, setEvents]             = useState([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeShowType, setActiveShowType] = useState('all'); // 'all' | 'single' | 'multiple' | 'tour'
  const [searchQuery, setSearchQuery]   = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  });
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [timeFilter, setTimeFilter]     = useState('upcoming');
  const [page, setPage]                 = useState(1);
  const [expandedGroups, setExpandedGroups] = useState({
    categories: true,
    showTypes: true,
    timeFilter: true
  });
  const abortRef   = useRef(null);
  const refreshRef = useRef(null);

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const clearAllFilters = () => {
    setActiveCategory('All');
    setActiveShowType('all');
    setTimeFilter('upcoming');
    setSearchQuery('');
    navigate('/events');
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearchQuery(params.get('q') || '');
  }, [location.search]);



  // Translate categories for display
  const translateCategory = (catName) => {
    switch (catName) {
      case 'All': return t('cat_all');
      case 'Music & Concerts': return t('cat_music_concerts');
      case 'Comedy & Theatre': return t('cat_comedy_theatre');
      case 'Workshops & Classes': return t('cat_workshops_classes');
      case 'Parties & Nightlife': return t('cat_parties_nightlife');
      case 'Festivals & Fairs': return t('cat_festivals_fairs');
      case 'Sports & Fitness': return t('cat_sports_fitness');
      case 'Corporate & Business': return t('cat_corporate_business');
      default: return catName;
    }
  };

  // Translate show types for display
  const translateShowType = (type) => {
    switch (type) {
      case 'all': return t('all_show_types');
      case 'single': return t('single_show');
      case 'multiple': return t('multiple_shows');
      case 'tour':
      case 'festival':
        return t('tour_festival');
      default: return type;
    }
  };

  // Debounce search input by 400ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [activeCategory, debouncedQuery, timeFilter, activeShowType]);

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
        showType: activeShowType,
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
  }, [activeCategory, debouncedQuery, timeFilter, page, activeShowType]);

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
      {/* ── BMS Style Sub-Navbar ── */}
      <div className="bms-subnav">
        <div className="bms-subnav-inner">
          <div className="bms-subnav-links-left">
            <span className={window.location.pathname.startsWith('/events') ? 'active' : ''} onClick={() => navigate('/events')}>Events</span>
            <span className={window.location.pathname.startsWith('/sports') ? 'active' : ''} onClick={() => navigate('/sports')}>Sports</span>
          </div>
          <div className="bms-subnav-links-right">
            <span onClick={() => navigate('/admin/auth')}>ListYourShow</span>
            <span onClick={() => navigate('/offers')}>Offers</span>
            <span onClick={() => navigate('/giftcards')}>Gift Cards</span>
          </div>
        </div>
      </div>

      {/* ── Top Header ── */}
      <div className="eh-topbar">
        <div className="eh-topbar-inner">
          <h2 className="eh-heading">{t('events_near_you')}</h2>
          <div className="eh-time-toggle">
            <button
              className={`eh-toggle-btn ${timeFilter === 'upcoming' ? 'active' : ''}`}
              onClick={() => setTimeFilter('upcoming')}
            >
              <Calendar size={14} /> {t('upcoming')}
            </button>
            <button
              className={`eh-toggle-btn ${timeFilter === 'past' ? 'active-past' : ''}`}
              onClick={() => setTimeFilter('past')}
            >
              <History size={14} /> {t('past')}
            </button>
          </div>
        </div>
      </div>


      {/* ── Explore Events Category Grid ── */}
      <div className="eh-explore-section">
        <h2 className="eh-explore-title">{t('explore_events', 'Explore Events')}</h2>
        <div className="eh-explore-grid">
          {EXPLORE_CATEGORIES.map(cat => (
            <div
              key={cat.id}
              className={`eh-explore-card ${activeCategory === cat.dbCategory ? 'active' : ''}`}
              onClick={() => cat.dbCategory === 'Sports' ? navigate('/sports') : setActiveCategory(prev => prev === cat.dbCategory ? 'All' : cat.dbCategory)}
            >
              <span className="eh-explore-card-label">{cat.label}</span>
              <div className="eh-explore-card-visual" style={{ background: cat.bg }}>
                <span className="eh-explore-card-emoji">{cat.emoji}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Show Type Chips ── */}
      <div className="eh-show-types-bar">
        <div className="eh-show-types-inner">
          {[
            { id: 'all', label: t('all_show_types') },
            { id: 'single', label: t('single_show') },
            { id: 'multiple', label: t('multiple_shows') },
            { id: 'tour', label: t('tour_festival') }
          ].map(typeOpt => (
            <button
              key={typeOpt.id}
              className={`eh-show-type-chip ${activeShowType === typeOpt.id ? 'active' : ''}`}
              onClick={() => setActiveShowType(typeOpt.id)}
            >
              {typeOpt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Layout Container ── */}
      <div className="eh-layout-container">
        {/* ── Sidebar Filters ── */}
        <aside className="eh-sidebar">
          <div className="eh-sidebar-header">
            <h3 className="eh-sidebar-title">{t('filters', 'Filters')}</h3>
            {(activeCategory !== 'All' || activeShowType !== 'all' || timeFilter !== 'upcoming' || searchQuery !== '') && (
              <button className="eh-clear-filters-btn" onClick={clearAllFilters}>
                {t('clear_all', 'Clear All')}
              </button>
            )}
          </div>

          {/* Categories group */}
          <div className="eh-filter-group">
            <button className="eh-filter-toggle" onClick={() => toggleGroup('categories')}>
              <span>{t('categories', 'Categories')}</span>
              {expandedGroups.categories ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedGroups.categories && (
              <div className="eh-filter-options">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    className={`eh-sidebar-pill ${activeCategory === cat ? 'active' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {translateCategory(cat)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Show Types group */}
          <div className="eh-filter-group">
            <button className="eh-filter-toggle" onClick={() => toggleGroup('showTypes')}>
              <span>{t('show_types', 'Show Types')}</span>
              {expandedGroups.showTypes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedGroups.showTypes && (
              <div className="eh-filter-options">
                {[
                  { id: 'all', label: t('all_show_types') },
                  { id: 'single', label: t('single_show') },
                  { id: 'multiple', label: t('multiple_shows') },
                  { id: 'tour', label: t('tour_festival') }
                ].map(typeOpt => (
                  <button
                    key={typeOpt.id}
                    className={`eh-sidebar-pill ${activeShowType === typeOpt.id ? 'active' : ''}`}
                    onClick={() => setActiveShowType(typeOpt.id)}
                  >
                    {typeOpt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date group */}
          <div className="eh-filter-group">
            <button className="eh-filter-toggle" onClick={() => toggleGroup('timeFilter')}>
              <span>{t('date', 'Date')}</span>
              {expandedGroups.timeFilter ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedGroups.timeFilter && (
              <div className="eh-filter-options">
                <button
                  className={`eh-sidebar-pill ${timeFilter === 'upcoming' ? 'active' : ''}`}
                  onClick={() => setTimeFilter('upcoming')}
                >
                  {t('upcoming')}
                </button>
                <button
                  className={`eh-sidebar-pill ${timeFilter === 'past' ? 'active' : ''}`}
                  onClick={() => setTimeFilter('past')}
                >
                  {t('past')}
                </button>
              </div>
            )}
          </div>

          <button
            className="eh-browse-venues-btn"
            onClick={() => navigate('/neighborhood-hub')}
          >
            {t('browse_by_venues', 'Browse by Venues')}
          </button>
        </aside>

        {/* ── Main Content ── */}
        <div className="eh-main-content">
          {/* ── Result count ── */}
          {!loading && total > 0 && (
            <p className="eh-result-count">
              {total} {total !== 1 ? t('events_found') : t('event_found')}
              {activeCategory !== 'All' ? ` ${t('in_category', 'in')} "${translateCategory(activeCategory)}"` : ''}
              {activeShowType !== 'all' ? ` (Type: ${translateShowType(activeShowType)})` : ''}
              {totalPages > 1 ? ` — ${t('page_of', 'page {page} of {total}').replace('{page}', String(page)).replace('{total}', String(totalPages))}` : ''}
            </p>
          )}

          {/* ── Event Grid ── */}
          {loading ? (
            <div className="eh-loader">
              <div className="eh-spinner" />
              <p>{t('loading_events')}</p>
            </div>
          ) : events.length === 0 ? (
            <div className="eh-empty">
              <Calendar size={52} color="#ffe4cc" />
              <p>{t('no_events_found').replace('{filter}', timeFilter === 'past' ? t('past').toLowerCase() : t('upcoming').toLowerCase())}{activeCategory !== 'All' ? ` ${t('in_category', 'in')} "${translateCategory(activeCategory)}"` : ''}.</p>
              {activeCategory !== 'All' && (
                <button className="eh-reset-btn" onClick={() => setActiveCategory('All')}>{t('show_all_events')}</button>
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

                  // Format date month in localized language format
                  const eventDateObj = new Date(event.event_date);
                  const formattedMonth = eventDateObj.toLocaleString(
                    currentLanguage === 'en' ? 'en-IN' : `${currentLanguage}-IN`,
                    { month: 'short' }
                  ).toUpperCase();

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
                          <span className="eh-date-day">{eventDateObj.getDate()}</span>
                          <span className="eh-date-month">{formattedMonth}</span>
                        </div>
                        {isSoldOut && <div className="eh-soldout-ribbon">{t('sold_out')}</div>}
                        {timeFilter === 'past' && <div className="eh-past-badge"><Clock size={10} /> {t('past')}</div>}
                      </div>

                      {/* Info */}
                      <div className="eh-card-info">
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          {categoryLabel && <span className="eh-card-category" style={{ marginBottom: 0 }}>{translateCategory(categoryLabel)}</span>}
                          <span className={`eh-card-show-type ${event.show_type || 'single'}`}>
                            {translateShowType(event.show_type || 'single')}
                          </span>
                        </div>
                        <h3 className="eh-card-title">{event.title}</h3>
                        <p className="eh-card-venue">
                          <MapPin size={12} style={{ marginRight: '4px', flexShrink: 0 }} />
                          <span>{event.venue_name}{event.city ? `, ${event.city}` : ''}</span>
                        </p>

                        <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            {minPrice !== null ? (
                              <span className="eh-card-price">₹{minPrice}<span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginLeft: '2px' }}>{t('onwards')}</span></span>
                            ) : (
                              <span className="eh-card-price" style={{ color: '#16a34a' }}>{t('free')}</span>
                            )}

                            {!isSoldOut && totalCap > 0 && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: pct < 20 ? '#ef4444' : '#16a34a' }}>
                                {pct < 20
                                  ? t('only_n_left').replace('{n}', String(totalSeats))
                                  : t('n_available').replace('{n}', String(totalSeats))
                                }
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
                      document.querySelector('.webapp-main')?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    <ChevronLeft size={16} /> {t('prev')}
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
                    {t('next')} <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventHub;
