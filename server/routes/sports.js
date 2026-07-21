import express from 'express';
import crypto from 'crypto';
import supabase from '../supabase.js';

const router = express.Router();

const PLATFORM_FEE_PERCENT = 0.05; // 5% platform fee
const GST_RATE = 0.18;             // 18% GST on platform fee only

const SPORT_LABELS = {
  box_cricket:    'Box Cricket',
  badminton:      'Badminton',
  turf:           'Football Turf',
  cricket_net:    'Cricket Net',
  pickleball:     'Pickleball',
  table_tennis:   'Table Tennis',
  padel:          'Padel',
  tennis:         'Tennis',
  snooker:        'Snooker',
  pool:           'Pool / Billiards',
  cricket:        'Cricket',
};

// ── Invoice number generator ──────────────────────────────────────────────────
const makeInvoice = () =>
  `SV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// ── QR code generator ─────────────────────────────────────────────────────────
const makeQR = () =>
  crypto.randomBytes(12).toString('hex').toUpperCase();

// ── Auto-generate slots for a venue + date ────────────────────────────────────
const generateSlotsForDate = async (venueId, date) => {
  const { data: venue } = await supabase
    .from('sports_venues')
    .select('*')
    .eq('id', venueId)
    .eq('status', 'approved')
    .maybeSingle();

  if (!venue) return;

  let openH  = parseInt((venue.open_time  || '06:00').split(':')[0]);
  let closeH = parseInt((venue.close_time || '22:00').split(':')[0]);
  if (venue.open_time === venue.close_time || venue.close_time === '00:00' || venue.close_time === '24:00') {
    openH = 0;
    closeH = 24;
  } else if (closeH < openH) {
    closeH = 24;
  }
  const dur    = venue.slot_duration_mins || 60;
  const sports = venue.sport_types || [];
  const prices = venue.price_per_hour || {};

  const slotsToInsert = [];
  for (const sport of sports) {
    let h = openH;
    while (h < closeH) {
      const startT = `${String(h).padStart(2,'0')}:00`;
      const endH   = h + Math.floor(dur / 60);
      const endT   = `${String(endH).padStart(2,'0')}:${String(dur % 60).padStart(2,'0')}`;
      slotsToInsert.push({
        venue_id:      venueId,
        sport_type:    sport,
        slot_date:     date,
        slot_time:     startT,
        slot_end_time: endT,
        price:         prices[sport] || 500,
        status:        'available',
      });
      h += Math.floor(dur / 60);
    }
  }

  if (slotsToInsert.length > 0) {
    await supabase.from('venue_slots').upsert(slotsToInsert, {
      onConflict: 'venue_id,sport_type,slot_date,slot_time',
      ignoreDuplicates: true,
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/sports/venues — Browse venues
// ══════════════════════════════════════════════════════════════════════════════
router.get('/venues', async (req, res) => {
  try {
    const { sport, city, search, page = 1, pageSize = 12 } = req.query;
    const from = (parseInt(page) - 1) * parseInt(pageSize);
    const to   = from + parseInt(pageSize) - 1;

    let query = supabase
      .from('sports_venues')
      .select('*', { count: 'exact' })
      .eq('status', 'approved')
      .range(from, to);

    if (sport && sport !== 'all') {
      query = query.contains('sport_types', [sport]);
    }
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
    }

    const { data: venues, error, count } = await query;
    if (error) throw error;

    res.json({ success: true, venues: venues || [], total: count || 0 });
  } catch (err) {
    console.error('Sports venues fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/sports/venues/:id — Single venue details
// ══════════════════════════════════════════════════════════════════════════════
router.get('/venues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: venue, error } = await supabase
      .from('sports_venues')
      .select('*')
      .eq('id', id)
      .eq('status', 'approved')
      .maybeSingle();

    if (error) throw error;
    if (!venue) return res.status(404).json({ success: false, error: 'Venue not found' });

    res.json({ success: true, venue });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/sports/slots — Get slots for venue + date + sport
// ══════════════════════════════════════════════════════════════════════════════
router.get('/slots', async (req, res) => {
  try {
    const { venue_id, date, sport } = req.query;
    if (!venue_id || !date) {
      return res.status(400).json({ success: false, error: 'venue_id and date are required' });
    }

    // Auto-generate slots if they don't exist for this date
    const { count } = await supabase
      .from('venue_slots')
      .select('id', { count: 'exact', head: true })
      .eq('venue_id', venue_id)
      .eq('slot_date', date);

    if (count === 0) {
      await generateSlotsForDate(venue_id, date);
    }

    let query = supabase
      .from('venue_slots')
      .select('*')
      .eq('venue_id', venue_id)
      .eq('slot_date', date)
      .order('sport_type')
      .order('slot_time');

    if (sport && sport !== 'all') {
      query = query.eq('sport_type', sport);
    }

    const { data: slots, error } = await query;
    if (error) throw error;

    res.json({ success: true, slots: slots || [] });
  } catch (err) {
    console.error('Slots fetch error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/sports/book — Create a booking
// ══════════════════════════════════════════════════════════════════════════════
router.post('/book', async (req, res) => {
  const { venue_id, slot_id, slot_ids, sport_type, user_id, user_phone, user_name, user_email } = req.body;

  const idsToBook = slot_ids && Array.isArray(slot_ids) ? slot_ids : (slot_id ? [slot_id] : []);

  if (!venue_id || idsToBook.length === 0 || !sport_type) {
    return res.status(400).json({ success: false, error: 'venue_id, slot_ids (or slot_id), and sport_type are required' });
  }

  try {
    // 1. Fetch venue details
    const { data: venue } = await supabase
      .from('sports_venues')
      .select('name, address, city, sport_types')
      .eq('id', venue_id)
      .maybeSingle();

    let finalSport = sport_type;
    if (finalSport === 'all' || !finalSport) {
      finalSport = (venue && venue.sport_types && venue.sport_types.length > 0) ? venue.sport_types[0] : 'box_cricket';
    }

    // 2. Check all slots are still available
    const slots = [];
    for (const sid of idsToBook) {
      const { data: slot, error: slotErr } = await supabase
        .from('venue_slots')
        .select('*')
        .eq('id', sid)
        .eq('status', 'available')
        .maybeSingle();

      if (slotErr) throw slotErr;
      if (!slot) {
        return res.status(409).json({ success: false, error: 'One or more selected slots are already booked. Please choose other times.' });
      }
      slots.push(slot);
    }

    // Resolve user UUID if user_id is a Firebase UID or null, using email or phone
    let resolvedUserId = user_id;
    if (!resolvedUserId || resolvedUserId.length !== 36) {
      const orFilters = [];
      if (user_id) orFilters.push(`uid.eq.${user_id}`);
      if (user_email) orFilters.push(`email.eq.${user_email}`);
      if (user_phone) {
        const cleanPhone = String(user_phone).replace(/\D/g, '').slice(-10);
        orFilters.push(`phone.eq.${cleanPhone}`);
        orFilters.push(`phone.eq.+91${cleanPhone}`);
      }
      if (orFilters.length > 0) {
        try {
          const { data: usr } = await supabase.from('users').select('id').or(orFilters.join(',')).maybeSingle();
          if (usr) resolvedUserId = usr.id;
        } catch (e) {
          console.warn("Failed to resolve user UUID in sports booking:", e.message);
        }
      }
    }
    // Final guard: if resolvedUserId is still not a valid UUID format, set to null to avoid Postgres cast crash
    if (resolvedUserId && resolvedUserId.length !== 36) {
      resolvedUserId = null;
    }

    const bookings = [];

    // 3. Create booking records in a loop
    for (const slot of slots) {
      const base     = slot.price;
      const platFee  = Math.round(base * PLATFORM_FEE_PERCENT);
      const gstAmt   = Math.round(platFee * GST_RATE);
      const total    = base + platFee + gstAmt;
      const qrCode   = makeQR();
      const invoice  = makeInvoice();

      const { data: booking, error: bookErr } = await supabase
        .from('venue_bookings')
        .insert({
          venue_id,
          slot_id:       slot.id,
          user_id:       resolvedUserId,
          user_phone,
          user_name,
          user_email,
          sport_type:    finalSport,
          slot_date:     slot.slot_date,
          slot_time:     slot.slot_time,
          slot_end_time: slot.slot_end_time,
          duration_mins: 60,
          base_amount:   base,
          platform_fee:  platFee,
          gst_amount:    gstAmt,
          total_amount:  total,
          qr_code:       qrCode,
          invoice_number: invoice,
          status:        'confirmed',
        })
        .select()
        .single();

      if (bookErr) throw bookErr;

      // 4. Mark slot as booked
      await supabase
        .from('venue_slots')
        .update({ status: 'booked', booked_by: user_id, booking_id: booking.id })
        .eq('id', slot.id);

      // 5. Increment venue total_bookings
      try {
        await supabase.rpc('increment_venue_bookings', { vid: venue_id });
      } catch (e) {
        console.warn("Failed to increment venue bookings:", e.message);
      }

      bookings.push({
        ...booking,
        venue_name:    venue?.name    || '',
        venue_address: venue?.address || '',
        venue_city:    venue?.city    || '',
        sport_label:   SPORT_LABELS[sport_type] || sport_type,
      });
    }

    res.json({
      success: true,
      booking: bookings[0],
      bookings: bookings,
    });
  } catch (err) {
    console.error('Sports booking error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/sports/cancel — Cancel a booking
// ══════════════════════════════════════════════════════════════════════════════
router.post('/cancel', async (req, res) => {
  const { booking_id, reason } = req.body;
  if (!booking_id) return res.status(400).json({ success: false, error: 'booking_id required' });

  try {
    const { data: booking, error: fetchErr } = await supabase
      .from('venue_bookings')
      .select('*')
      .eq('id', booking_id)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, error: 'Only confirmed bookings can be cancelled' });
    }

    // Free the slot
    if (booking.slot_id) {
      await supabase
        .from('venue_slots')
        .update({ status: 'available', booked_by: null, booking_id: null })
        .eq('id', booking.slot_id);
    }

    // Update booking status
    await supabase
      .from('venue_bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason: reason || '' })
      .eq('id', booking_id);

    res.json({ success: true, message: 'Booking cancelled. Slot is now available again.' });
  } catch (err) {
    console.error('Cancel booking error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/sports/my-bookings — User's booking history
// ══════════════════════════════════════════════════════════════════════════════
router.get('/my-bookings', async (req, res) => {
  try {
    const { user_id, phone } = req.query;
    if (!user_id && !phone) return res.status(400).json({ success: false, error: 'user_id or phone required' });

    let query = supabase
      .from('venue_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (user_id) query = query.eq('user_id', user_id);
    else         query = query.eq('user_phone', phone);

    const { data: bookings, error } = await query;
    if (error) throw error;

    if (bookings && bookings.length > 0) {
      const venueIds = [...new Set(bookings.map(b => b.venue_id))];
      const { data: venues, error: venuesErr } = await supabase
        .from('sports_venues')
        .select('id, name, address, city, images')
        .in('id', venueIds);

      if (!venuesErr && venues) {
        const venueMap = new Map(venues.map(v => [v.id, v]));
        const bookingsWithVenues = bookings.map(b => ({
          ...b,
          sports_venues: venueMap.get(b.venue_id) || null
        }));
        return res.json({ success: true, bookings: bookingsWithVenues });
      }
    }

    res.json({ success: true, bookings: bookings || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/sports/checkin — Vendor scans QR to check in a player
// ══════════════════════════════════════════════════════════════════════════════
router.post('/checkin', async (req, res) => {
  const { qr_code } = req.body;
  if (!qr_code) return res.status(400).json({ success: false, error: 'qr_code required' });

  try {
    const { data: booking, error } = await supabase
      .from('venue_bookings')
      .select('*')
      .eq('qr_code', qr_code)
      .maybeSingle();

    if (error) throw error;
    if (!booking) return res.status(404).json({ success: false, error: 'Invalid QR code' });

    // Fetch venue name separately to avoid postgrest relationship issues
    let venueName = '';
    const { data: venue } = await supabase
      .from('sports_venues')
      .select('name')
      .eq('id', booking.venue_id)
      .maybeSingle();
    if (venue) venueName = venue.name;

    const bookingWithVenue = { ...booking, sports_venues: { name: venueName } };

    // Verify booking is for today
    const todayStr = new Date().toISOString().split('T')[0];
    if (booking.slot_date !== todayStr) {
      const formattedDate = new Date(booking.slot_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      const todayFormatted = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      return res.status(400).json({
        success: false,
        error: `⛔ Invalid Check-in: This booking is scheduled for ${formattedDate}, not today (${todayFormatted}).`
      });
    }

    // Verify booking time is within allowed window (from 5 minutes before slot start time)
    if (booking.slot_time) {
      const [hours, minutes] = booking.slot_time.split(':').map(Number);
      const slotStartTime = new Date(booking.slot_date);
      slotStartTime.setHours(hours, minutes, 0, 0);

      const now = new Date();
      // Allow check-in starting 5 minutes before the booking starts
      const allowedStartTime = new Date(slotStartTime.getTime() - 5 * 60 * 1000);

      if (now < allowedStartTime) {
        const formattedSlotTime = booking.slot_time.slice(0, 5);
        const [h, m] = formattedSlotTime.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        const displayM = String(m).padStart(2, '0');
        
        const [eh, em] = (booking.slot_end_time || '15:00').split(':').map(Number);
        const endampm = eh >= 12 ? 'PM' : 'AM';
        const displayEndH = eh % 12 || 12;
        const displayEndM = String(em).padStart(2, '0');

        return res.status(400).json({
          success: false,
          error: `⛔ Too early! Your booking is scheduled for ${displayH}:${displayM} ${ampm} to ${displayEndH}:${displayEndM} ${endampm}. Check-in is only allowed up to 5 minutes before the start time.`
        });
      }
    }

    if (bookingWithVenue.status !== 'confirmed') {
      return res.status(400).json({ success: false, error: `Booking is ${booking.status}` });
    }
    if (booking.checked_in_at) {
      return res.status(400).json({ success: false, error: 'Already checked in at ' + new Date(booking.checked_in_at).toLocaleTimeString('en-IN') });
    }

    await supabase
      .from('venue_bookings')
      .update({ status: 'completed', checked_in_at: new Date().toISOString() })
      .eq('id', booking.id);

    res.json({ success: true, message: 'Check-in successful!', booking: bookingWithVenue });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/sports/venues — Vendor registers a new sports venue
// ══════════════════════════════════════════════════════════════════════════════
router.post('/venues', async (req, res) => {
  try {
    const {
      name, description, sport_types, address, city, lat, lng,
      owner_id, owner_user_id, owner_name, owner_phone,
      price_per_hour, images, amenities,
      open_time, close_time, slot_duration_mins, max_players,
    } = req.body;

    if (!name || !sport_types?.length) {
      return res.status(400).json({ success: false, error: 'name and sport_types are required' });
    }

    const { data: venue, error } = await supabase
      .from('sports_venues')
      .insert({
        name, description, sport_types, address,
        city: city || 'Ahmedabad', lat, lng,
        owner_id, owner_user_id, owner_name, owner_phone,
        price_per_hour: price_per_hour || {},
        images: images || [],
        amenities: amenities || [],
        open_time: open_time || '06:00',
        close_time: close_time || '22:00',
        slot_duration_mins: slot_duration_mins || 60,
        max_players: max_players || {},
        status: 'approved',
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, venue });
  } catch (err) {
    console.error('Register venue error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PATCH /api/sports/venues/:id — Vendor updates their venue
// ══════════════════════════════════════════════════════════════════════════════
router.patch('/venues/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    delete updates.id;
    delete updates.status; // status only changed by admin

    const { data, error } = await supabase
      .from('sports_venues')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, venue: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Helper to validate UUID format
const isUuid = (val) => val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

// GET /api/sports/vendor-venues — Vendor's own venues
// ══════════════════════════════════════════════════════════════════════════════
router.get('/vendor-venues', async (req, res) => {
  try {
    const { owner_id, owner_user_id } = req.query;
    if (!owner_id && !owner_user_id) {
      return res.status(400).json({ success: false, error: 'owner_id or owner_user_id required' });
    }

    if (owner_id && !isUuid(owner_id)) {
      return res.json({ success: true, venues: [] });
    }
    if (owner_user_id && !isUuid(owner_user_id)) {
      return res.json({ success: true, venues: [] });
    }

    let query = supabase.from('sports_venues').select('*').order('created_at', { ascending: false });
    if (owner_id)      query = query.eq('owner_id', owner_id);
    if (owner_user_id) query = query.eq('owner_user_id', owner_user_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, venues: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/sports/vendor-bookings — Vendor sees bookings for their venues
// ══════════════════════════════════════════════════════════════════════════════
router.get('/vendor-bookings', async (req, res) => {
  try {
    const { venue_id, date } = req.query;
    if (!venue_id) return res.status(400).json({ success: false, error: 'venue_id required' });

    if (!isUuid(venue_id)) {
      return res.json({ success: true, bookings: [] });
    }

    let query = supabase
      .from('venue_bookings')
      .select('*')
      .eq('venue_id', venue_id)
      .order('slot_date', { ascending: true })
      .order('slot_time', { ascending: true });

    if (date) query = query.eq('slot_date', date);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, bookings: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/sports/block-slot — Vendor blocks a slot manually
// ══════════════════════════════════════════════════════════════════════════════
router.post('/block-slot', async (req, res) => {
  const { slot_id } = req.body;
  if (!slot_id) return res.status(400).json({ success: false, error: 'slot_id required' });
  try {
    await supabase.from('venue_slots').update({ status: 'blocked' }).eq('id', slot_id).eq('status', 'available');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/sports/unblock-slot — Vendor unblocks a slot
// ══════════════════════════════════════════════════════════════════════════════
router.post('/unblock-slot', async (req, res) => {
  const { slot_id } = req.body;
  if (!slot_id) return res.status(400).json({ success: false, error: 'slot_id required' });
  try {
    await supabase.from('venue_slots').update({ status: 'available' }).eq('id', slot_id).eq('status', 'blocked');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
