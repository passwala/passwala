import React, { useState, useEffect } from 'react';
import { Printer, Share2, Mail, CheckCircle, ArrowLeft, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function InvoicePage({ orderId, onBack }) {
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharingChannel, setSharingChannel] = useState(null);
  const [shareInput, setShareInput] = useState('');

  // Fetch invoice details from server
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';

        const res = await fetch(`${baseUrl}/api/planet-softweb/invoices/${orderId}`);
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || 'Failed to load invoice');

        setInvoiceData(data);
      } catch (err) {
        toast.error(err.message || 'Error loading tax invoice');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async (channel) => {
    if (!shareInput) {
      toast.error(`Please enter your ${channel === 'whatsapp' ? 'phone number' : 'email address'}`);
      return;
    }

    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';

      const payload = channel === 'whatsapp' 
        ? { channel, number: shareInput, invoiceNo: invoiceData?.invoice?.invoice_number }
        : { channel, email: shareInput, invoiceNo: invoiceData?.invoice?.invoice_number };

      const res = await fetch(`${baseUrl}/api/planet-softweb/invoices/${orderId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Sharing failed');

      toast.success(`Tax invoice shared successfully via ${channel}!`);
      setSharingChannel(null);
      setShareInput('');
    } catch (err) {
      toast.error('Sharing failed, please try again.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid var(--planet-primary)', borderTopColor: 'transparent', borderRadius: '50%' }}></div>
        <p style={{ marginTop: '16px', color: 'var(--planet-text-muted)', fontSize: '0.9rem' }}>Compiling GST tax breakdown invoice...</p>
      </div>
    );
  }

  if (!invoiceData || !invoiceData.order) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--planet-text-muted)' }}>
        <p>Could not locate billing data for Order ID: {orderId}</p>
        <button className="planet-btn-primary" onClick={onBack} style={{ width: 'auto', margin: '16px auto 0' }}>Back to Shop</button>
      </div>
    );
  }

  const { invoice, order, items } = invoiceData;
  const isSameState = invoice.seller_state.toLowerCase().trim() === invoice.customer_state.toLowerCase().trim();

  // GST Calculation details
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price_at_purchase) * parseInt(item.quantity)), 0);
  const discountRatio = subtotal > 0 ? (subtotal - parseFloat(invoice.discount)) / subtotal : 1;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* 1. Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }} className="no-print">
        <button className="planet-nav-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Store</span>
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="planet-nav-btn" onClick={() => setSharingChannel(sharingChannel === 'whatsapp' ? null : 'whatsapp')}>
            <Share2 size={16} />
            <span>WhatsApp</span>
          </button>
          <button className="planet-nav-btn" onClick={() => setSharingChannel(sharingChannel === 'email' ? null : 'email')}>
            <Mail size={16} />
            <span>Email</span>
          </button>
          <button className="planet-btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem', width: 'auto' }} onClick={handlePrint}>
            <Printer size={16} />
            <span>Print / PDF Download</span>
          </button>
        </div>
      </div>

      {/* Share inputs */}
      {sharingChannel && (
        <div className="planet-card no-print" style={{ marginBottom: '20px', padding: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
            Share via {sharingChannel === 'whatsapp' ? 'WhatsApp (Phone)' : 'Email'}:
          </span>
          <input 
            className="planet-input" 
            style={{ maxWidth: '250px' }}
            placeholder={sharingChannel === 'whatsapp' ? '+91 99999 88888' : 'customer@email.com'} 
            value={shareInput} 
            onChange={(e) => setShareInput(e.target.value)}
          />
          <button className="planet-btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => handleShare(sharingChannel)}>
            Send Link
          </button>
        </div>
      )}

      {/* 2. Printable Tax Invoice Block */}
      <div className="planet-card printable-invoice" style={{ padding: '40px', background: '#111827', border: '1px solid var(--planet-border)' }}>
        
        {/* Invoice Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--planet-border)', paddingBottom: '20px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ margin: '0 0 6px 0', fontSize: '1.75rem', fontWeight: '800', color: 'var(--planet-primary)' }}>Planet Softweb</h1>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--planet-text-muted)' }}>Seller: Planet Softweb Retail Pvt. Ltd.</p>
            <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--planet-text-muted)' }}>State: Gujarat • GSTIN: 24AAACP4930F1Z4</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--planet-text-muted)' }}>Satellite, Ahmedabad, Gujarat - 380015</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--planet-success)', border: '1px solid var(--planet-success)', fontSize: '0.75rem', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', display: 'inline-block', marginBottom: '8px' }}>
              TAX INVOICE
            </span>
            <div style={{ fontSize: '0.9rem', color: 'var(--planet-text-muted)' }}>Invoice No:</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--planet-text)' }}>{invoice.invoice_number}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--planet-text-muted)', marginTop: '4px' }}>Date: {new Date(invoice.created_at || new Date()).toLocaleDateString('en-IN')}</div>
          </div>
        </div>

        {/* Billing details grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '32px' }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--planet-primary)' }}>Billed To (Customer):</h4>
            <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{order.users?.full_name || 'Valued Customer'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--planet-text-muted)', marginTop: '4px' }}>
              Phone: {order.users?.phone || 'N/A'}<br />
              Email: {order.users?.email || 'N/A'}
            </div>
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--planet-primary)' }}>Delivery / Shipping Address:</h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--planet-text-muted)', lineHeight: '1.4' }}>
              {order.addresses?.address_line_1 || 'No street details'}, {order.addresses?.address_line_2 || ''}<br />
              City: {order.addresses?.city || 'Ahmedabad'}<br />
              State: {invoice.customer_state} - Pin: {order.addresses?.pincode || '380015'}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--planet-border)' }}>
              <th style={{ textAlign: 'left', padding: '10px 6px', fontSize: '0.85rem', color: 'var(--planet-text-muted)' }}>Product Description</th>
              <th style={{ textAlign: 'center', padding: '10px 6px', fontSize: '0.85rem', color: 'var(--planet-text-muted)' }}>HSN</th>
              <th style={{ textAlign: 'center', padding: '10px 6px', fontSize: '0.85rem', color: 'var(--planet-text-muted)' }}>GST %</th>
              <th style={{ textAlign: 'right', padding: '10px 6px', fontSize: '0.85rem', color: 'var(--planet-text-muted)' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '10px 6px', fontSize: '0.85rem', color: 'var(--planet-text-muted)' }}>Rate (INR)</th>
              <th style={{ textAlign: 'right', padding: '10px 6px', fontSize: '0.85rem', color: 'var(--planet-text-muted)' }}>Taxable Amt</th>
              {isSameState ? (
                <>
                  <th style={{ textAlign: 'right', padding: '10px 6px', fontSize: '0.85rem', color: 'var(--planet-text-muted)' }}>CGST</th>
                  <th style={{ textAlign: 'right', padding: '10px 6px', fontSize: '0.85rem', color: 'var(--planet-text-muted)' }}>SGST</th>
                </>
              ) : (
                <th style={{ textAlign: 'right', padding: '10px 6px', fontSize: '0.85rem', color: 'var(--planet-text-muted)' }}>IGST</th>
              )}
              <th style={{ textAlign: 'right', padding: '10px 6px', fontSize: '0.85rem', color: 'var(--planet-text-muted)' }}>Total (INR)</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const qty = parseInt(item.quantity);
              const price = parseFloat(item.price_at_purchase);
              const itemTotal = price * qty;
              
              const hsn = item.products?.barcode_type === 'packaged' ? '1904' : item.products?.barcode_type === 'premium' ? '2106' : '0801';
              const rate = item.products?.barcode_type === 'packaged' ? 0.12 : item.products?.barcode_type === 'premium' ? 0.18 : 0.05;

              // post-discount adjusted calculations
              const taxable = (itemTotal / (1 + rate)) * discountRatio;
              const tax = (itemTotal - (itemTotal / (1 + rate))) * discountRatio;

              return (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '12px 6px', fontSize: '0.85rem', fontWeight: '600' }}>{item.products?.name || 'Fresh Item'}</td>
                  <td style={{ padding: '12px 6px', fontSize: '0.85rem', textAlign: 'center', color: 'var(--planet-text-muted)' }}>{hsn}</td>
                  <td style={{ padding: '12px 6px', fontSize: '0.85rem', textAlign: 'center', color: 'var(--planet-text-muted)' }}>{(rate * 100)}%</td>
                  <td style={{ padding: '12px 6px', fontSize: '0.85rem', textAlign: 'center' }}>{qty}</td>
                  <td style={{ padding: '12px 6px', fontSize: '0.85rem', textAlign: 'right' }}>₹{price.toFixed(2)}</td>
                  <td style={{ padding: '12px 6px', fontSize: '0.85rem', textAlign: 'right' }}>₹{taxable.toFixed(2)}</td>
                  {isSameState ? (
                    <>
                      <td style={{ padding: '12px 6px', fontSize: '0.85rem', textAlign: 'right', color: 'var(--planet-text-muted)' }}>₹{(tax/2).toFixed(2)}</td>
                      <td style={{ padding: '12px 6px', fontSize: '0.85rem', textAlign: 'right', color: 'var(--planet-text-muted)' }}>₹{(tax/2).toFixed(2)}</td>
                    </>
                  ) : (
                    <td style={{ padding: '12px 6px', fontSize: '0.85rem', textAlign: 'right', color: 'var(--planet-text-muted)' }}>₹{tax.toFixed(2)}</td>
                  )}
                  <td style={{ padding: '12px 6px', fontSize: '0.85rem', textAlign: 'right', fontWeight: '700', color: 'var(--planet-secondary)' }}>₹{itemTotal.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Calculations breakups */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <div style={{ width: '280px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: 'var(--planet-text-muted)' }}>
              <span>Items Gross Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {parseFloat(invoice.discount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: 'var(--planet-secondary)' }}>
                <span>Coupon Discount Applied:</span>
                <span>- ₹{parseFloat(invoice.discount).toFixed(2)}</span>
              </div>
            )}
            {isSameState ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: 'var(--planet-text-muted)' }}>
                  <span>CGST Total:</span>
                  <span>₹{parseFloat(invoice.cgst).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: 'var(--planet-text-muted)' }}>
                  <span>SGST Total:</span>
                  <span>₹{parseFloat(invoice.sgst).toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: 'var(--planet-text-muted)' }}>
                <span>IGST Total:</span>
                <span>₹{parseFloat(invoice.igst).toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: 'var(--planet-text-muted)' }}>
              <span>Delivery / Courier Charge:</span>
              <span>{parseFloat(invoice.delivery_charges) > 0 ? `₹${parseFloat(invoice.delivery_charges).toFixed(2)}` : 'FREE'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid var(--planet-border)', marginTop: '8px', fontSize: '1.1rem', fontWeight: '800', color: 'var(--planet-primary)' }}>
              <span>Grand Total:</span>
              <span>₹{parseFloat(invoice.final_amount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* GST Terms & signature */}
        <div style={{ borderTop: '1px solid var(--planet-border)', paddingTop: '20px', marginTop: '30px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--planet-text-muted)' }}>
          <div>
            <strong>Terms & Declaration:</strong>
            <p style={{ margin: '4px 0 0 0', maxWidth: '360px', lineHeight: '1.3' }}>
              We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. Taxes are calculated as per GST Rules (India).
            </p>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
            <span style={{ fontSize: '1.25rem', fontFamily: 'cursive', color: 'var(--planet-primary)', marginBottom: '4px' }}>Planet Softweb</span>
            <span>Authorized Signatory</span>
          </div>
        </div>

      </div>
    </div>
  );
}
