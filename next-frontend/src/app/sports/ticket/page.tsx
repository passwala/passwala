'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { Download, Calendar, MapPin, CheckCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/language-context';

const REDIRECT_SECONDS = 6;

export default function SportsTicketPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    const raw = sessionStorage.getItem('passwala_last_sport_ticket');
    if (raw) {
      try { setData(JSON.parse(raw)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!data) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [data]);

  useEffect(() => {
    if (countdown === 0) {
      router.push('/orders');
    }
  }, [countdown, router]);

  if (!data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <p className="mb-4 text-lg font-medium text-muted-foreground">{t('no_booking_found', 'No booking found.')}</p>
        <Button onClick={() => router.push('/sports')} className="rounded-xl">{t('browse_sports', 'Browse Sports')}</Button>
      </div>
    );
  }

  const { booking, bookings, venue, slots, sport } = data;
  const ticketStatus = booking?.status || 'CONFIRMED';
  const img = venue?.images?.[0] || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14';
  
  const handleDownloadInvoice = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text('PASSWALA INVOICE', 14, 20);
      doc.setFontSize(11);
      doc.text(`Booking ID: SP-${booking.id.substring(0,8).toUpperCase()}`, 14, 30);
      doc.text(`Venue: ${venue?.name}`, 14, 38);
      
      const body = bookings?.map((b: any) => [
        `${sport?.replace('_',' ')} Slot`,
        b.booking_date,
        `${b.start_time} - ${b.end_time}`,
        `Rs. ${(b.total_amount || b.total_price || 0).toFixed(2)}`
      ]) || [];

      autoTable(doc, {
        startY: 45,
        head: [['Item', 'Date', 'Time', 'Total']],
        body,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] }
      });

      doc.save(`Passwala_Sports_${booking.id.substring(0,8)}.pdf`);
      toast.success(t('invoice_downloaded', 'Invoice downloaded!'));
    } catch (e) {
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-12 pt-8 px-4 flex flex-col items-center font-sans">
      <Toaster position="top-center" />
      
      <div className="w-full max-w-md bg-green-500 rounded-2xl p-6 text-white flex items-center gap-4 mb-6 shadow-lg shadow-green-500/20">
        <CheckCircle className="w-10 h-10 shrink-0" />
        <div>
          <h2 className="text-xl font-bold">{t('booking_confirmed', 'Booking Confirmed!')}</h2>
          <p className="text-white/90 text-sm mt-1">
            {t('redirecting_orders', `Redirecting to orders in ${countdown}s...`, { s: countdown })}
          </p>
        </div>
      </div>

      <div className="w-full max-w-md bg-card rounded-3xl shadow-xl overflow-hidden border">
        {/* Banner */}
        <div className="h-40 relative bg-zinc-900">
          <img 
            src={img} 
            alt={venue?.name} 
            className="w-full h-full object-cover opacity-70" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-white text-xl font-bold truncate">{venue?.name}</h3>
            <div className="flex justify-between items-center mt-2">
              <Badge className="bg-primary hover:bg-primary text-white border-0">{t(sport, sport?.replace('_', ' ').toUpperCase())}</Badge>
              <span className="text-white/90 text-sm font-medium">
                {t('slots_count', `${bookings?.length || 1} Slot(s)`, { n: bookings?.length || 1 })}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 border-b border-dashed">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('date_time', 'Date & Time')}</p>
              {bookings?.map((b: any, i: number) => (
                <p key={i} className="font-semibold text-sm">
                  {b.booking_date} | {b.start_time?.substring(0,5)} - {b.end_time?.substring(0,5)}
                </p>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{t('venue', 'Venue')}</p>
              <p className="font-semibold text-sm">{venue?.name}</p>
              <p className="text-sm text-muted-foreground">{venue?.city}</p>
            </div>
          </div>
        </div>

        <div className="p-8 flex flex-col items-center bg-muted/20">
          <div className="bg-white p-4 rounded-2xl shadow-sm border">
            <QRCode value={booking?.id || 'TEST_QR'} size={150} />
          </div>
          <p className="mt-4 text-xs font-mono text-muted-foreground tracking-widest">
            {booking?.id?.substring(0, 12).toUpperCase()}
          </p>
          <Badge className={`mt-4 ${ticketStatus === 'CONFIRMED' ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'} text-white border-0 px-4 py-1 text-sm`}>
            {ticketStatus}
          </Badge>
        </div>
      </div>

      <div className="w-full max-w-md mt-6 space-y-3">
        <Button onClick={handleDownloadInvoice} variant="outline" className="w-full h-12 rounded-2xl font-bold border-2">
          <Download className="w-4 h-4 mr-2" /> {t('download_invoice', 'Download Invoice')}
        </Button>
        <Button onClick={() => router.push('/sports')} variant="ghost" className="w-full text-muted-foreground font-medium rounded-2xl h-12">
          {t('browse_more_sports', 'Browse More Sports')}
        </Button>
      </div>
    </div>
  );
}
