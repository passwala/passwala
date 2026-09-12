'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/lib/auth-context';
import { useTranslation } from '@/lib/language-context';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Ticket, Trophy, Calendar, MapPin, SearchX, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast, { Toaster } from 'react-hot-toast';

export default function OrdersPage() {
  const { user, loading: authLoading, openLogin } = useAuthContext();
  const { t, currentLanguage } = useTranslation();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState<any[]>([]);
  const [sports, setSports] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Authenticate & Fetch
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/');
      setTimeout(openLogin, 300);
      return;
    }

    const fetchAll = async () => {
      setDataLoading(true);
      try {
        let userId = user.id;

        // Resolve UUID if needed (same as old app)
        if (!userId || userId.length !== 36) {
          const phoneClean = (user.phone || user.phoneNumber || '').replace('+91', '');
          const orList = [];
          if (user.uid) orList.push(`uid.eq.${user.uid}`);
          if (user.email) orList.push(`email.eq.${user.email}`);
          if (phoneClean) orList.push(`phone.eq.${phoneClean}`, `phone.eq.+91${phoneClean}`);
          
          if (orList.length > 0) {
            const { data } = await supabase.from('users').select('id').or(orList.join(',')).maybeSingle();
            if (data?.id) userId = data.id;
          }
        }

        if (!userId || userId.length !== 36) { 
          setDataLoading(false); 
          return; 
        }

        // Fetch Event Bookings
        const { data: eData } = await supabase
          .from('event_bookings')
          .select('*, events(*), event_ticket_tiers(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        // Fetch Sport Bookings correctly via backend API (which uses venue_bookings)
        let sData = null;
        try {
          const apiRes = await fetch(`http://127.0.0.1:3004/api/sports/my-bookings?user_id=${userId}`);
          const apiData = await apiRes.json();
          if (apiData.success && apiData.bookings) {
            sData = apiData.bookings;
          }
        } catch (e) { console.error('Failed to fetch sports', e); }

        if (eData) setEvents(eData);
        if (sData) setSports(sData);

      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setDataLoading(false);
      }
    };

    fetchAll();
  }, [user, authLoading]);

  // Invoice Download Logic from old EventTicket.jsx
  const downloadEventInvoice = (booking: any) => {
    try {
      const doc = new jsPDF();
      const eventTitle = booking.events?.title || 'Event';
      const date = new Date(booking.created_at).toLocaleDateString('en-IN');
      const total = parseFloat(booking.total_amount || 0);
      
      doc.setFontSize(22);
      doc.text('PASSWALA INVOICE', 14, 20);
      doc.setFontSize(11);
      doc.text(`Invoice No: EV-${booking.id.substring(0,8).toUpperCase()}`, 14, 30);
      doc.text(`Date: ${date}`, 14, 35);
      
      autoTable(doc, {
        startY: 45,
        head: [['Item', 'Qty', 'Total']],
        body: [[
          `${eventTitle} - ${booking.event_ticket_tiers?.tier_name || 'Ticket'}`,
          booking.ticket_count,
          `Rs. ${total.toFixed(2)}`
        ]],
        theme: 'striped',
        headStyles: { fillColor: [242, 107, 15] } // Passwala primary color
      });

      doc.save(`Passwala_Event_${booking.id.substring(0,8)}.pdf`);
      toast.success(t('invoice_downloaded', 'Invoice downloaded!'));
    } catch (e) {
      toast.error('Failed to generate PDF');
    }
  };

  if (authLoading || (dataLoading && !events.length && !sports.length)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Toaster position="top-center" />
      {/* Header */}
      <div className="bg-primary pt-8 pb-16 px-4">
        <div className="container max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-primary-foreground">{t('my_bookings_title', 'My Bookings')}</h1>
          <p className="text-primary-foreground/80 mt-1">{t('my_bookings_page_sub', 'View your event tickets and sports slots')}</p>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 -mt-10">
        <div className="bg-card border rounded-3xl p-2 shadow-sm mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-transparent h-12">
              <TabsTrigger 
                value="events" 
                className="rounded-2xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-bold transition-all"
              >
                {t('tab_event_tickets', 'Event Tickets')}
              </TabsTrigger>
              <TabsTrigger 
                value="sports"
                className="rounded-2xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-bold transition-all"
              >
                {t('tab_sports_bookings', 'Sports Bookings')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="pt-4 space-y-4 outline-none">
              {events.length === 0 ? (
                <div className="text-center py-16 bg-muted/30 rounded-3xl border border-dashed">
                  <SearchX className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <h3 className="text-lg font-bold">{t('no_event_tickets', 'No Event Tickets')}</h3>
                  <p className="text-muted-foreground text-sm">{t('no_event_tickets_sub', "You haven't booked any events yet.")}</p>
                </div>
              ) : (
                events.map(booking => (
                  <Card key={booking.id} className="overflow-hidden rounded-2xl border shadow-sm">
                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge className="bg-blue-500/10 text-blue-600 border-0 mb-2">
                            {booking.status || 'CONFIRMED'}
                          </Badge>
                          <h3 className="text-lg font-bold line-clamp-1">{booking.events?.title || 'Unknown Event'}</h3>
                          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[200px]">{booking.events?.venue_name || t('venue', 'Venue')}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-lg text-primary">&#x20B9;{parseFloat(booking.total_amount).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {booking.ticket_count > 1 
                              ? t('tickets_count', `${booking.ticket_count} Tickets`, { n: booking.ticket_count }) 
                              : t('ticket_single', '1 Ticket')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 py-3 border-y text-sm">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>{booking.events?.event_date ? new Date(booking.events.event_date).toLocaleDateString(currentLanguage === 'en' ? 'en-IN' : currentLanguage) : t('tba', 'TBA')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Ticket className="h-4 w-4 text-primary" />
                          <span>{booking.event_ticket_tiers?.tier_name || 'Standard'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          className="flex-1 rounded-xl text-primary border-primary/20 hover:bg-primary/5"
                          onClick={() => {
                            sessionStorage.setItem('passwala_last_ticket', JSON.stringify({
                              booking, event: booking.events, tier: booking.event_ticket_tiers
                            }));
                            router.push('/events/ticket');
                          }}
                        >
                          {t('view_e_ticket', 'View E-Ticket')}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => downloadEventInvoice(booking)} className="rounded-xl">
                          <Download className="h-5 w-5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="sports" className="pt-4 space-y-4 outline-none">
              {sports.length === 0 ? (
                <div className="text-center py-16 bg-muted/30 rounded-3xl border border-dashed">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <h3 className="text-lg font-bold">{t('no_sports_bookings', 'No Sports Bookings')}</h3>
                  <p className="text-muted-foreground text-sm">{t('no_sports_bookings_sub', "You haven't booked any turf or courts yet.")}</p>
                </div>
              ) : (
                sports.map(booking => (
                  <Card key={booking.id} className="overflow-hidden rounded-2xl border shadow-sm p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-0 mb-2">
                          {booking.status || 'CONFIRMED'}
                        </Badge>
                        <h3 className="text-lg font-bold">{booking.venue_name || booking.sports_venues?.name || t('sports_venue', 'Sports Venue')}</h3>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-primary">&#x20B9;{parseFloat(booking.total_price || booking.total_amount || 0).toFixed(2)}</p>
                      </div>
                    </div>
                      <div className="bg-muted/50 rounded-xl p-3 text-sm space-y-1">
                        <p><strong>{t('sport_label', 'Sport')}:</strong> {t(booking.sport_type, booking.sport_type?.replace('_', ' ').toUpperCase())}</p>
                        <p><strong>{t('date_label', 'Date')}:</strong> {booking.slot_date}</p>
                        <p><strong>{t('slot_label', 'Slot')}:</strong> {booking.slot_time} - {booking.slot_end_time}</p>
                      </div>
                  </Card>
                ))
              )}
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
}
