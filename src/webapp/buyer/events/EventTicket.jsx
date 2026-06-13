import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCode } from 'react-qr-code';
import { Download, Calendar, MapPin, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const BASE_URL = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);

const EventTicket = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { booking, event: initialEvent, tier, isFromCheckout = false } = location.state || {};
  const [event, setEvent] = useState(initialEvent || {});
  const [ticketStatus] = useState(booking?.status || 'CONFIRMED');
  const [countdown, setCountdown] = useState(6);

  useEffect(() => {
    if (!isFromCheckout) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/events');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isFromCheckout, navigate]);

  useEffect(() => {
    if (!initialEvent?.id) return;
    const fetchFullEvent = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/events/${initialEvent.id}`);
        const data = await response.json();
        if (response.ok && data.success && data.event) {
          setEvent(data.event);
        }
      } catch (err) {
        console.warn('Failed to fetch full event details:', err);
      }
    };
    fetchFullEvent();
  }, [initialEvent?.id]);

  if (!booking || !event?.id) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>No ticket found.</p>
        <button onClick={() => navigate('/events')}>Browse Events</button>
      </div>
    );
  }

  const handleDownloadInvoice = () => {
    try {
      const doc = new jsPDF();

      // ── Core data
      const invoiceNo      = booking.invoice_number || `EV-${booking.id.substring(0, 8).toUpperCase()}-INV`;
      const invoiceDate    = new Date(booking.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const eventTitle     = event.title || 'Event';
      const ticketCount    = booking.ticket_count || 1;
      // Fix: use total_amount (not total_price)
      const grandTotal     = parseFloat(booking.total_amount || booking.total_price || 0);
      const pricePerTicket = tier?.price || (grandTotal / ticketCount) || 0;

      // ── Tax breakdown (Entertainment: 18% GST = CGST 9% + SGST 9% exclusive)
      // Server adds tax ON TOP of base (exclusive), not inclusive
      const baseAmt  = parseFloat(booking.base_amount  || (grandTotal / 1.18).toFixed(2) || pricePerTicket * ticketCount);
      const cgst     = parseFloat((booking.cgst_amount || (baseAmt * 0.09)).toFixed(2));
      const sgst     = parseFloat((booking.sgst_amount || (baseAmt * 0.09)).toFixed(2));
      const taxable  = parseFloat(baseAmt.toFixed(2));

      // ── Organizer info — from server-enriched organizer_name field
      const organizerName  = event.organizer_name
        || event.vendors?.business_name
        || event.users?.full_name
        || 'Passwala Event Organizer';
      const organizerEmail = event.users?.email || '';

      // ── Buyer info
      const savedUser     = JSON.parse(localStorage.getItem('passwala_user') || '{}');
      const buyerName     = savedUser.displayName || savedUser.full_name || savedUser.name || 'Customer';
      const buyerPhone    = savedUser.phoneNumber || savedUser.phone || '';
      const buyerEmail    = savedUser.email || '';

      // ═══════════════════════════════════════
      // HEADER BAND
      // ═══════════════════════════════════════
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 30, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(organizerName.toUpperCase(), 14, 13);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Tax Invoice / Entertainment Event Ticket', 14, 21);
      doc.text('Powered by Passwala', 14, 26);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 107, 0);
      doc.text('ORIGINAL FOR BUYER', 196, 17, { align: 'right' });

      // ═══════════════════════════════════════
      // INFO GRID (2x2)
      // ═══════════════════════════════════════
      doc.setTextColor(0, 0, 0);
      const G = { x: 14, y: 34, w: 182, rowH: 48 };
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.rect(G.x, G.y, G.w, G.rowH * 2);
      doc.line(G.x, G.y + G.rowH, G.x + G.w, G.y + G.rowH);   // row divider
      doc.line(G.x + 100, G.y, G.x + 100, G.y + G.rowH * 2);   // col divider

      // Panel A – Organizer
      const pA = { x: G.x + 3, y: G.y + 5 };
      doc.setFontSize(6); doc.setFont('helvetica', 'bold');
      doc.text('EVENT ORGANIZER:', pA.x, pA.y);
      doc.setFontSize(8.5); doc.text(organizerName, pA.x, pA.y + 6);
      doc.setFontSize(6); doc.setFont('helvetica', 'normal');
      doc.text(`Event: ${eventTitle}`, pA.x, pA.y + 12);
      doc.text(`Venue: ${event.venue_name || 'Ahmedabad'}`, pA.x, pA.y + 17);
      doc.text(`Date: ${new Date(event.event_date).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}`, pA.x, pA.y + 22);
      if (organizerEmail) doc.text(`Email: ${organizerEmail}`, pA.x, pA.y + 27);

      // Panel B – Invoice details
      const pB = { x: G.x + 103, y: G.y + 5 };
      const addRow = (label, value, yOff) => {
        doc.setFontSize(6); doc.setFont('helvetica', 'bold');
        doc.text(label, pB.x, pB.y + yOff);
        doc.setFont('helvetica', 'normal');
        doc.text(String(value), pB.x + 30, pB.y + yOff);
      };
      addRow('Invoice No:', invoiceNo, 0);
      addRow('Invoice Date:', invoiceDate, 6);
      addRow('Event Date:', new Date(event.event_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }), 12);
      addRow('Ticket Tier:', tier?.tier_name || 'Standard', 18);
      addRow('No. of Tickets:', String(ticketCount), 24);
      addRow('Payment Status:', 'PAID', 30);

      // Panel C – Bill To
      const pC = { x: G.x + 3, y: G.y + G.rowH + 5 };
      doc.setFontSize(6); doc.setFont('helvetica', 'bold');
      doc.text('BILL TO:', pC.x, pC.y);
      doc.setFontSize(8); doc.text(buyerName, pC.x, pC.y + 6);
      doc.setFontSize(6); doc.setFont('helvetica', 'normal');
      if (buyerPhone) doc.text(`Ph: ${buyerPhone}`, pC.x, pC.y + 12);
      if (buyerEmail) doc.text(`Email: ${buyerEmail}`, pC.x, pC.y + 17);
      doc.setFont('helvetica', 'bold');
      doc.text('State:', pC.x, pC.y + 30);
      doc.setFont('helvetica', 'normal');
      doc.text('Gujarat (24)', pC.x + 12, pC.y + 30);

      // Panel D – Buyer GSTIN
      const pD = { x: G.x + 103, y: G.y + G.rowH + 5 };
      doc.setFontSize(6); doc.setFont('helvetica', 'bold');
      doc.text('BUYER GSTIN:', pD.x, pD.y);
      doc.setFont('helvetica', 'normal');
      doc.text('Unregistered Consumer', pD.x, pD.y + 6);
      doc.setFont('helvetica', 'bold');
      doc.text('HSN/SAC Code:', pD.x, pD.y + 12);
      doc.setFont('helvetica', 'normal');
      doc.text('998554 (Entertainment Events)', pD.x, pD.y + 18);

      // ═══════════════════════════════════════
      // ITEM TABLE
      // ═══════════════════════════════════════
      const tableStartY = G.y + G.rowH * 2 + 4;
      const tableColumns = ['Sr', 'HSN', 'Item Description', 'Tier', 'Qty', 'Rate', 'Taxable Val.', 'CGST 9%', 'SGST 9%', 'Total'];
      const tableRows = [[
        '1',
        '998554',
        eventTitle,
        tier?.tier_name || 'Standard',
        String(ticketCount),
        `Rs. ${taxable.toFixed(2)}`,
        `Rs. ${taxable.toFixed(2)}`,
        `Rs. ${cgst.toFixed(2)}`,
        `Rs. ${sgst.toFixed(2)}`,
        `Rs. ${grandTotal.toFixed(2)}`
      ]];

      autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: tableStartY,
        theme: 'grid',
        styles: { fontSize: 6.5, cellPadding: 2.5, textColor: [0,0,0], lineColor: [200,200,200], lineWidth: 0.1 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255,255,255], fontStyle: 'bold', halign: 'center', fontSize: 6 },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { halign: 'center', cellWidth: 16 },
          2: { cellWidth: 35 },
          3: { cellWidth: 22 },
          4: { halign: 'center', cellWidth: 8 },
          5: { halign: 'right', cellWidth: 20 },
          6: { halign: 'right', cellWidth: 22 },
          7: { halign: 'right', cellWidth: 18 },
          8: { halign: 'right', cellWidth: 18 },
          9: { halign: 'right', cellWidth: 15 },
        },
        margin: { left: 14, right: 14 },
      });

      let finalY = doc.lastAutoTable.finalY + 3;

      // ═══════════════════════════════════════
      // TAX SUMMARY BLOCK (right-aligned)
      // ═══════════════════════════════════════
      const summaryRows = [
        ['Taxable Amount (Excl. GST)', `Rs. ${taxable.toFixed(2)}`],
        ['CGST @ 9%', `Rs. ${cgst.toFixed(2)}`],
        ['SGST @ 9%', `Rs. ${sgst.toFixed(2)}`],
        ['Total GST (18%)', `Rs. ${(cgst + sgst).toFixed(2)}`],
        ['GRAND TOTAL', `Rs. ${grandTotal.toFixed(2)}`],
      ];

      autoTable(doc, {
        startY: finalY,
        head: [['Description', 'Amount']],
        body: summaryRows,
        theme: 'grid',
        styles: { fontSize: 7, cellPadding: 2.5, lineColor: [200,200,200], lineWidth: 0.1 },
        headStyles: { fillColor: [248,250,252], textColor: [0,0,0], fontStyle: 'bold', halign: 'center' },
        bodyStyles: { halign: 'right' },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 55 }, 1: { cellWidth: 35 } },
        margin: { left: 196 - 90, right: 14 },
        didParseCell: (data) => {
          if (data.row.index === summaryRows.length - 1) {
            data.cell.styles.fillColor = [15, 23, 42];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });

      finalY = doc.lastAutoTable.finalY + 3;

      // ═══════════════════════════════════════
      // AMOUNT IN WORDS
      // ═══════════════════════════════════════
      const toWords = (n) => {
        const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
        const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
        if (n === 0) return 'Zero';
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
        if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + toWords(n%100) : '');
        if (n < 100000) return toWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + toWords(n%1000) : '');
        return toWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + toWords(n%100000) : '');
      };
      const rupees   = Math.floor(grandTotal);
      const paise    = Math.round((grandTotal - rupees) * 100);
      const amtWords = `Indian Rupee ${toWords(rupees)}${paise > 0 ? ' and ' + toWords(paise) + ' Paise' : ''} Only`;

      doc.setFillColor(248, 250, 252);
      doc.rect(14, finalY, 182, 9, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(14, finalY, 182, 9);
      doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
      doc.text('Amount in Words:', 16, finalY + 6);
      doc.setFont('helvetica', 'normal');
      doc.text(amtWords, 52, finalY + 6);
      finalY += 12;

      // ═══════════════════════════════════════
      // TERMS
      // ═══════════════════════════════════════
      doc.setFontSize(5.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
      doc.text('Terms & Conditions:', 14, finalY);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
      doc.text('1. This ticket is non-transferable. Present QR code at entry.', 14, finalY + 5);
      doc.text('2. No refunds or exchanges once booked, unless event is cancelled by organizer.', 14, finalY + 9);
      doc.text('3. GST @ 18% (CGST 9% + SGST 9%) applicable on entertainment services as per HSN 998554.', 14, finalY + 13);
      finalY += 18;

      // ═══════════════════════════════════════
      // FOOTER BAND
      // ═══════════════════════════════════════
      doc.setFillColor(15, 23, 42);
      doc.rect(0, finalY, 210, 22, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
      doc.text('Platform / Facilitator: Passwala', 14, finalY + 6);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
      doc.text('Email: support@passwala.in  |  Website: www.passwala.in', 14, finalY + 11);
      doc.setTextColor(148, 163, 184); doc.setFontSize(5.5);
      doc.text('Whether tax is payable on reverse charge basis: No', 14, finalY + 16);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
      doc.text('Authorised Signatory', 194, finalY + 16, { align: 'right' });
      doc.setDrawColor(150, 150, 150);
      doc.line(160, finalY + 12, 194, finalY + 12);

      doc.save(`Invoice_${invoiceNo}.pdf`);
      toast.success('Invoice downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF invoice');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-main)', paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Your Ticket</h2>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>

        {/* ✅ Booking Success Banner — only shown on fresh checkout */}
        {isFromCheckout && (
          <div style={{
            width: '100%', maxWidth: '400px', marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            borderRadius: '20px', padding: '1.25rem 1.5rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
            boxShadow: '0 4px 20px rgba(34,197,94,0.25)'
          }}>
            <CheckCircle size={32} color="white" />
            <div>
              <p style={{ margin: 0, color: 'white', fontWeight: 800, fontSize: '1rem' }}>🎉 Booking Confirmed!</p>
              <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem' }}>
                Returning to events in {countdown}s...
              </p>
            </div>
            {/* Countdown ring */}
            <div style={{ marginLeft: 'auto', width: '42px', height: '42px', position: 'relative' }}>
              <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '42px', height: '42px' }}>
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none" stroke="white" strokeWidth="2.5"
                  strokeDasharray={`${(countdown / 6) * 100} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: 'white', fontSize: '0.75rem', fontWeight: 800 }}>
                {countdown}
              </span>
            </div>
          </div>
        )}

        {/* Ticket Card */}
        <div style={{
          background: 'white', width: '100%', maxWidth: '400px',
          borderRadius: '24px', boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden', position: 'relative'
        }}>
          {/* Banner */}
          <div style={{ position: 'relative', height: '160px' }}>
            <img
              src={event.banner_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80'}
              alt={event.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.8) 100%)' }} />
            <div style={{ position: 'absolute', bottom: '15px', left: '15px', right: '15px' }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: 900 }}>{event.title}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                <span style={{ color: 'white', fontSize: '0.8rem', background: 'var(--primary)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                  {tier?.tier_name || 'Standard'}
                </span>
                <span style={{ color: '#e5e7eb', fontSize: '0.8rem' }}>{booking.ticket_count} Admit</span>
              </div>
            </div>
          </div>

          {/* Info */}
          <div style={{ padding: '1.5rem', background: 'white', borderBottom: '2px dashed var(--border-light)', position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: '-15px', left: '-15px', width: '30px', height: '30px', background: 'var(--bg-main)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '-15px', right: '-15px', width: '30px', height: '30px', background: 'var(--bg-main)', borderRadius: '50%' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Calendar size={18} color="var(--primary)" />
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date & Time</p>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>{new Date(event.event_date).toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <MapPin size={18} color="var(--primary)" />
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Venue</p>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>{event.venue_name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fafafa' }}>
            <div style={{ background: 'white', padding: '15px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
              <QRCode value={booking.qr_code_hash} size={150} />
            </div>
            <p style={{ margin: '15px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '2px' }}>
              {booking.qr_code_hash?.split('-')[2]}
            </p>
            <div style={{
              marginTop: '15px',
              background: ticketStatus === 'CONFIRMED' ? '#22c55e' : '#ef4444',
              color: 'white', padding: '6px 20px',
              borderRadius: '20px', fontSize: '0.85rem', fontWeight: 800
            }}>
              {ticketStatus}
            </div>
          </div>
        </div>

        {/* Invoice Only */}
        <div style={{ width: '100%', maxWidth: '400px', marginTop: '1.5rem' }}>
          <button
            onClick={handleDownloadInvoice}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', background: 'white', border: '1px solid var(--border-light)',
              padding: '1rem', borderRadius: '14px', fontWeight: 700,
              cursor: 'pointer', color: 'var(--secondary)', fontSize: '0.95rem'
            }}
          >
            <Download size={18} /> Download Invoice
          </button>
        </div>

        {/* Go Back Now */}
        <button
          onClick={() => navigate('/events')}
          style={{
            marginTop: '1rem', background: 'none', border: 'none',
            color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Go back to Events now
        </button>
      </div>
    </div>
  );
};

export default EventTicket;
