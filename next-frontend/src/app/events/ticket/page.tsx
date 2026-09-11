'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { Download, Calendar, MapPin, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const REDIRECT_SECONDS = 6;
const GST_RATE = 0.09;

export default function EventTicket() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    const stateStr = sessionStorage.getItem('passwala_last_ticket');
    if (stateStr) {
      try {
        setData(JSON.parse(stateStr));
      } catch (e) {
        console.error("Failed to parse ticket data", e);
      }
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
      router.push('/events');
    }
  }, [countdown, router]);

  if (!data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <p className="mb-4 text-lg font-medium text-muted-foreground">No ticket found.</p>
        <Button onClick={() => router.push('/events')} className="rounded-xl">Browse Events</Button>
      </div>
    );
  }

  const { booking, event, tier } = data;
  const ticketStatus = booking?.status || 'CONFIRMED';
  const eventDate = new Date(event?.event_date || Date.now());

  const handleDownloadInvoice = () => {
    try {
      const doc = new jsPDF();
      const invoiceNo = booking.invoice_number || `EV-${booking.id?.substring(0, 8).toUpperCase() || 'XXX'}-INV`;
      const invoiceDate = new Date(booking.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const eventTitle = event.title || 'Event';
      const ticketCount = booking.ticket_count || 1;
      const grandTotal = parseFloat(booking.total_amount || booking.total_price || 0);
      const pricePerTicket = tier?.price || (grandTotal / ticketCount) || 0;

      const baseAmt = parseFloat(booking.base_amount || (grandTotal / 1.18).toFixed(2) || pricePerTicket * ticketCount);
      const cgst = parseFloat((booking.cgst_amount || (baseAmt * GST_RATE)).toFixed(2));
      const sgst = parseFloat((booking.sgst_amount || (baseAmt * GST_RATE)).toFixed(2));
      const taxable = parseFloat(baseAmt.toFixed(2));

      const organizerName = event.organizer_name || 'Passwala Event Organizer';
      
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(organizerName.toUpperCase(), 14, 13);

      doc.setFontSize(9.5);
      doc.setTextColor(255, 107, 0);
      doc.text('ORIGINAL FOR BUYER', 196, 17, { align: 'right' });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Invoice No: ${invoiceNo}`, 14, 40);
      doc.text(`Invoice Date: ${invoiceDate}`, 14, 46);

      const tableRows = [[
        '1', '998554', eventTitle, tier?.tier_name || 'Standard', String(ticketCount),
        `Rs. ${taxable.toFixed(2)}`, `Rs. ${taxable.toFixed(2)}`, `Rs. ${cgst.toFixed(2)}`, `Rs. ${sgst.toFixed(2)}`, `Rs. ${grandTotal.toFixed(2)}`
      ]];

      autoTable(doc, {
        head: [['Sr', 'HSN', 'Item', 'Tier', 'Qty', 'Rate', 'Taxable', 'CGST', 'SGST', 'Total']],
        body: tableRows,
        startY: 60,
        theme: 'grid',
        styles: { fontSize: 8 }
      });

      doc.save(`Invoice_${invoiceNo}.pdf`);
      toast.success('Invoice downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF invoice');
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-12 pt-8 px-4 flex flex-col items-center">
      <div className="w-full max-w-md bg-green-500 rounded-2xl p-6 text-white flex items-center gap-4 mb-6 shadow-lg shadow-green-500/20">
        <CheckCircle className="w-10 h-10 shrink-0" />
        <div>
          <h2 className="text-xl font-bold">Booking Confirmed!</h2>
          <p className="text-white/90 text-sm mt-1">Redirecting to events in {countdown}s...</p>
        </div>
      </div>

      <div className="w-full max-w-md bg-card rounded-3xl shadow-xl overflow-hidden border">
        <div className="h-40 relative bg-zinc-900">
          {event?.banner_url ? (
            <img 
              src={Array.isArray(event.banner_url) ? event.banner_url[0] : (typeof event.banner_url === 'string' && event.banner_url.startsWith('[') ? JSON.parse(event.banner_url)[0] : event.banner_url)} 
              alt={event.title} 
              className="w-full h-full object-cover opacity-80" 
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-primary/80" />
          )}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-white text-xl font-bold truncate">{event?.title}</h3>
            <div className="flex justify-between items-center mt-2">
              <Badge className="bg-primary hover:bg-primary text-white border-0">{tier?.tier_name || 'Standard'}</Badge>
              <span className="text-white/90 text-sm font-medium">{booking?.ticket_count} Admit</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 border-b border-dashed">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Date & Time</p>
              <p className="font-semibold text-sm">{eventDate.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Venue</p>
              <p className="font-semibold text-sm">{event?.venue_name}</p>
            </div>
          </div>
        </div>

        <div className="p-8 flex flex-col items-center bg-muted/20">
          <div className="bg-white p-4 rounded-2xl shadow-sm border">
            <QRCode value={booking?.qr_code_hash || booking?.id || 'TEST_QR'} size={150} />
          </div>
          <p className="mt-4 text-xs font-mono text-muted-foreground tracking-widest">
            {booking?.id?.substring(0, 12).toUpperCase()}
          </p>
          <Badge className={`mt-4 ${ticketStatus === 'CONFIRMED' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white border-0 px-4 py-1 text-sm`}>
            {ticketStatus}
          </Badge>
        </div>
      </div>

      <div className="w-full max-w-md mt-6 space-y-3">
        <Button onClick={handleDownloadInvoice} variant="outline" className="w-full h-12 rounded-2xl font-bold border-2">
          <Download className="w-4 h-4 mr-2" /> Download Invoice
        </Button>
        <Button onClick={() => router.push('/events')} variant="ghost" className="w-full text-muted-foreground font-medium rounded-2xl h-12">
          Browse More Events
        </Button>
      </div>
    </div>
  );
}
