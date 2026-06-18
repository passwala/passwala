import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
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

async function getActiveVehicles() {
  try {
    // 1. Fetch active riders
    const { data: activeRiders, error: riderErr } = await supabase
      .from('riders')
      .select('id, user_id, vehicle_no, rating')
      .eq('is_active', true);
    
    if (riderErr) throw riderErr;
    if (!activeRiders || activeRiders.length === 0) {
      return [];
    }

    const activeDriverIds = activeRiders.map(r => r.user_id);

    // 2. Find existing vehicles for these drivers
    const { data: existingVehicles, error: vehicleErr } = await supabase
      .from('city_vehicles')
      .select('*')
      .in('driver_id', activeDriverIds);

    if (vehicleErr) throw vehicleErr;

    const existingDriverIds = (existingVehicles || []).map(v => v.driver_id);
    const vehiclesMap = {};
    (existingVehicles || []).forEach(v => {
      vehiclesMap[v.driver_id] = v;
    });

    // Fetch all vehicle IDs that currently have an active/pending booking
    const allVehicleIds = (existingVehicles || []).map(v => v.id);
    let busyVehicleIds = new Set();
    if (allVehicleIds.length > 0) {
      const { data: activeBookings } = await supabase
        .from('ticket_bookings')
        .select('vehicle_id')
        .in('vehicle_id', allVehicleIds)
        .eq('status', 'CONFIRMED')
        .not('vehicle_id', 'is', null);
      (activeBookings || []).forEach(b => busyVehicleIds.add(b.vehicle_id));
    }

    for (const rider of activeRiders) {
      if (!existingDriverIds.includes(rider.user_id)) {
        // Create a vehicle entry
        const { data: newVehicle, error: createErr } = await supabase
          .from('city_vehicles')
          .insert({
            driver_id: rider.user_id,
            vehicle_type: 'Bike',
            license_plate: rider.vehicle_no || 'GJ01-PW-0000',
            total_seats: 1,
            available_seats: 1,
            is_active: true
          })
          .select()
          .single();
        
        if (!createErr && newVehicle) {
          vehiclesMap[rider.user_id] = newVehicle;
        }
      } else {
        // Ensure existing vehicle is active and is a Bike with 1 seat
        // BUT do NOT reset available_seats if vehicle is currently busy with a booking
        const vehicle = vehiclesMap[rider.user_id];
        const isBusy = busyVehicleIds.has(vehicle.id);
        if (!vehicle.is_active || vehicle.vehicle_type !== 'Bike' || vehicle.total_seats !== 1) {
          // Only reset available_seats to 1 if the vehicle is NOT currently busy
          const newAvailableSeats = isBusy ? 0 : 1;
          const { data: updatedVehicle } = await supabase
            .from('city_vehicles')
            .update({ 
              is_active: true,
              vehicle_type: 'Bike',
              total_seats: 1,
              available_seats: newAvailableSeats
            })
            .eq('id', vehicle.id)
            .select()
            .single();
          if (updatedVehicle) {
            vehiclesMap[rider.user_id] = updatedVehicle;
          }
        } else if (!isBusy && vehicle.available_seats === 0) {
          // Vehicle is not busy but seats are 0 - reset to 1 (stale state)
          const { data: updatedVehicle } = await supabase
            .from('city_vehicles')
            .update({ available_seats: 1 })
            .eq('id', vehicle.id)
            .select()
            .single();
          if (updatedVehicle) {
            vehiclesMap[rider.user_id] = updatedVehicle;
          }
        }
      }
    }

    // 3. Fetch current locations from rider_locations
    const riderIds = activeRiders.map(r => r.id);
    const { data: locations } = await supabase
      .from('rider_locations')
      .select('rider_id, lat, lng')
      .in('rider_id', riderIds);

    const locationMap = {};
    (locations || []).forEach(loc => {
      locationMap[loc.rider_id] = { lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) };
    });

    const riderToDriverMap = {};
    activeRiders.forEach(r => {
      riderToDriverMap[r.user_id] = r.id;
    });

    // 4. Return enriched active vehicles
    return Object.values(vehiclesMap)
      .filter(v => v.is_active && v.available_seats > 0)
      .map(vehicle => {
        const riderId = riderToDriverMap[vehicle.driver_id];
        const loc = riderId ? locationMap[riderId] : null;
        return {
          ...vehicle,
          current_lat: loc ? loc.lat : vehicle.current_lat,
          current_lng: loc ? loc.lng : vehicle.current_lng
        };
      });
  } catch (err) {
    console.error('Error in getActiveVehicles:', err);
    return [];
  }
}

// 1. Search for a route and available vehicles
router.get('/search', async (req, res) => {
  try {
    const { pickupLat, pickupLng, dropLat, dropLng, pricePerKm } = req.query;

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

    // Fetch active vehicles with available seats synced from active riders
    const vehicles = await getActiveVehicles();

    const pLat = parseFloat(pickupLat);
    const pLng = parseFloat(pickupLng);
    const dLat = parseFloat(dropLat);
    const dLng = parseFloat(dropLng);

    let distanceKm = 0;
    try {
      const osrmRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=false`,
        {
          headers: {
            'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)'
          }
        }
      );
      const osrmData = await osrmRes.json();
      if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes.length > 0) {
        distanceKm = osrmData.routes[0].distance / 1000;
      }
    } catch (e) {
      console.error('OSRM route fetch error on server, falling back to Haversine:', e);
    }

    if (distanceKm === 0) {
      // Dynamic routing approximation (Using Haversine formula for straight-line distance)
      const R = 6371; // km
      const dLatRad = (dLat - pLat) * Math.PI / 180;
      const dLngRad = (dLng - pLng) * Math.PI / 180;
      const a = Math.sin(dLatRad/2) * Math.sin(dLatRad/2) +
                Math.cos(pLat * Math.PI / 180) * Math.cos(dLat * Math.PI / 180) *
                Math.sin(dLngRad/2) * Math.sin(dLngRad/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      distanceKm = R * c;
    }


    // Minimum ride fare is ₹15, plus dynamic rate per km (default ₹8)
    // Short rides (≤ 2 km) use a flat fare set by admin (default ₹30)
    let ratePerKm = 8;
    let shortRidePrice = 30; // flat fare for 1-2 km rides
    try {
      const settingsPath = process.cwd().endsWith('server')
        ? path.join(process.cwd(), 'platform_settings.json')
        : path.join(process.cwd(), 'server', 'platform_settings.json');
      const rawData = await fs.readFile(settingsPath, 'utf8');
      const settings = JSON.parse(rawData);
      if (settings?.ridePricePerKm !== undefined) ratePerKm = parseFloat(settings.ridePricePerKm);
      if (settings?.shortRidePrice !== undefined) shortRidePrice = parseFloat(settings.shortRidePrice);
    } catch (e) {
      ratePerKm = parseFloat(pricePerKm) || 8;
    }

    // Apply flat short-ride fare for ≤ 2 km, otherwise standard per-km pricing
    const estimatedPrice = distanceKm <= 2
      ? Math.max(15, shortRidePrice)
      : Math.max(15, Math.ceil(distanceKm * ratePerKm));

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
      dropArea,
      luggageWeight,
      luggagePrice
    } = req.body;

    if (!userId || !vehicleId || !pickupLat || !dropLat || !seatCount) {
      return res.status(400).json({ error: 'Missing required booking fields' });
    }

    if (!isWithinAhmedabad(parseFloat(pickupLat), parseFloat(pickupLng)) || 
        !isWithinAhmedabad(parseFloat(dropLat), parseFloat(dropLng))) {
      return res.status(400).json({ error: 'Booking denied. Coordinates are outside Ahmedabad limits.' });
    }

    // Resolve userId to Supabase UUID id if it is a Firebase uid or phone format
    let targetUserId = userId;
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (!isUserUuid) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('uid', userId)
        .maybeSingle();

      if (dbUser) {
        targetUserId = dbUser.id;
      } else {
        if (String(userId).startsWith('phone-')) {
          const cleanPhone = String(userId).replace('phone-', '');
          const { data: dbUserByPhone } = await supabase
            .from('users')
            .select('id')
            .eq('phone', cleanPhone)
            .maybeSingle();
          if (dbUserByPhone) {
            targetUserId = dbUserByPhone.id;
          }
        }
      }
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vehicleId);
    if (!isUuid) {
      const { data: activeVehicles } = await supabase
        .from('city_vehicles')
        .select('id')
        .eq('is_active', true)
        .limit(1);
      
      if (!(activeVehicles && activeVehicles.length > 0)) {
        const { data: anyVehicles } = await supabase
          .from('city_vehicles')
          .select('id')
          .limit(1);
        if (!(anyVehicles && anyVehicles.length > 0)) {
          return res.status(400).json({ error: 'No active vehicles are available in the city.' });
        }
      }
    }

    // Generate QR Code hash
    const qrHash = `PW-RIDE-${Date.now()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

    // Create booking record
    const { data: booking, error: insertErr } = await supabase
      .from('ticket_bookings')
      .insert([{
        user_id: targetUserId,
        vehicle_id: null,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        drop_lat: dropLat,
        drop_lng: dropLng,
        pickup_area: pickupArea || 'Ahmedabad Location',
        drop_area: dropArea || 'Ahmedabad Destination',
        total_price: totalPrice,
        seat_count: seatCount,
        qr_code_hash: qrHash,
        status: 'CONFIRMED',
        seat_numbers: { 
          luggage_weight: luggageWeight || 0, 
          luggage_price: luggagePrice || 0,
          ride_stage: 'PENDING'
        }
      }])
      .select()
      .single();

    if (insertErr) throw insertErr;

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

    // Resolve non-UUID userId before querying
    let resolvedUserId = userId;
    if (userId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      if (!isUuid) {
        const { data: byUid } = await supabase.from('users').select('id').eq('uid', userId).maybeSingle();
        if (byUid) {
          resolvedUserId = byUid.id;
        } else if (String(userId).startsWith('phone-')) {
          const cleanPhone = String(userId).replace('phone-', '');
          const { data: byPhone } = await supabase.from('users').select('id').eq('phone', cleanPhone).maybeSingle();
          if (byPhone) resolvedUserId = byPhone.id;
        }
      }
    }

    const { data: booking, error: fetchErr } = await supabase
      .from('ticket_bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('user_id', resolvedUserId)
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

    const vehicles = await getActiveVehicles();

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

    // Resolve non-UUID identifiers (phone-XXXXXXXX or Firebase UID) to Supabase UUID
    let resolvedUserId = userId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (!isUuid) {
      // Try by Firebase UID
      const { data: byUid } = await supabase
        .from('users').select('id').eq('uid', userId).maybeSingle();
      if (byUid) {
        resolvedUserId = byUid.id;
      } else if (String(userId).startsWith('phone-')) {
        // phone-XXXXXXXXXX format
        const cleanPhone = String(userId).replace('phone-', '');
        const { data: byPhone } = await supabase
          .from('users').select('id').eq('phone', cleanPhone).maybeSingle();
        if (byPhone) resolvedUserId = byPhone.id;
      }
      // If still not resolved to a UUID, return empty — don't crash Postgres
      const isNowUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedUserId);
      if (!isNowUuid) {
        return res.json({ success: true, bookings: [] });
      }
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
      .eq('user_id', resolvedUserId)
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

// 6. Get active ride booking for a driver
router.get('/active-ride', async (req, res) => {
  try {
    const { driverId } = req.query;

    if (!driverId) {
      return res.status(400).json({ error: 'driverId is required' });
    }

    // Get the vehicle for this driver
    let { data: vehicle, error: vehErr } = await supabase
      .from('city_vehicles')
      .select('id')
      .eq('driver_id', driverId)
      .maybeSingle();

    if (vehErr) throw vehErr;
    
    // Auto-create vehicle if missing so active rides can load properly
    if (!vehicle) {
      const { data: rider } = await supabase
        .from('riders')
        .select('*')
        .eq('user_id', driverId)
        .maybeSingle();
        
      if (rider) {
        const { data: newVehicle, error: createErr } = await supabase
          .from('city_vehicles')
          .insert({
            driver_id: driverId,
            vehicle_type: 'Bike',
            license_plate: rider.vehicle_no || 'GJ01-PW-0000',
            total_seats: 1,
            available_seats: 1,
            is_active: true
          })
          .select()
          .single();
          
        if (!createErr && newVehicle) {
          vehicle = newVehicle;
        }
      }
    }

    if (!vehicle) {
      return res.json({ success: true, booking: null });
    }

    // Fetch CONFIRMED ticket bookings for this vehicle
    const { data: bookings, error: bookErr } = await supabase
      .from('ticket_bookings')
      .select('*, users(full_name, phone)')
      .eq('vehicle_id', vehicle.id)
      .eq('status', 'CONFIRMED')
      .order('created_at', { ascending: false });

    if (bookErr) throw bookErr;

    res.json({
      success: true,
      booking: bookings && bookings.length > 0 ? bookings[0] : null
    });

  } catch (err) {
    console.error('Fetch Active Ride Error:', err);
    res.status(500).json({ error: 'Failed to fetch active ride' });
  }
});

// 7. Complete a ride
router.post('/complete', async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    const { data: booking, error: updateErr } = await supabase
      .from('ticket_bookings')
      .update({ status: 'COMPLETED' })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({ success: true, booking });

  } catch (err) {
    console.error('Complete Ride Error:', err);
    res.status(500).json({ error: 'Failed to complete ride' });
  }
});

// 8. Get specific booking status & live driver location
router.get('/booking-status', async (req, res) => {
  try {
    const { bookingId } = req.query;
    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    const { data: booking, error } = await supabase
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
      .eq('id', bookingId)
      .maybeSingle();

    if (error || !booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    let driverLocation = null;
    const driverId = booking.city_vehicles?.driver_id;
    if (driverId) {
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
          if (now - lastUpdate < 900000) {
            driverLocation = { lat: parseFloat(loc.lat), lng: parseFloat(loc.lng) };
          }
        }
      }

      if (!driverLocation && booking.city_vehicles?.current_lat && booking.city_vehicles?.current_lng) {
        driverLocation = {
          lat: parseFloat(booking.city_vehicles.current_lat),
          lng: parseFloat(booking.city_vehicles.current_lng)
        };
      }
    }

    res.json({
      success: true,
      status: (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') ? booking.status : (booking.seat_numbers?.ride_stage || booking.status),
      driverLocation
    });
  } catch (err) {
    console.error('Booking status fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch booking status' });
  }
});

// 9. Update specific booking status (stored inside seat_numbers JSONB)
router.post('/update-status', async (req, res) => {
  try {
    const { bookingId, status } = req.body;
    if (!bookingId || !status) {
      return res.status(400).json({ error: 'bookingId and status are required' });
    }

    // Allowlist valid ride stage values to prevent state machine corruption
    const ALLOWED_RIDE_STAGES = new Set(['PENDING', 'CONFIRMED', 'PICKED_UP', 'ARRIVED', 'COMPLETED', 'CANCELLED']);
    if (!ALLOWED_RIDE_STAGES.has(status)) {
      return res.status(400).json({ error: `Invalid status "${status}". Must be one of: PENDING, CONFIRMED, PICKED_UP, ARRIVED, COMPLETED, CANCELLED` });
    }

    // First fetch current seat_numbers
    const { data: currentBooking, error: fetchErr } = await supabase
      .from('ticket_bookings')
      .select('seat_numbers')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !currentBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const updatedSeatNumbers = {
      ...(currentBooking.seat_numbers || {}),
      ride_stage: status
    };

    const updatePayload = { seat_numbers: updatedSeatNumbers };
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      updatePayload.status = status;
    }

    const { data: booking, error: updateErr } = await supabase
      .from('ticket_bookings')
      .update(updatePayload)
      .eq('id', bookingId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({ success: true, booking });
  } catch (err) {
    console.error('Update Status Error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Get pending unassigned ride bookings
router.get('/pending-rides', async (req, res) => {
  try {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const { data: bookings, error } = await supabase
      .from('ticket_bookings')
      .select('*, users(full_name, phone)')
      .eq('status', 'CONFIRMED')
      .is('vehicle_id', null)
      .gt('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Extra safety: filter to only those with ride_stage PENDING in the JSONB
    const pendingBookings = (bookings || []).filter(b => {
      const stage = b.seat_numbers?.ride_stage;
      return !stage || stage === 'PENDING';
    });

    res.json({ success: true, bookings: pendingBookings });
  } catch (err) {
    console.error('Fetch Pending Rides Error:', err);
    res.status(500).json({ error: 'Failed to fetch pending rides' });
  }
});

// Claim a ride booking
router.post('/claim', async (req, res) => {
  try {
    const { bookingId, vehicleId } = req.body;
    if (!bookingId || !vehicleId) {
      return res.status(400).json({ error: 'bookingId and vehicleId are required' });
    }

    // First fetch current booking
    const { data: currentBooking, error: fetchErr } = await supabase
      .from('ticket_bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchErr || !currentBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (currentBooking.vehicle_id !== null) {
      return res.status(400).json({ error: 'Ride already claimed by another driver' });
    }

    // Update vehicle_id and ride_stage to CONFIRMED
    const updatedSeatNumbers = {
      ...(currentBooking.seat_numbers || {}),
      ride_stage: 'CONFIRMED'
    };

    const { data: booking, error: updateErr } = await supabase
      .from('ticket_bookings')
      .update({
        vehicle_id: vehicleId,
        seat_numbers: updatedSeatNumbers
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({ success: true, booking });
  } catch (err) {
    console.error('Claim Booking Error:', err);
    res.status(500).json({ error: 'Failed to claim booking' });
  }
});

// Release/Reject a claimed ride booking
router.post('/release', async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    // First fetch current booking
    const { data: currentBooking, error: fetchErr } = await supabase
      .from('ticket_bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchErr || !currentBooking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const updatedSeatNumbers = {
      ...(currentBooking.seat_numbers || {}),
      ride_stage: 'PENDING'
    };

    const { data: booking, error: updateErr } = await supabase
      .from('ticket_bookings')
      .update({
        vehicle_id: null,
        seat_numbers: updatedSeatNumbers
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({ success: true, booking });
  } catch (err) {
    console.error('Release Booking Error:', err);
    res.status(500).json({ error: 'Failed to release booking' });
  }
});

// Get ALL ride bookings for a driver (rider-side history view — bypasses RLS)
router.get('/driver-bookings', async (req, res) => {
  try {
    const { driverId } = req.query;
    if (!driverId) {
      return res.status(400).json({ error: 'driverId is required' });
    }

    // Resolve to Supabase users.id UUID if necessary
    let resolvedUserId = driverId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(driverId);
    if (!isUUID) {
      const { data: usr } = await supabase
        .from('users')
        .select('id')
        .eq('uid', driverId)
        .maybeSingle();
      if (usr) resolvedUserId = usr.id;
    }

    // Get vehicle IDs for this driver
    const { data: vehicles } = await supabase
      .from('city_vehicles')
      .select('id')
      .eq('driver_id', resolvedUserId);

    if (!vehicles || vehicles.length === 0) {
      return res.json({ success: true, bookings: [] });
    }

    const vehicleIds = vehicles.map(v => v.id);

    // Fetch all ticket_bookings for these vehicles (service-role bypasses RLS)
    const { data: bookings, error } = await supabase
      .from('ticket_bookings')
      .select('*')
      .in('vehicle_id', vehicleIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, bookings: bookings || [] });
  } catch (err) {
    console.error('Driver Bookings Fetch Error:', err);
    res.status(500).json({ error: 'Failed to fetch driver bookings' });
  }
});

// Driver update booking status (complete/cancel) — bypasses RLS
router.post('/driver-update-status', async (req, res) => {
  try {
    const { bookingId, status } = req.body;
    if (!bookingId || !status) {
      return res.status(400).json({ error: 'bookingId and status are required' });
    }

    const ALLOWED_DRIVER_STATUSES = new Set(['COMPLETED', 'CANCELLED']);
    if (!ALLOWED_DRIVER_STATUSES.has(status)) {
      return res.status(400).json({ error: `Invalid status "${status}". Allowed: COMPLETED, CANCELLED` });
    }

    const { data: booking, error } = await supabase
      .from('ticket_bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw error;

    // If completed, free up the vehicle seat
    if (status === 'COMPLETED' && booking?.vehicle_id) {
      await supabase
        .from('city_vehicles')
        .update({ available_seats: 1 })
        .eq('id', booking.vehicle_id);
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error('Driver Update Status Error:', err);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

export default router;

