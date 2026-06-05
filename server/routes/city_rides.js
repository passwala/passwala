import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

// Define Ahmedabad bounding box for basic geo-fencing validation
const AHMEDABAD_BOUNDS = {
  minLat: 22.9,
  maxLat: 23.25,
  minLng: 72.4,
  maxLng: 72.7
};

function isWithinAhmedabad(lat, lng) {
  return (
    lat >= AHMEDABAD_BOUNDS.minLat &&
    lat <= AHMEDABAD_BOUNDS.maxLat &&
    lng >= AHMEDABAD_BOUNDS.minLng &&
    lng <= AHMEDABAD_BOUNDS.maxLng
  );
}

// 1. Search for a route and available vehicles
router.get('/search', async (req, res) => {
  try {
    const { pickupLat, pickupLng, dropLat, dropLng } = req.query;

    if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
      return res.status(400).json({ error: 'Pickup and drop coordinates are required' });
    }

    if (!isWithinAhmedabad(parseFloat(pickupLat), parseFloat(pickupLng)) || 
        !isWithinAhmedabad(parseFloat(dropLat), parseFloat(dropLng))) {
      return res.status(400).json({ error: 'Passwala City Rides are strictly available within Ahmedabad city limits only.' });
    }

    // Since this is area-to-area, we fetch predefined routes for calculation or dynamic pricing
    const { data: routes, error: routeErr } = await supabase
      .from('city_routes')
      .select('*')
      .eq('is_active', true);
      
    if (routeErr) throw routeErr;

    // Fetch active vehicles with available seats
    const { data: vehicles, error: vehicleErr } = await supabase
      .from('city_vehicles')
      .select('*')
      .eq('is_active', true)
      .gt('available_seats', 0);

    if (vehicleErr) throw vehicleErr;

    // Dynamic routing approximation (Using Haversine formula for straight-line distance)
    const pLat = parseFloat(pickupLat);
    const pLng = parseFloat(pickupLng);
    const dLat = parseFloat(dropLat);
    const dLng = parseFloat(dropLng);

    const R = 6371; // km
    const dLatRad = (dLat - pLat) * Math.PI / 180;
    const dLngRad = (dLng - pLng) * Math.PI / 180;
    const a = Math.sin(dLatRad/2) * Math.sin(dLatRad/2) +
              Math.cos(pLat * Math.PI / 180) * Math.cos(dLat * Math.PI / 180) *
              Math.sin(dLngRad/2) * Math.sin(dLngRad/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceKm = R * c;

    // Minimum ride fare is ₹15, plus ₹8 per km
    const estimatedPrice = Math.max(15, Math.ceil(distanceKm * 8));

    res.json({
      success: true,
      distanceKm: distanceKm.toFixed(2),
      estimatedPrice,
      vehicles,
      routes
    });

  } catch (err) {
    console.error('Ride Search Error:', err);
    res.status(500).json({ error: 'Failed to search for rides' });
  }
});

// 2. Book a Ticket
router.post('/book', async (req, res) => {
  try {
    const { 
      userId, 
      vehicleId, 
      pickupLat, 
      pickupLng, 
      dropLat, 
      dropLng, 
      seatCount, 
      totalPrice,
      pickupArea,
      dropArea
    } = req.body;

    if (!userId || !vehicleId || !pickupLat || !dropLat || !seatCount) {
      return res.status(400).json({ error: 'Missing required booking fields' });
    }

    if (!isWithinAhmedabad(parseFloat(pickupLat), parseFloat(pickupLng)) || 
        !isWithinAhmedabad(parseFloat(dropLat), parseFloat(dropLng))) {
      return res.status(400).json({ error: 'Booking denied. Coordinates are outside Ahmedabad limits.' });
    }

    // Atomic decrement of vehicle seats (simulated using Supabase RPC if available, or direct check)
    const { data: vehicle, error: fetchErr } = await supabase
      .from('city_vehicles')
      .select('available_seats, total_seats')
      .eq('id', vehicleId)
      .single();

    if (fetchErr) throw fetchErr;

    if (vehicle.available_seats < seatCount) {
      return res.status(400).json({ error: 'Not enough seats available.' });
    }

    // Decrement seats
    const newSeats = vehicle.available_seats - seatCount;
    const { error: updateErr } = await supabase
      .from('city_vehicles')
      .update({ available_seats: newSeats })
      .eq('id', vehicleId);
      
    if (updateErr) throw updateErr;

    // Generate QR Code hash
    const qrHash = `PW-RIDE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create booking record
    const { data: booking, error: insertErr } = await supabase
      .from('ticket_bookings')
      .insert([{
        user_id: userId,
        vehicle_id: vehicleId,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        drop_lat: dropLat,
        drop_lng: dropLng,
        pickup_area: pickupArea || 'Ahmedabad Location',
        drop_area: dropArea || 'Ahmedabad Destination',
        total_price: totalPrice,
        seat_count: seatCount,
        qr_code_hash: qrHash,
        status: 'CONFIRMED'
      }])
      .select()
      .single();

    if (insertErr) {
      // Revert seats if booking fails
      await supabase.from('city_vehicles').update({ available_seats: vehicle.available_seats }).eq('id', vehicleId);
      throw insertErr;
    }

    res.json({ success: true, booking });

  } catch (err) {
    console.error('Ride Booking Error:', err);
    res.status(500).json({ error: 'Failed to book ticket' });
  }
});

// 3. Cancel Ticket
router.post('/cancel', async (req, res) => {
  try {
    const { bookingId, userId } = req.body;

    const { data: booking, error: fetchErr } = await supabase
      .from('ticket_bookings')
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
    const { data: vehicle } = await supabase
      .from('city_vehicles')
      .select('available_seats')
      .eq('id', booking.vehicle_id)
      .single();

    if (vehicle) {
      await supabase
        .from('city_vehicles')
        .update({ available_seats: vehicle.available_seats + booking.seat_count })
        .eq('id', booking.vehicle_id);
    }

    // Update booking status
    const { data: updatedBooking, error: updateErr } = await supabase
      .from('ticket_bookings')
      .update({ status: 'CANCELLED' })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({ success: true, booking: updatedBooking });

  } catch (err) {
    console.error('Ride Cancel Error:', err);
    res.status(500).json({ error: 'Failed to cancel ticket' });
  }
});

// 4. Get active routes and vehicles
router.get('/routes', async (req, res) => {
  try {
    const { data: routes, error: routeErr } = await supabase
      .from('city_routes')
      .select('*')
      .eq('is_active', true);

    if (routeErr) throw routeErr;

    const { data: vehicles, error: vehicleErr } = await supabase
      .from('city_vehicles')
      .select('*')
      .eq('is_active', true)
      .gt('available_seats', 0);

    if (vehicleErr) throw vehicleErr;

    res.json({ success: true, routes, vehicles });
  } catch (err) {
    console.error('Fetch Routes Error:', err);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

// 5. Get user's ride bookings (for buyer tracking)
router.get('/my-bookings', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data: bookings, error } = await supabase
      .from('ticket_bookings')
      .select(`
        *,
        city_vehicles (
          id,
          driver_id,
          vehicle_type,
          license_plate,
          current_lat,
          current_lng,
          last_location_update
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // For each booking, also fetch rider_locations for real-time driver position
    const enriched = await Promise.all((bookings || []).map(async (booking) => {
      let driverLocation = null;
      const driverId = booking.city_vehicles?.driver_id;
      if (driverId) {
        // Try to find rider record linked to this driver user_id
        const { data: rider } = await supabase
          .from('riders')
          .select('id')
          .eq('user_id', driverId)
          .maybeSingle();

        if (rider?.id) {
          const { data: loc } = await supabase
            .from('rider_locations')
            .select('lat, lng, updated_at')
            .eq('rider_id', rider.id)
            .maybeSingle();

          if (loc) {
            const lastUpdate = new Date(loc.updated_at).getTime();
            const now = Date.now();
            // Only use location if updated within last 5 minutes
            if (now - lastUpdate < 300000) {
              driverLocation = { lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) };
            }
          }
        }

        // Fallback: use city_vehicles current_lat/lng
        if (!driverLocation && booking.city_vehicles?.current_lat && booking.city_vehicles?.current_lng) {
          driverLocation = {
            lat: parseFloat(booking.city_vehicles.current_lat),
            lng: parseFloat(booking.city_vehicles.current_lng)
          };
        }
      }

      return { ...booking, driverLocation };
    }));

    res.json({ success: true, bookings: enriched });
  } catch (err) {
    console.error('Fetch My Bookings Error:', err);
    res.status(500).json({ error: 'Failed to fetch ride bookings' });
  }
});

export default router;

