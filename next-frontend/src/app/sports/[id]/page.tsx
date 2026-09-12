'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, ArrowLeft, Calendar, Loader2, ChevronLeft, ChevronRight, Clock, Info, Check, Share2, Trophy } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { processRazorpayPayment } from '@/lib/razorpay';

const API = 'http://127.0.0.1:3004';

const SPORT_TYPES: Record<string, { label: string, emoji: string }> = {
  box_cricket: { label: 'Box Cricket', emoji: '🏏' },
  badminton: { label: 'Badminton', emoji: '🏸' },
  turf: { label: 'Football Turf', emoji: '⚽' },
  cricket_net: { label: 'Cricket Net', emoji: '🎯' },
  pickleball: { label: 'Pickleball', emoji: '🥒' },
  table_tennis: { label: 'Table Tennis', emoji: '🏓' },
  padel: { label: 'Padel', emoji: '🎾' },
  tennis: { label: 'Tennis', emoji: '🎾' },
  snooker: { label: 'Snooker', emoji: '🎱' },
  pool: { label: 'Pool / Billiards', emoji: '🎱' },
  cricket: { label: 'Cricket', emoji: '🏏' },
};

const getNext7Days = () => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      dateStr: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: d.getDate(),
    });
  }
  return days;
};

const formatTime12 = (timeStr: string) => {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}${parseInt(mStr) ? ':' + mStr : ''} ${ampm}`;
};

export default function SportsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, openLogin } = useAuthContext();
  
  const [venue, setVenue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState<string | null>(null);
  const [imgIdx, setImgIdx] = useState(0);
  
  const days = useMemo(() => getNext7Days(), []);
  const [date, setDate] = useState(days[0].dateStr);
  
  const [slots, setSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<any[]>([]);
  
  const [bookingDuration, setBookingDuration] = useState(1);
  const [timeOfDayFilter, setTimeOfDayFilter] = useState('all');
  const [bookingLoading, setBookingLoading] = useState(false);

  // 1. Fetch Venue
  useEffect(() => {
    fetch(`${API}/api/sports/venues/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setVenue(d.venue);
          setSport(d.venue.sport_types?.[0] || 'box_cricket');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  // 2. Fetch Slots
  useEffect(() => {
    if (!id || !date || !sport) return;
    setSlotsLoading(true);
    setSelectedSlots([]);
    fetch(`${API}/api/sports/slots?venue_id=${id}&date=${date}&sport=${sport}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setSlots(d.slots || []);
        else setSlots([]);
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [id, date, sport]);

  // 3. Reset selected when duration changes
  useEffect(() => {
    setSelectedSlots([]);
  }, [bookingDuration]);

  // Virtual Merged Slots Logic
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const activeSlots = useMemo(() => {
    const isToday = date === getTodayStr();
    if (!isToday) return slots;
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
    return slots.filter(s => s.slot_time >= currentTimeStr);
  }, [slots, date]);

  const combinedSlots = useMemo(() => {
    if (bookingDuration === 1) return activeSlots;

    const result = [];
    const sorted = [...activeSlots].sort((a, b) => a.slot_time.localeCompare(b.slot_time));

    for (let i = 0; i <= sorted.length - bookingDuration; i++) {
      let isContiguousAvailable = true;
      const group = [];
      
      for (let j = 0; j < bookingDuration; j++) {
        const currentSlot = sorted[i + j];
        if (currentSlot.status !== 'available') {
          isContiguousAvailable = false;
          break;
        }
        if (j > 0) {
          const prevSlot = group[j - 1];
          const prevEnd = prevSlot.slot_end_time?.slice(0, 5) || prevSlot.end_time?.slice(0, 5);
          const currStart = currentSlot.slot_time?.slice(0, 5) || currentSlot.start_time?.slice(0, 5);
          if (prevEnd !== currStart) {
            isContiguousAvailable = false;
            break;
          }
        }
        group.push(currentSlot);
      }

      if (isContiguousAvailable) {
        const first = group[0];
        const last = group[group.length - 1];
        const totalPrice = group.reduce((sum, s) => sum + (s.price || 0), 0);
        
        result.push({
          id: `virtual_${first.id}_to_${last.id}`,
          slot_time: first.slot_time || first.start_time,
          slot_end_time: last.slot_end_time || last.end_time,
          price: totalPrice,
          status: 'available',
          slot_date: first.slot_date,
          slots: group
        });
      }
    }
    return result;
  }, [activeSlots, bookingDuration]);

  const filteredCombinedSlots = useMemo(() => {
    if (timeOfDayFilter === 'all') return combinedSlots;
    return combinedSlots.filter(slot => {
      const startHour = parseInt((slot.slot_time || slot.start_time).split(':')[0]);
      if (timeOfDayFilter === 'morning') return startHour >= 6 && startHour < 12;
      if (timeOfDayFilter === 'evening') return startHour >= 12 && startHour < 18;
      if (timeOfDayFilter === 'night') return startHour >= 18 || startHour < 6;
      return true;
    });
  }, [combinedSlots, timeOfDayFilter]);

  const toggleSlot = (s: any) => {
    if (s.status !== 'available') return;
    if (selectedSlots.find(x => x.id === s.id)) {
      setSelectedSlots(prev => prev.filter(x => x.id !== s.id));
    } else {
      setSelectedSlots(prev => [...prev, s]);
    }
  };

  const handleBook = async () => {
    if (!user) {
      toast('Please login to book a slot!', { icon: '🔐' });
      openLogin();
      return;
    }
    if (selectedSlots.length === 0) return;

    setBookingLoading(true);
    let primaryBooking: any = null;

    try {
      const rawSlotIds = new Set<string>();
      selectedSlots.forEach(ss => {
        if (ss.slots) ss.slots.forEach((inner: any) => rawSlotIds.add(inner.id));
        else rawSlotIds.add(ss.id);
      });

      const payload = {
        venue_id: id,
        slot_ids: Array.from(rawSlotIds),
        sport_type: sport,
        user_id: user.id || user.uid,
        user_phone: user.phone || user.phoneNumber,
        user_name: user.name || user.displayName,
        user_email: user.email,
      };

      // Step 1: Create booking on backend
      const res = await fetch(`${API}/api/sports/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      
      if (!data.success) throw new Error(data.error || 'Booking failed');

      primaryBooking = data.booking;
      const allBookings = data.bookings || [primaryBooking];

      // Calculate total amount from bookings
      const totalPayable = allBookings.reduce(
        (sum: number, b: any) => sum + (parseFloat(b.total_amount) || 0),
        0
      );

      // Step 2: If free booking, confirm immediately
      if (totalPayable <= 0) {
        toast.success('🎉 Booking Confirmed!');
        sessionStorage.setItem('passwala_last_sport_ticket', JSON.stringify({
          booking: primaryBooking,
          bookings: allBookings,
          venue,
          slots: selectedSlots,
          sport,
        }));
        setBookingLoading(false);
        router.push('/sports/ticket');
        return;
      }

      // Step 3: Trigger Razorpay test mode payment
      await processRazorpayPayment({
        apiBaseUrl: API,
        amount: totalPayable,
        orderId: allBookings.map((b: any) => b.id),
        orderType: 'sports',
        title: 'Passwala Sports',
        description: `Booking at ${venue.name} (${(sport && SPORT_TYPES[sport]?.label) || sport || 'Sports'})`,
        user: {
          name: user.name || user.displayName,
          email: user.email,
          phone: user.phone || user.phoneNumber,
        },
        onSuccess: () => {
          toast.success('🎉 Payment Verified! Booking Confirmed!');
          sessionStorage.setItem('passwala_last_sport_ticket', JSON.stringify({
            booking: primaryBooking,
            bookings: allBookings,
            venue,
            slots: selectedSlots,
            sport,
          }));
          setBookingLoading(false);
          router.push('/sports/ticket');
        },
        onDismiss: async () => {
          toast('Payment cancelled. Releasing your slot...', { icon: '⚠️' });
          if (primaryBooking?.id) {
            await fetch(`${API}/api/sports/cancel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ booking_id: primaryBooking.id, reason: 'User Cancelled Payment' }),
            }).catch(() => {});
          }
          setBookingLoading(false);
        },
        onError: async (payErr: any) => {
          toast.error(payErr.message || 'Payment verification failed');
          if (primaryBooking?.id) {
            await fetch(`${API}/api/sports/cancel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ booking_id: primaryBooking.id, reason: 'Payment Error' }),
            }).catch(() => {});
          }
          setBookingLoading(false);
        },
      });

    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
      if (primaryBooking?.id) {
        await fetch(`${API}/api/sports/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ booking_id: primaryBooking.id, reason: 'Booking Exception' }),
        }).catch(() => {});
      }
      setBookingLoading(false);
    }
  };


  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: venue?.name, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied!');
      }
    } catch {}
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!venue) {
    return <div className="min-h-screen flex flex-col items-center justify-center"><h3 className="text-xl font-bold text-muted-foreground">Venue not found</h3><Button className="mt-4" onClick={() => router.back()}>Go Back</Button></div>;
  }

  const images = venue.images?.length > 0 ? venue.images : ['https://images.unsplash.com/photo-1540039155733-5bb30b53aa14'];
  const totalAmount = selectedSlots.reduce((sum, s) => sum + (s.price || 0), 0);
  const gst = totalAmount * 0.18;
  const platformFee = totalAmount * 0.05;
  const grandTotal = totalAmount + gst + platformFee;

  return (
    <div className="min-h-screen bg-background pb-32">
      <Toaster position="top-center" />
      
      {/* Hero */}
      <div className="w-full h-[50vh] min-h-[340px] relative bg-zinc-900">
        <img src={images[imgIdx]} alt={venue.name} className="w-full h-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-20 bg-black/30 backdrop-blur text-white p-2 rounded-full hover:bg-black/50 transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {images.length > 1 && (
          <>
            <button onClick={() => setImgIdx(i => (i === 0 ? images.length - 1 : i - 1))} className="absolute top-1/2 left-4 -translate-y-1/2 z-20 bg-black/30 text-white p-2 rounded-full backdrop-blur hover:bg-black/50 transition-all">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => setImgIdx(i => (i === images.length - 1 ? 0 : i + 1))} className="absolute top-1/2 right-4 -translate-y-1/2 z-20 bg-black/30 text-white p-2 rounded-full backdrop-blur hover:bg-black/50 transition-all">
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {images.map((_: any, idx: number) => (
                <div key={idx} className={`h-1.5 rounded-full transition-all ${idx === imgIdx ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="container mx-auto px-4 lg:px-8 -mt-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          {/* Left Column: Venue Info, Sports, Dates */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary/20 text-primary border-0 hover:bg-primary/30 text-sm">Sports Venue</Badge>
                {venue.status === 'approved' && <Badge className="bg-green-500/20 text-green-600 border-0 hover:bg-green-500/30 text-sm">Verified Partner</Badge>}
              </div>
              <h1 className="text-3xl lg:text-5xl font-bold tracking-tight leading-tight">{venue.name}</h1>
              
              <div className="flex items-center gap-4 text-muted-foreground pt-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm">{venue.address}</p>
                </div>
              </div>
              {venue.description && <p className="text-muted-foreground text-sm lg:text-base leading-relaxed">{venue.description}</p>}

              {venue.amenities && venue.amenities.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {venue.amenities.map((a: string) => (
                    <Badge key={a} variant="outline" className="bg-card text-card-foreground">✓ {a}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Sport Selection */}
            {venue.sport_types && venue.sport_types.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" /> Select Sport
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {venue.sport_types.map((st: string) => (
                    <button
                      key={st}
                      onClick={() => { setSport(st); setSelectedSlots([]); }}
                      className={`flex flex-col items-center justify-center p-4 min-w-[120px] rounded-2xl border-2 transition-all ${
                        sport === st ? 'border-primary bg-primary/5 text-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <span className="text-3xl mb-2">{SPORT_TYPES[st]?.emoji}</span>
                      <span className="font-semibold text-sm">{SPORT_TYPES[st]?.label || st}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date Selection */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Choose Date
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {days.map((d) => (
                  <button
                    key={d.dateStr}
                    onClick={() => { setDate(d.dateStr); setSelectedSlots([]); }}
                    className={`flex flex-col items-center justify-center min-w-[80px] h-[90px] rounded-2xl border-2 transition-all ${
                      date === d.dateStr ? 'border-primary bg-primary text-primary-foreground shadow-md' : 'border-border bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="text-xs uppercase tracking-wider mb-1 font-medium">{d.day}</span>
                    <span className="text-2xl font-bold">{d.date}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-bold flex items-center justify-between">
                <div className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Playing Duration</div>
                <div className="flex items-center gap-4 bg-muted p-1.5 rounded-xl text-foreground">
                  <button onClick={() => setBookingDuration(d => Math.max(1, d - 1))} className="h-8 w-8 rounded-lg bg-card border shadow-sm hover:bg-primary/10 flex items-center justify-center font-bold transition-colors">—</button>
                  <span className="font-bold w-12 text-center">{bookingDuration} hr</span>
                  <button onClick={() => setBookingDuration(d => Math.min(6, d + 1))} className="h-8 w-8 rounded-lg bg-card border shadow-sm hover:bg-primary/10 flex items-center justify-center font-bold transition-colors">+</button>
                </div>
              </h3>
            </div>
          </div>

          {/* Right Column: Slots & Checkout */}
          <div className="lg:sticky lg:top-24 space-y-6">
            <Card className="rounded-3xl border shadow-lg overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle className="text-lg">Available Slots</CardTitle>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'morning', label: 'Morning' },
                    { id: 'evening', label: 'Evening' },
                    { id: 'night', label: 'Night' }
                  ].map(t => (
                    <Badge
                      key={t.id}
                      variant={timeOfDayFilter === t.id ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setTimeOfDayFilter(t.id)}
                    >
                      {t.label}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {slotsLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : filteredCombinedSlots.length === 0 ? (
                  <div className="text-center py-10 rounded-2xl bg-muted/30">
                    <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="font-medium text-muted-foreground">No {bookingDuration}hr slots available.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredCombinedSlots.map(s => {
                      const isSelected = selectedSlots.find(x => x.id === s.id);
                      const isAvail = s.status === 'available';
                      return (
                        <button
                          key={s.id}
                          disabled={!isAvail}
                          onClick={() => toggleSlot(s)}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                            !isAvail 
                              ? 'bg-muted/50 text-muted-foreground/50 border-transparent cursor-not-allowed'
                              : isSelected 
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-card text-foreground border-border hover:border-primary/50'
                          }`}
                        >
                          <span>{formatTime12(s.slot_time || s.start_time)}</span>
                          <span className={`text-xs mt-0.5 ${!isAvail ? 'opacity-50' : isSelected ? 'opacity-90' : 'text-primary'}`}>
                            &#x20B9;{s.price}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
              <div className="p-4 bg-muted/30 border-t space-y-4">
                {selectedSlots.length > 0 && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Slots Value ({selectedSlots.length} selected)</span>
                      <span className="font-semibold text-foreground">&#x20B9;{totalAmount.toFixed(2)}</span>
                    </div>
                    {/* Only showing base total to keep it simple, or full breakdown */}
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="font-bold text-base">Total Amount</span>
                      <span className="font-bold text-xl text-primary">&#x20B9;{totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleBook}
                  disabled={bookingLoading || selectedSlots.length === 0}
                  className="w-full h-12 text-base font-bold rounded-2xl"
                >
                  {bookingLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Check className="mr-2 h-5 w-5" />}
                  {bookingLoading ? 'Processing...' : (user ? (selectedSlots.length > 0 ? 'Book Slot(s)' : 'Select a Slot') : 'Login to Book')}
                </Button>
                <Button onClick={handleShare} variant="ghost" className="w-full text-muted-foreground text-sm gap-2">
                  <Share2 className="h-4 w-4" /> Share Venue
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Footer */}
      {selectedSlots.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t z-40 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <div>
            <p className="text-xs text-muted-foreground">{selectedSlots.length} slot(s) • {bookingDuration} hr</p>
            <p className="text-xl font-bold text-primary">&#x20B9;{totalAmount.toFixed(2)}</p>
          </div>
          <Button
            onClick={handleBook}
            disabled={bookingLoading}
            className="rounded-xl px-8 font-bold h-11"
          >
            {bookingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Book Now'}
          </Button>
        </div>
      )}
    </div>
  );
}
