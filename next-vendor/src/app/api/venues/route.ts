import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone') || searchParams.get('owner_phone');
    const owner_id = searchParams.get('owner_id');
    const owner_user_id = searchParams.get('owner_user_id');

    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);

    let query = supabaseAdmin
      .from('sports_venues')
      .select('*')
      .order('created_at', { ascending: false });

    if (cleanPhone) {
      query = query.or(`owner_phone.eq.${cleanPhone},owner_phone.eq.+91${cleanPhone}`);
    } else if (owner_id && isUuid(owner_id)) {
      query = query.eq('owner_id', owner_id);
    } else if (owner_user_id && isUuid(owner_user_id)) {
      query = query.eq('owner_user_id', owner_user_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, venues: data || [] });
  } catch (err: any) {
    console.error('API GET /api/venues error:', err);
    return NextResponse.json({ success: false, error: err.message, venues: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      sport_types,
      address,
      city,
      lat,
      lng,
      owner_id,
      owner_user_id,
      owner_name,
      owner_phone,
      price_per_hour,
      images,
      amenities,
      open_time,
      close_time,
      slot_duration_mins,
      status
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Venue name is required' }, { status: 400 });
    }

    const cleanPhone = (owner_phone || '').replace(/\D/g, '').slice(-10);
    const safeOwnerId = isUuid(owner_id) ? owner_id : null;
    const safeOwnerUserId = isUuid(owner_user_id) ? owner_user_id : null;
    const sports = sport_types && sport_types.length > 0 ? sport_types : ['box_cricket'];

    const defaultImages = images && images.length > 0
      ? images
      : ['https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80'];

    const { data: newVenue, error } = await supabaseAdmin
      .from('sports_venues')
      .insert({
        name: name.trim(),
        description: description || `Premium sports arena located in ${address || city || 'Ahmedabad'}. Available for hourly slot bookings.`,
        sport_types: sports,
        address: address || 'Ahmedabad',
        city: city || 'Ahmedabad',
        lat: lat || 23.0225,
        lng: lng || 72.5714,
        owner_id: safeOwnerId,
        owner_user_id: safeOwnerUserId,
        owner_name: owner_name || 'Partner',
        owner_phone: cleanPhone || owner_phone || '',
        price_per_hour: price_per_hour || { [sports[0]]: 400 },
        images: defaultImages,
        amenities: amenities || ['parking', 'washroom', 'drinking_water'],
        open_time: open_time || '06:00',
        close_time: close_time || '23:00',
        slot_duration_mins: slot_duration_mins || 60,
        status: status || 'approved'
      })
      .select()
      .single();

    if (error) throw error;

    // Generate slots for today in venue_slots
    if (newVenue?.id) {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const slotsPayload = [];
        for (const sp of sports) {
          const price = (price_per_hour && price_per_hour[sp]) || 400;
          for (let h = 6; h <= 23; h++) {
            const startT = `${String(h).padStart(2, '0')}:00`;
            const endT = `${String(h + 1).padStart(2, '0')}:00`;
            slotsPayload.push({
              venue_id: newVenue.id,
              sport_type: sp,
              slot_date: todayStr,
              slot_time: startT,
              slot_end_time: endT,
              status: 'available',
              price
            });
          }
        }
        await supabaseAdmin.from('venue_slots').upsert(slotsPayload, {
          onConflict: 'venue_id,sport_type,slot_date,slot_time',
          ignoreDuplicates: true
        });
      } catch (slotErr) {
        console.warn('Auto slots generation warning:', slotErr);
      }
    }

    // Ensure store record exists so vendor context recognizes account
    if (cleanPhone) {
      try {
        const { data: existingStore } = await supabaseAdmin
          .from('stores')
          .select('id')
          .or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone}`)
          .maybeSingle();

        if (!existingStore) {
          await supabaseAdmin.from('stores').insert({
            business_name: name.trim(),
            name: name.trim(),
            business_type: 'sports',
            address: address || 'Ahmedabad',
            city: city || 'Ahmedabad',
            phone: cleanPhone,
            status: 'approved',
            is_active: true
          });
        }
      } catch (storeErr) {
        console.warn('Auto store creation warning:', storeErr);
      }
    }

    return NextResponse.json({ success: true, venue: newVenue });
  } catch (err: any) {
    console.error('API POST /api/venues error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
