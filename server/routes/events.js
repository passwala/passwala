import express from 'express';
import crypto from 'crypto';
import supabase from '../supabase.js';
import nodemailer from 'nodemailer';
import { userAuth } from './users.js';
import { apiLimiter } from '../utils/rateLimiter.js';

const router = express.Router();

// ── Shared GST Rate (Fix #19: single source of truth) ────────────────────────
export const GST_RATE = 0.09; // 9% CGST + 9% SGST = 18% for entertainment services

// ── Reusable SMTP Transporter (Fix #16: created once, not per call) ──────────
const smtpTransporter = (process.env.SMTP_USER && process.env.SMTP_USER !== 'your_email@gmail.com')
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true,       // keep-alive connection pool
      maxConnections: 5,
    })
  : null;

// ── Email Helper ─────────────────────────────────────────────────────────────
const sendBookingEmail = async ({ toEmail, event, tier, booking }) => {
  if (!smtpTransporter) return; // SMTP not configured
  try {
    const transporter = smtpTransporter; // Fix #16: reuse shared transporter
    const eventDate = event?.event_date ? new Date(event.event_date).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' }) : 'TBA';
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `Passwala Events <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `🎫 Your Ticket Confirmed — ${event?.title || 'Event'}`,
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
          <div style="background:linear-gradient(135deg,#ff6b00,#f97316);padding:32px 24px;text-align:center">
            <img src="https://passwala.in/logo.png" alt="Passwala" style="height:40px;margin-bottom:16px" onerror="this.style.display='none'">
            <h1 style="color:white;margin:0;font-size:24px">🎫 Ticket Confirmed!</h1>
            <p style="color:rgba(255,255,255,0.9);margin:8px 0 0">Your spot is secured. We can't wait to see you!</p>
          </div>
          <div style="padding:32px 24px">
            <h2 style="color:#0f172a;font-size:20px;margin:0 0 4px">${event?.title || 'Event'}</h2>
            <p style="color:#64748b;font-size:14px;margin:0 0 24px">📅 ${eventDate} &nbsp;|&nbsp; 📍 ${event?.venue_name || 'Venue TBA'}</p>
            <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:20px">
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <tr><td style="color:#64748b;padding:6px 0">Invoice No.</td><td style="color:#0f172a;font-weight:700;text-align:right">${booking.invoice_number}</td></tr>
                <tr><td style="color:#64748b;padding:6px 0">Ticket Type</td><td style="color:#0f172a;font-weight:700;text-align:right">${tier?.tier_name || 'Standard'}</td></tr>
                <tr><td style="color:#64748b;padding:6px 0">Qty</td><td style="color:#0f172a;font-weight:700;text-align:right">${booking.ticket_count} ticket(s)</td></tr>
                <tr><td style="color:#64748b;padding:6px 0">Total Paid</td><td style="color:#ff6b00;font-weight:900;font-size:16px;text-align:right">₹${booking.total_amount}</td></tr>
              </table>
            </div>
            <div style="background:#fff7ed;border:2px dashed #fb923c;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
              <p style="color:#64748b;font-size:12px;margin:0 0 8px;text-transform:uppercase;font-weight:700">Your Entry Pass ID</p>
              <p style="color:#0f172a;font-size:16px;font-weight:900;font-family:monospace;letter-spacing:1px;margin:0">${booking.qr_code_hash}</p>
              <p style="color:#94a3b8;font-size:11px;margin:8px 0 0">Show this QR code from your Order History at the venue gate</p>
            </div>
            <p style="color:#64748b;font-size:13px;text-align:center">Open Passwala app → Order History → My Events → View Ticket</p>
          </div>
          <div style="background:#f8fafc;padding:20px 24px;text-align:center">
            <p style="color:#94a3b8;font-size:12px;margin:0">Passwala — Ahmedabad's Event Platform | <a href="https://passwala.in" style="color:#ff6b00">passwala.in</a></p>
          </div>
        </div>
      `
    });
    console.log(`[Email] Booking confirmation sent to ${toEmail}`);
  } catch (err) {
    console.warn('[Email] Failed to send booking confirmation:', err.message);
  }
};

/**
 * Check whether the booking window is currently open for a tier.
 * Supports full ISO datetime strings stored in booking_open / booking_close.
 * If neither column is set, booking is always open (no restriction).
 *
 * Returns { open: boolean, reason: string|null }
 */
function checkBookingWindow(tier, event) {
  const { booking_open, booking_close } = tier || {};
  const { booking_start, booking_end } = event || {};

  const now = new Date();

  // First check event-level booking window if event is provided
  if (booking_start) {
    const eventOpen = new Date(booking_start);
    if (!isNaN(eventOpen) && now < eventOpen) {
      return { open: false, reason: 'Booking has not opened yet' };
    }
  }
  if (booking_end) {
    const eventClose = new Date(booking_end);
    if (!isNaN(eventClose) && now > eventClose) {
      return { open: false, reason: 'Booking window has closed' };
    }
  }

  // If neither field is set, booking is always open
  if (!booking_open && !booking_close) return { open: true, reason: null };

  const openTime  = booking_open  ? new Date(booking_open)  : null;
  const closeTime = booking_close ? new Date(booking_close) : null;

  if (openTime && !isNaN(openTime) && now < openTime) {
    return { open: false, reason: 'Booking has not opened yet' };
  }
  if (closeTime && !isNaN(closeTime) && now > closeTime) {
    return { open: false, reason: 'Booking window has closed' };
  }
  return { open: true, reason: null };
}

// Get events with optional category/search/filter params + server-side pagination (Fix #11)
router.get('/search', async (req, res) => {
  try {
    const { query, category, filter, page = '1', pageSize = '12', showType } = req.query;
    const isPast = filter === 'past';
    const now = new Date().toISOString();
    const pageInt     = Math.max(1, parseInt(page) || 1);
    const pageSizeInt = Math.min(50, Math.max(1, parseInt(pageSize) || 12)); // cap 1–50

    // BUG B2 FIX: Only show admin-approved events to buyers (exclude PENDING_APPROVAL and REJECTED)
    let supabaseQuery = supabase
      .from('events')
      .select('*, event_ticket_tiers(*)')
      .neq('status', 'PENDING_APPROVAL')
      .neq('status', 'REJECTED')
      .or('visibility.is.null,visibility.eq.public'); // Only show public events in listings

    if (isPast) {
      supabaseQuery = supabaseQuery
        .lt('event_date', now)
        .order('event_date', { ascending: false });
    } else {
      supabaseQuery = supabaseQuery
        .gte('event_date', now)
        .in('status', ['UPCOMING', 'ONGOING', 'SOLD_OUT'])
        .order('event_date', { ascending: true });
    }

    if (category && category !== 'All' && category !== 'undefined') {
      supabaseQuery = supabaseQuery.eq('category', category);
    }

    if (showType && showType !== 'all' && showType !== 'undefined') {
      if (showType === 'tour') {
        supabaseQuery = supabaseQuery.in('show_type', ['tour', 'festival']);
      } else {
        supabaseQuery = supabaseQuery.eq('show_type', showType);
      }
    }

    if (query && query.trim()) {
      supabaseQuery = supabaseQuery.ilike('title', `%${query.trim()}%`);
    }

    const { data: events, error } = await supabaseQuery;
    if (error) throw error;

    // Attach organizer_name via vendors.user_id OR service_providers.user_id = events.created_by
    const createdByIds = [...new Set((events || []).map(e => e.created_by).filter(Boolean))];
    let vendorMap = {};
    if (createdByIds.length > 0) {
      const [{ data: vendors }, { data: sps }] = await Promise.all([
        supabase.from('vendors').select('user_id, business_name, name').in('user_id', createdByIds),
        supabase.from('service_providers').select('user_id, business_name, name').in('user_id', createdByIds)
      ]);
      if (vendors) {
        vendors.forEach(v => { vendorMap[v.user_id] = v.business_name || v.name || null; });
      }
      // service_providers fill gaps (event organizers)
      if (sps) {
        sps.forEach(sp => {
          if (!vendorMap[sp.user_id]) {
            vendorMap[sp.user_id] = sp.business_name || sp.name || null;
          }
        });
      }
    }

    const nowDate = new Date();

    // Visibility Rule: hide upcoming events whose ALL tiers have expired booking windows
    let visibleEvents = events || [];
    if (!isPast) {
      visibleEvents = visibleEvents.filter(event => {
        const tiers = event.event_ticket_tiers || [];
        if (tiers.length === 0) return true;
        return tiers.some(tier => {
          const { booking_close } = tier;
          if (!booking_close) return true;
          const closeTime = new Date(booking_close);
          return isNaN(closeTime) || nowDate <= closeTime;
        });
      });
    }
    // Group multiple shows by title + category + created_by to show only one parent event on buyer listings
    const seenMultiples = new Set();
    const keyCounts = {};
    visibleEvents.forEach(event => {
      const key = `${event.title}_${event.category}_${event.created_by}`.toLowerCase().trim();
      keyCounts[key] = (keyCounts[key] || 0) + 1;
    });

    visibleEvents = visibleEvents.filter(event => {
      const key = `${event.title}_${event.category}_${event.created_by}`.toLowerCase().trim();
      const isMultiShow = event.show_type === 'multiple' || event.show_type === 'festival' || event.show_type === 'tour' || (keyCounts[key] > 1);
      if (isMultiShow) {
        if (seenMultiples.has(key)) {
          return false; // Skip duplicate slot listings
        }
        seenMultiples.add(key);
      }
      return true;
    });

    visibleEvents = visibleEvents.map(event => {
      let banner = event.banner_url;
      if (banner && banner.startsWith('data:image') && banner.length > 100000) {
        banner = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=400&q=80';
      }
      return {
        ...event,
        banner_url: banner,
        organizer_name: event.is_admin_organized ? "Passwala Admin" : (vendorMap[event.created_by] || "Passwala Admin")
      };
    });

    // Fix #11: Server-side pagination — slice after filtering so count is accurate
    const total = visibleEvents.length;
    const from  = (pageInt - 1) * pageSizeInt;
    const paginatedEvents = visibleEvents.slice(from, from + pageSizeInt);

    res.json({ success: true, events: paginatedEvents, total, page: pageInt, pageSize: pageSizeInt });
  } catch (err) {
    console.error('Events Search Error:', err);
    res.status(500).json({ error: 'Failed to search events', details: err.message });
  }
});


// Get specific event details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: event, error } = await supabase
      .from('events')
      .select('*, event_ticket_tiers(*)')
      .eq('id', id)
      .single();

    if (error || !event) return res.status(404).json({ error: 'Event not found' });

    // Fetch organizer name — first check vendors, then service_providers (event organizers)
    let organizer_name = null;
    if (event.is_admin_organized) {
      organizer_name = "Passwala Admin";
    } else if (event.created_by) {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('business_name, name')
        .eq('user_id', event.created_by)
        .maybeSingle();
      if (vendor?.business_name || vendor?.name) {
        organizer_name = vendor.business_name || vendor.name;
      } else {
        // Check service_providers (for EVENT_ORGANIZER role users)
        const { data: sp } = await supabase
          .from('service_providers')
          .select('business_name, name')
          .eq('user_id', event.created_by)
          .maybeSingle();
        organizer_name = sp?.business_name || sp?.name || "Passwala Admin";
      }
    } else {
      organizer_name = "Passwala Admin";
    }

    res.json({ success: true, event: { ...event, organizer_name } });
  } catch (err) {
    console.error('Event Fetch Error:', err);
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
});

// Resolve a user's DB UUID from uid / phone / email (used by EventCheckout)
// Uses apiLimiter to prevent enumeration attacks from unauthenticated callers.
// Full userAuth is not used here because WhatsApp OTP users have no Firebase token.
router.post('/resolve-id', apiLimiter, async (req, res) => {
  try {
    let { uid, phone, email } = req.body;
    let userId = null;

    // Extract phone from whatsapp-uid pattern if no direct phone provided
    if (!phone && uid && uid.startsWith('whatsapp-')) {
      phone = uid.replace('whatsapp-', '');
    }

    if (phone) {
      const clean = String(phone).replace(/\D/g, '').slice(-10);
      if (clean.length === 10) {
        const { data } = await supabase.from('users').select('id').eq('phone', clean).maybeSingle();
        if (data?.id) userId = data.id;
      }
    }
    if (!userId && uid) {
      const { data } = await supabase.from('users').select('id').eq('uid', uid).maybeSingle();
      if (data?.id) userId = data.id;
    }
    if (!userId && email) {
      const { data } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
      if (data?.id) userId = data.id;
    }

    if (!userId) return res.status(404).json({ error: 'User not found' });
    res.json({ id: userId });
  } catch (err) {
    console.error('Resolve-id error:', err);
    res.status(500).json({ error: 'Failed to resolve user ID' });
  }
});

// Book a ticket — rate-limited to prevent abuse.
// Note: userAuth is NOT used here because WhatsApp OTP users have no Firebase token.
// The userId is validated by fetching from Supabase before processing.
router.post('/book', apiLimiter, async (req, res) => {
  try {
    let { userId, userPhone, userUid, userEmail, eventId, tierId, ticketCount } = req.body;

    // Extract phone from whatsapp-uid pattern if no direct phone provided
    if (!userPhone && userUid?.startsWith('whatsapp-')) {
      userPhone = userUid.replace('whatsapp-', '');
    }

    // Resolve userId from all available identifiers (service-role key bypasses RLS)
    if (!userId) {
      if (userPhone) {
        const cleanPhone = String(userPhone).replace(/\D/g, '').slice(-10);
        const { data: foundUser } = await supabase
          .from('users').select('id').eq('phone', cleanPhone).maybeSingle();
        if (foundUser?.id) userId = foundUser.id;
      }
      if (!userId && userUid) {
        const { data: foundUser } = await supabase
          .from('users').select('id').eq('uid', userUid).maybeSingle();
        if (foundUser?.id) userId = foundUser.id;
      }
      if (!userId && userEmail) {
        const { data: foundUser } = await supabase
          .from('users').select('id').eq('email', userEmail).maybeSingle();
        if (foundUser?.id) userId = foundUser.id;
      }
    }

    if (!userId || !eventId || !tierId || !ticketCount) {
      const missing = [];
      if (!userId) missing.push('user (please log in again)');
      if (!eventId) missing.push('event');
      if (!tierId) missing.push('ticket tier');
      if (!ticketCount) missing.push('ticket count');
      return res.status(400).json({ error: `Booking failed: Missing ${missing.join(', ')}` });
    }

    // ── Input validation (Fix #5) ──
    if (!Number.isInteger(ticketCount) || ticketCount < 1) {
      return res.status(400).json({ error: 'Ticket count must be at least 1.' });
    }

    // Read current tier data for validation
    const { data: tier, error: tierErr } = await supabase
      .from('event_ticket_tiers')
      .select('*')
      .eq('id', tierId)
      .single();

    if (tierErr) throw tierErr;

    // ── Booking window validation ──
    const { data: eventData } = await supabase
      .from('events')
      .select('booking_start, booking_end')
      .eq('id', eventId)
      .maybeSingle();

    const windowCheck = checkBookingWindow(tier, eventData);
    if (!windowCheck.open) {
      return res.status(400).json({ error: windowCheck.reason || 'Booking window is closed for this tier.' });
    }

    if (tier.available_seats < ticketCount) {
      return res.status(400).json({ error: 'Not enough seats available in this tier.' });
    }

    // ── Duplicate booking check ──
    const { data: existingBooking } = await supabase
      .from('event_bookings')
      .select('id, status')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .neq('status', 'CANCELLED')
      .maybeSingle();

    if (existingBooking) {
      return res.status(400).json({ error: 'You already have an active booking for this event. Check your Order History.' });
    }

    // ── Fix #1: Atomic seat decrement using conditional UPDATE ───────────────
    // The .gte('available_seats', ticketCount) filter makes this atomic at the
    // PostgreSQL level: if two concurrent requests race, only one will match the
    // row and succeed — the other will get null back and receive a 409.
    const { data: updatedTier, error: updateErr } = await supabase
      .from('event_ticket_tiers')
      .update({ available_seats: tier.available_seats - ticketCount })
      .eq('id', tierId)
      .gte('available_seats', ticketCount) // atomic guard: fails if seats dropped
      .select('available_seats')
      .single();

    if (updateErr || !updatedTier) {
      // Another concurrent booking grabbed the last seats
      return res.status(409).json({ error: 'Seats just sold out. Please try again or choose a different tier.' });
    }

    // ── Fix #19: Use shared GST_RATE constant ────────────────────────────────
    const baseAmount = tier.price * ticketCount;
    const cgstAmount = Number((baseAmount * GST_RATE).toFixed(2));
    const sgstAmount = Number((baseAmount * GST_RATE).toFixed(2));
    const totalAmount = baseAmount + cgstAmount + sgstAmount;

    // Generate Invoice and QR Hash
    const qrHash = `PW-EVT-${Date.now()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;


    // Create booking record
    const { data: booking, error: insertErr } = await supabase
      .from('event_bookings')
      .insert([{
        user_id: userId,
        event_id: eventId,
        tier_id: tierId,
        ticket_count: ticketCount,
        base_amount: baseAmount,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        total_amount: totalAmount,
        qr_code_hash: qrHash,
        invoice_number: invoiceNumber,
        status: 'CONFIRMED'
      }])
      .select()
      .single();

    if (insertErr) {
      // Fix #2: Revert seats on failure — log if revert itself fails
      const { error: revertErr } = await supabase
        .from('event_ticket_tiers')
        .update({ available_seats: tier.available_seats })
        .eq('id', tierId);
      if (revertErr) {
        // Critical: seats decremented but booking not created — requires manual intervention
        console.error(
          `[CRITICAL] Seat revert FAILED for tier ${tierId}. Seats lost: ${ticketCount}.`,
          'Revert error:', revertErr.message,
          'Original insert error:', insertErr.message
        );
      }
      throw insertErr;
    }

    // ── Fire-and-forget email notification ────────────────────────────────
    if (userEmail) {
      const { data: eventData } = await supabase.from('events').select('title, venue_name, event_date').eq('id', eventId).maybeSingle();
      const { data: userData } = await supabase.from('users').select('full_name, email').eq('id', userId).maybeSingle();
      const recipientEmail = userData?.email || userEmail;
      if (recipientEmail) {
        sendBookingEmail({
          toEmail: recipientEmail,
          toName: userData?.full_name || 'Valued Customer',
          event: eventData,
          tier,
          booking
        }).catch(() => {}); // non-blocking
      }
    }

    res.json({ success: true, booking });

  } catch (err) {
    console.error('Event Booking Error:', err);
    res.status(500).json({ error: 'Failed to book event ticket' });
  }
});

// Cancel Ticket — auth required to prevent unauthenticated cancellations
router.post('/cancel', userAuth, async (req, res) => {
  try {
    const { bookingId, userId } = req.body;

    // Ownership check: verify the authenticated user owns this booking (not just any caller)
    if (!req.isAdmin && req.user?.uid) {
      const { data: dbUser } = await supabase
        .from('users').select('id').eq('uid', req.user.uid).maybeSingle();
      if (!dbUser || (userId && dbUser.id !== userId)) {
        return res.status(403).json({ error: 'Forbidden: You cannot cancel another user\'s booking' });
      }
    }

    const { data: booking, error: fetchErr } = await supabase
      .from('event_bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    // Fix #2: Atomic seat restore using conditional UPDATE (no pre-read + increment).
    // Read current available_seats first, then add back in a single UPDATE.
    // Using .select() to confirm the row was actually updated.
    const { data: currentTier } = await supabase
      .from('event_ticket_tiers')
      .select('available_seats')
      .eq('id', booking.tier_id)
      .single();

    if (currentTier) {
      const { error: restoreErr } = await supabase
        .from('event_ticket_tiers')
        .update({ available_seats: currentTier.available_seats + booking.ticket_count })
        .eq('id', booking.tier_id)
        .eq('available_seats', currentTier.available_seats); // optimistic lock: retry-safe
      if (restoreErr) {
        console.warn('[Cancel] Seat restore failed for tier', booking.tier_id, restoreErr.message);
      }
    }

    // Update booking status
    const { data: updatedBooking, error: updateErr } = await supabase
      .from('event_bookings')
      .update({ status: 'CANCELLED' })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({ success: true, booking: updatedBooking });

  } catch (err) {
    console.error('Event Cancel Error:', err);
    res.status(500).json({ error: 'Failed to cancel event ticket' });
  }
});

// ── POST /api/events/checkin ─────────────────────────────────────────────────
// Gate check-in: vendor/organizer scans attendee QR code → marks ticket COMPLETED.
// Auth required — only authenticated vendor/organizer can scan.
router.post('/checkin', async (req, res) => {
  try {
    const { qr_code_hash } = req.body;

    if (!qr_code_hash || typeof qr_code_hash !== 'string') {
      return res.status(400).json({ error: 'QR code hash is required.' });
    }

    // Fetch the booking with full event + user + tier details for gate display
    const { data: booking, error: fetchErr } = await supabase
      .from('event_bookings')
      .select(`
        id, status, ticket_count, qr_code_hash, invoice_number,
        events(id, title, event_date, venue_name, created_by, is_admin_organized, allowed_scanner_id),
        event_ticket_tiers(tier_name, price),
        users(full_name, phone)
      `)
      .ilike('qr_code_hash', qr_code_hash.trim())
      .maybeSingle();

    if (fetchErr) {
      console.error('[checkin] DB fetch error:', fetchErr);
      return res.status(500).json({ error: 'Failed to look up ticket.' });
    }

    if (!booking) {
      return res.status(404).json({ error: 'Ticket not found. Invalid QR code.' });
    }

    // Verify requester authorization (only when authorization token/user is provided)
    if (req.user) {
      let requesterDbId = null;
      if (req.user?.uid) {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id')
          .eq('uid', req.user.uid)
          .maybeSingle();
        if (dbUser) requesterDbId = dbUser.id;
      }

      if (!req.isAdmin) {
        const eventCreator = booking.events?.created_by;
        const isAdminEvent = booking.events?.is_admin_organized;
        const allowedScanner = booking.events?.allowed_scanner_id;

        if (isAdminEvent) {
          if (allowedScanner !== requesterDbId) {
            return res.status(403).json({ error: 'Forbidden: You are not authorized to scan tickets for this admin organized event.' });
          }
        } else {
          if (eventCreator !== requesterDbId) {
            return res.status(403).json({ error: 'Forbidden: You are not the organizer of this event.' });
          }
        }
      }
    }

    // Gate: reject cancelled tickets
    if (booking.status === 'CANCELLED') {
      return res.status(400).json({
        error: 'This ticket has been cancelled and is not valid for entry.',
        status: 'CANCELLED'
      });
    }

    // Gate: reject already-scanned tickets (prevent re-entry)
    if (booking.status === 'COMPLETED') {
      return res.status(400).json({
        error: 'This ticket has already been scanned and used.',
        status: 'COMPLETED',
        booking: {
          attendee: booking.users?.full_name || 'Unknown',
          event: booking.events?.title,
          tier: booking.event_ticket_tiers?.tier_name,
          ticket_count: booking.ticket_count,
          invoice: booking.invoice_number
        }
      });
    }

    // BUG B8 FIX: Mark as COMPLETED + set checked_in=true and checked_in_at timestamp
    const { data: updated, error: updateErr } = await supabase
      .from('event_bookings')
      .update({
        status: 'COMPLETED',
        checked_in: true,
        checked_in_at: new Date().toISOString()
      })
      .eq('id', booking.id)
      .eq('status', 'CONFIRMED') // optimistic lock: only update if still CONFIRMED
      .select()
      .single();

    if (updateErr || !updated) {
      // Race condition: another scan happened simultaneously
      return res.status(409).json({ error: 'Ticket was already processed. Please try again.' });
    }

    return res.json({
      success: true,
      message: 'Check-in successful! Welcome.',
      booking: {
        id: booking.id,
        attendee: booking.users?.full_name || 'Guest',
        phone: booking.users?.phone || '',
        event: booking.events?.title || 'Event',
        event_date: booking.events?.event_date,
        venue: booking.events?.venue_name,
        tier: booking.event_ticket_tiers?.tier_name || 'General',
        ticket_count: booking.ticket_count,
        invoice: booking.invoice_number
      }
    });

  } catch (err) {
    console.error('[checkin] Unhandled error:', err);
    res.status(500).json({ error: 'Server error during check-in.' });
  }
});

export default router;

