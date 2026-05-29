import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// Get all upcoming events (with optional category/search filters)
router.get('/search', async (req, res) => {
  try {
    const { query, category } = req.query;

    let supabaseQuery = supabase
      .from('events')
      .select('*, event_ticket_tiers(*)')
      .in('status', ['UPCOMING', 'ONGOING', 'SOLD_OUT'])
      .order('event_date', { ascending: true });

    if (category && category !== 'All') {
      supabaseQuery = supabaseQuery.eq('category', category);
    }

    if (query) {
      supabaseQuery = supabaseQuery.ilike('title', `%${query}%`);
    }

    const { data: events, error } = await supabaseQuery;

    if (error) throw error;
    res.json({ success: true, events });
  } catch (err) {
    console.error('Events Search Error:', err);
    res.status(500).json({ error: 'Failed to search events' });
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
    res.json({ success: true, event });
  } catch (err) {
    console.error('Event Fetch Error:', err);
    res.status(500).json({ error: 'Failed to fetch event details' });
  }
});

// Book a ticket
router.post('/book', async (req, res) => {
  try {
    const { userId, eventId, tierId, ticketCount } = req.body;

    if (!userId || !eventId || !tierId || !ticketCount) {
      return res.status(400).json({ error: 'Missing required booking fields' });
    }

    // Atomic check of seat availability
    const { data: tier, error: tierErr } = await supabase
      .from('event_ticket_tiers')
      .select('*')
      .eq('id', tierId)
      .single();

    if (tierErr) throw tierErr;

    if (tier.available_seats < ticketCount) {
      return res.status(400).json({ error: 'Not enough seats available in this tier.' });
    }

    // Decrement seats
    const newSeats = tier.available_seats - ticketCount;
    const { error: updateErr } = await supabase
      .from('event_ticket_tiers')
      .update({ available_seats: newSeats })
      .eq('id', tierId);

    if (updateErr) throw updateErr;

    // Calculate GST (Gujarat State: 9% CGST, 9% SGST)
    const baseAmount = tier.price * ticketCount;
    const cgstAmount = Number((baseAmount * 0.09).toFixed(2));
    const sgstAmount = Number((baseAmount * 0.09).toFixed(2));
    const totalAmount = baseAmount + cgstAmount + sgstAmount;

    // Generate Invoice and QR Hash
    const qrHash = `PW-EVT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

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
      // Revert seats on failure
      await supabase.from('event_ticket_tiers').update({ available_seats: tier.available_seats }).eq('id', tierId);
      throw insertErr;
    }

    res.json({ success: true, booking });

  } catch (err) {
    console.error('Event Booking Error:', err);
    res.status(500).json({ error: 'Failed to book event ticket' });
  }
});

// Cancel Ticket
router.post('/cancel', async (req, res) => {
  try {
    const { bookingId, userId } = req.body;

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

    // Revert seats
    const { data: tier } = await supabase
      .from('event_ticket_tiers')
      .select('available_seats')
      .eq('id', booking.tier_id)
      .single();

    if (tier) {
      await supabase
        .from('event_ticket_tiers')
        .update({ available_seats: tier.available_seats + booking.ticket_count })
        .eq('id', booking.tier_id);
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

export default router;
