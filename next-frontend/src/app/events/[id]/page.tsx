'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Share2, Ticket, Clock, Minus, Plus, Loader2, ArrowLeft } from 'lucide-react';
import { CalendarIcon, MapPinIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import toast, { Toaster } from 'react-hot-toast';
import { useAuthContext } from '@/lib/auth-context';
import { useTranslation } from '@/lib/language-context';
import { supabase } from '@/lib/supabase-client';
import { processRazorpayPayment } from '@/lib/razorpay';
import { getApiUrl } from '@/lib/api';

function parseBannerUrl(raw: string | string[] | null): string | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] || null;
  try {
    const parsed = JSON.parse(raw as string);
    return Array.isArray(parsed) ? parsed[0] : null;
  } catch { return typeof raw === 'string' ? raw : null; }
}

export default function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, openLogin } = useAuthContext();
  const { t, currentLanguage } = useTranslation();

  const [event, setEvent] = useState<any>(null);
  const [siblingSlots, setSiblingSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [ticketCount, setTicketCount] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [platformFee, setPlatformFee] = useState(5);

  useEffect(() => {
    if (!id) return;
    async function fetchEvent() {
      try {
        const res = await fetch(`${getApiUrl()}/api/events/${id}`);
        const data = await res.json();
        const ev = data.event || data;
        if (ev?.id) {
          setEvent(ev);
          if (ev.event_ticket_tiers?.length > 0) {
            setSelectedTierId(ev.event_ticket_tiers[0].id);
          }
          
          if (ev.show_type === 'multiple' || ev.show_type === 'festival' || ev.show_type === 'tour') {
            const { data: siblings } = await supabase
              .from('events')
              .select('id, event_date, venue_name')
              .eq('title', ev.title)
              .eq('category', ev.category)
              .eq('created_by', ev.created_by)
              .neq('status', 'PENDING_APPROVAL')
              .neq('status', 'REJECTED')
              .order('event_date', { ascending: true });
            setSiblingSlots(siblings || []);
          } else {
            setSiblingSlots(data.siblings || []);
          }
        }
      } catch { toast.error('Failed to load event'); }
      finally { setLoading(false); }
    }
    fetchEvent();

    fetch(`${getApiUrl()}/api/platform-settings`)
      .then(r => r.json())
      .then(data => {
        if (data?.settings?.eventPlatformFee !== undefined) {
          setPlatformFee(Number(data.settings.eventPlatformFee));
        }
      })
      .catch(() => {});
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!event) return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
      <p className="text-muted-foreground">Event not found</p>
      <Button onClick={() => router.push('/events')}>Back to Events</Button>
    </div>
  );

  const img = parseBannerUrl(event.banner_url);
  const startDate = new Date(event.event_date);
  const tiers = event.event_ticket_tiers || [];
  const selectedTier = tiers.find((t: any) => t.id === selectedTierId);
  const baseAmount = (selectedTier?.price || 0) * ticketCount;
  const cgst = Number((baseAmount * 0.09).toFixed(2));
  const sgst = Number((baseAmount * 0.09).toFixed(2));
  const platformFeeTotal = Number((platformFee * ticketCount).toFixed(2));
  const totalAmount = baseAmount + cgst + sgst + platformFeeTotal;

  const bookingWindowOpen = (() => {
    if (!event.booking_start || !event.booking_end) return true;
    const now = Date.now();
    return now >= new Date(event.booking_start).getTime() && now <= new Date(event.booking_end).getTime();
  })();

  const handleBookTicket = async () => {
    if (!user) {
      toast.error('Please login to book tickets');
      openLogin();
      return;
    }
    if (!selectedTier) return;
    if (!bookingWindowOpen) { toast.error('Booking is currently closed'); return; }

    const userId = user.id || null;
    const userUid = user.uid || user.firebase_uid || null;
    const userPhone = ((user.phone || user.phoneNumber || '')).replace(/\D/g, '').slice(-10) || null;
    const userEmail = user.email || null;

    setBookingLoading(true);
    try {
      let finalUserId = userId;
      if (!finalUserId && (userUid || userPhone || userEmail)) {
        const r = await fetch(`${getApiUrl()}/api/events/resolve-id`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: userUid, phone: userPhone, email: userEmail })
        });
        const d = await r.json();
        if (d.id) finalUserId = d.id;
      }

      const response = await fetch(`${getApiUrl()}/api/events/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: finalUserId, userPhone, userUid, userEmail,
          eventId: event.id, tierId: selectedTier.id, ticketCount
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Booking failed');

      if (data.booking?.user_id) {
        try {
          const stored = JSON.parse(localStorage.getItem('passwala_user') || '{}');
          stored.id = data.booking.user_id;
          localStorage.setItem('passwala_user', JSON.stringify(stored));
        } catch {}
      }

      const totalPayable = parseFloat(data.booking.total_amount) || 0;

      // Free tickets bypass gateway
      if (totalPayable <= 0) {
        sessionStorage.setItem('passwala_last_ticket', JSON.stringify({
          booking: data.booking, event, tier: selectedTier
        }));
        toast.success('Tickets Booked Successfully!');
        setBookingLoading(false);
        router.push('/events/ticket');
        return;
      }

      // Launch Razorpay Checkout
      await processRazorpayPayment({
        apiBaseUrl: getApiUrl(),
        amount: totalPayable,
        orderId: data.booking.id,
        orderType: 'event',
        title: 'Passwala Events',
        description: `${event.title} - ${selectedTier.tier_name} (${ticketCount} ${ticketCount > 1 ? 'tickets' : 'ticket'})`,
        user: {
          name: user.name || user.displayName,
          email: user.email,
          phone: user.phone || user.phoneNumber,
        },
        onSuccess: () => {
          sessionStorage.setItem('passwala_last_ticket', JSON.stringify({
            booking: data.booking, event, tier: selectedTier
          }));
          toast.success('Payment Verified! Tickets Booked Successfully!');
          setBookingLoading(false);
          router.push('/events/ticket');
        },
        onDismiss: async () => {
          toast.error('Payment cancelled. Releasing ticket...');
          if (data.booking?.id) {
            await fetch(`${getApiUrl()}/api/events/cancel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ booking_id: data.booking.id, reason: 'User Cancelled Payment' }),
            }).catch(() => {});
          }
          setBookingLoading(false);
        },
        onError: async (payErr: any) => {
          toast.error(payErr.message || 'Payment verification failed');
          if (data.booking?.id) {
            await fetch(`${getApiUrl()}/api/events/cancel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ booking_id: data.booking.id, reason: 'Payment Error' }),
            }).catch(() => {});
          }
          setBookingLoading(false);
        },
      });

    } catch (err: any) {
      toast.error(err.message || 'Error booking tickets');
      setBookingLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success(t('link_copied', 'Link copied!'));
      }
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <Toaster position="top-center" />

      {/* Hero */}
      <div className="w-full h-[55vh] min-h-[380px] relative bg-zinc-900">
        {img ? (
          <img src={img} alt={event.title} className="w-full h-full object-cover opacity-70" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/50 to-purple-900/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-20 bg-black/30 backdrop-blur text-white p-2 rounded-full hover:bg-black/50 transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="container mx-auto px-4 md:px-8 -mt-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">

          {/* Left: Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary/20 text-primary border-0">{event.category || t('events', 'Event')}</Badge>
                {event.status === 'ONGOING' && <Badge className="bg-green-500 text-white border-0">{t('live_now', 'Live Now')}</Badge>}
                {!bookingWindowOpen && <Badge variant="destructive">{t('booking_closed', 'Booking Closed')}</Badge>}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{event.title}</h1>
              {event.description && <p className="text-lg text-muted-foreground leading-relaxed">{event.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-8 border-y border-border/50">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-muted rounded-2xl shrink-0"><Calendar className="h-5 w-5 text-primary" /></div>
                <div>
                  <p suppressHydrationWarning className="font-semibold">{startDate.toLocaleDateString(currentLanguage === 'en' ? 'en-IN' : currentLanguage, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p suppressHydrationWarning className="text-sm text-muted-foreground">{startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-muted rounded-2xl shrink-0"><MapPin className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="font-semibold">{event.venue_name || t('venue', 'City Venue')}</p>
                  {event.city && <p className="text-sm text-muted-foreground">{event.city}</p>}
                </div>
              </div>
              {event.duration && (
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-muted rounded-2xl shrink-0"><Clock className="h-5 w-5 text-primary" /></div>
                  <div><p className="font-semibold">{t('duration', 'Duration')}</p><p className="text-sm text-muted-foreground">{event.duration}</p></div>
                </div>
              )}
              {event.language && (
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-muted rounded-2xl shrink-0"><ChatBubbleLeftRightIcon className="h-5 w-5 text-primary" /></div>
                  <div><p className="font-semibold">{t('event_language', 'Language')}</p><p className="text-sm text-muted-foreground">{event.language}</p></div>
                </div>
              )}
            </div>

            {siblingSlots.length > 1 && (
              <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
                  <Calendar className="h-5 w-5 text-primary" /> {t('multiple_dates_venues', 'Multiple Dates & Venues')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{t('select_show_time', 'Select a different show time or location:')}</p>
                <div className="flex flex-col gap-3">
                  {siblingSlots.map(slot => {
                    const isActive = slot.id === event.id;
                    const dateStr = new Date(slot.event_date).toLocaleDateString(currentLanguage === 'en' ? 'en-IN' : currentLanguage, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                    
                    if (isActive) {
                      return (
                        <div key={slot.id} className="w-full p-4 rounded-2xl text-left flex justify-between items-center border-2 border-primary bg-primary/5 cursor-default">
                          <span suppressHydrationWarning className="text-sm font-bold text-primary inline-flex items-center gap-1.5">
                            <CalendarIcon className="w-4 h-4 shrink-0" />
                            {dateStr}
                          </span>
                          <span className="text-xs font-semibold text-primary/80 inline-flex items-center gap-1">
                            <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                            {slot.venue_name}
                          </span>
                        </div>
                      );
                    }
                    
                    return (
                      <Link
                        key={slot.id}
                        href={`/events/${slot.id}`}
                        className="w-full p-4 rounded-2xl text-left flex justify-between items-center border border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50 transition-all group"
                      >
                        <span suppressHydrationWarning className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors inline-flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4 shrink-0" />
                          {dateStr}
                        </span>
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                          {slot.venue_name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-2xl font-bold">{t('about_event', 'About this Event')}</h3>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{event.description || t('more_details_soon', 'More details coming soon.')}</p>
            </div>

            {event.organizer_name && (
              <div className="p-5 bg-muted/40 rounded-2xl">
                <p className="text-sm text-muted-foreground">{t('organized_by', 'Organized by')}</p>
                <p className="font-semibold text-lg mt-1">{event.organizer_name}</p>
              </div>
            )}
          </div>

          {/* Right: Ticket Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-card border rounded-3xl p-6 shadow-xl space-y-5">
              <div>
                <h3 className="text-xl font-bold">{t('select_tickets', 'Select Tickets')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('choose_category', 'Choose your category')}</p>
              </div>

              <div className="space-y-3">
                {tiers.length > 0 ? tiers.map((tier: any) => (
                  <div
                    key={tier.id}
                    onClick={() => setSelectedTierId(tier.id)}
                    className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer transition-all ${
                      selectedTierId === tier.id ? 'border-primary bg-primary/10' : 'hover:border-primary/50'
                    }`}
                  >
                    <div>
                      <p className={`font-bold ${selectedTierId === tier.id ? 'text-primary' : ''}`}>{tier.tier_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('seats_left', '{n} seats left', { n: tier.available_seats ?? tier.total_seats })}
                      </p>
                    </div>
                    <p className="font-bold text-lg">&#x20B9;{tier.price}</p>
                  </div>
                )) : (
                  <div className="p-4 border rounded-2xl text-center text-muted-foreground text-sm">
                    {t('no_tiers_available', 'No ticket tiers available')}
                  </div>
                )}
              </div>

              {selectedTier && (
                <div className="flex items-center justify-between py-2">
                  <span className="font-semibold text-sm">{t('quantity', 'Quantity')}</span>
                  <div className="flex items-center gap-4 bg-muted px-4 py-2 rounded-full">
                    <button
                      onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}
                      className="text-primary hover:opacity-70 disabled:opacity-30"
                      disabled={ticketCount <= 1}
                    ><Minus className="h-4 w-4" /></button>
                    <span className="font-bold w-5 text-center">{ticketCount}</span>
                    <button
                      onClick={() => setTicketCount(Math.min(selectedTier.available_seats || 10, ticketCount + 1))}
                      className="text-primary hover:opacity-70 disabled:opacity-30"
                      disabled={ticketCount >= (selectedTier.available_seats || 10)}
                    ><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              )}

              {selectedTier && (
                <div className="space-y-2 pt-4 border-t text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('base', 'Base')} ({ticketCount}x &#x20B9;{selectedTier.price})</span>
                    <span className="font-semibold">&#x20B9;{baseAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('cgst', 'CGST (9%)')}</span>
                    <span className="font-semibold">&#x20B9;{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('sgst', 'SGST (9%)')}</span>
                    <span className="font-semibold">&#x20B9;{sgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('platform_fee', 'Platform Fee')}</span>
                    <span className="font-semibold">&#x20B9;{platformFeeTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="font-bold text-lg">{t('total', 'Total')}</span>
                    <span className="font-bold text-xl text-primary">&#x20B9;{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleBookTicket}
                disabled={bookingLoading || !selectedTier || !bookingWindowOpen}
                className="w-full h-12 text-base font-bold rounded-2xl"
              >
                {bookingLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Ticket className="mr-2 h-5 w-5" />}
                {bookingLoading ? t('processing', 'Processing...') : (!bookingWindowOpen ? t('booking_closed', 'Booking Closed') : (user ? t('pay_and_book', 'Pay & Book') : t('login_to_book', 'Login to Book')))}
              </Button>

              <Button onClick={handleShare} variant="ghost" className="w-full text-muted-foreground text-sm gap-2">
                <Share2 className="h-4 w-4" /> {t('share_event', 'Share Event')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Footer */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t z-40 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{t('total', 'Total')}</p>
          <p className="text-lg font-bold text-primary">&#x20B9;{totalAmount.toFixed(2)}</p>
        </div>
        <Button
          onClick={handleBookTicket}
          disabled={bookingLoading || !selectedTier || !bookingWindowOpen}
          className="rounded-xl px-8 font-bold"
        >
          {bookingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (user ? t('pay_and_book', 'Pay & Book') : t('login_to_book', 'Login to Book'))}
        </Button>
      </div>
    </div>
  );
}
