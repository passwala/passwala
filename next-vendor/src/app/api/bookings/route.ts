import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sports';
    const phone = searchParams.get('phone') || '';
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    if (type === 'sports') {
      let query = supabaseAdmin
        .from('venue_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (cleanPhone) {
        // Find venues belonging to this vendor first
        const { data: venues } = await supabaseAdmin
          .from('sports_venues')
          .select('id')
          .or(`owner_phone.eq.${cleanPhone},owner_phone.eq.+91${cleanPhone}`);

        const venueIds = (venues || []).map(v => v.id);
        if (venueIds.length > 0) {
          query = query.in('venue_id', venueIds);
        } else {
          query = query.or(`user_phone.eq.${cleanPhone},user_phone.eq.+91${cleanPhone}`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ success: true, bookings: data || [] });
    } else {
      let query = supabaseAdmin
        .from('event_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ success: true, bookings: data || [] });
    }
  } catch (err: any) {
    console.error('API GET /api/bookings error:', err);
    return NextResponse.json({ success: false, error: err.message, bookings: [] }, { status: 500 });
  }
}
