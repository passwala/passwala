import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  MapPin,
  X,
  Store,
  CreditCard,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './ProfilePages.css';

const _ = motion;

const OrderHistory = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  useEffect(() => {
    fetchOrders();

    // ⚡ REAL-TIME: Listen for status updates on orders
    const channel = supabase
      .channel('buyer-order-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders' 
      }, (payload) => {
        // If an order status changed, refresh the list
        fetchOrders();
        
        // If the new status is DELIVERED, show a celebratory toast
        if (payload.new && payload.new.status === 'DELIVERED') {
           toast.success("Your order has been delivered! Enjoy!", { icon: '🎁' });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Get current user ID if available
      const savedUser = JSON.parse(localStorage.getItem('passwala_user') || '{}');
      let resolvedUserId = savedUser.id || savedUser.uid;
      
      const isUUID = resolvedUserId && resolvedUserId.length === 36;
      
      if (!isUUID && resolvedUserId) {
        // Resolve from database
        const phoneNo = savedUser.phoneNumber?.replace('+91', '') || savedUser.phone?.replace('+91', '');
        const orFilters = [];
        if (savedUser.uid) orFilters.push(`uid.eq.${savedUser.uid}`);
        if (savedUser.email) orFilters.push(`email.eq.${savedUser.email}`);
        if (phoneNo) {
          orFilters.push(`phone.eq.${phoneNo}`);
          orFilters.push(`phone.eq.+91${phoneNo}`);
        }
        
        if (orFilters.length > 0) {
          const { data: usr } = await supabase
            .from('users')
            .select('id')
            .or(orFilters.join(','))
            .maybeSingle();
          if (usr) {
            resolvedUserId = usr.id;
          } else {
            resolvedUserId = null;
          }
        } else {
          resolvedUserId = null;
        }
      }

      let dbOrders = [];
      if (resolvedUserId && resolvedUserId.length === 36) {
        const apiBase = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
        const res = await fetch(`${apiBase}/api/orders/user-history/${resolvedUserId}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        dbOrders = await res.json();
      } else {
        console.warn("Could not resolve a valid 36-char user UUID for OrderHistory, skipping query to avoid Postgres UUID cast crash.");
      }

      // Parse society dynamically from address_line_1 if not present or generic
      const processedOrders = dbOrders.map(order => {
        if (!order.addresses) {
          order.addresses = {
            id: 'fallback-addr',
            address_line_1: 'Thaltej, Ahmedabad',
            city: 'Ahmedabad',
            state: 'Gujarat',
            pincode: '380054',
            society: 'Thaltej, Ahmedabad',
            lat: 23.0753,
            lng: 72.5244
          };
        } else {
          if (!order.addresses.society || order.addresses.society.toLowerCase() === 'ahmedabad') {
            if (order.addresses.address_line_1 && order.addresses.address_line_1 !== 'Geo-location Pending') {
              const parts = order.addresses.address_line_1.split(',').map(p => p.trim());
              const lastPart = parts[parts.length - 1] || '';
              if (lastPart.toLowerCase() === 'ahmedabad') {
                order.addresses.society = parts[parts.length - 2] || parts[0] || 'Thaltej';
              } else {
                order.addresses.society = lastPart || 'Thaltej';
              }
            } else {
              order.addresses.address_line_1 = 'Thaltej, Ahmedabad';
              order.addresses.society = 'Thaltej';
            }
          }
        }

        // Map order_items to items
        order.items = order.order_items?.map(oi => ({
          name: oi.products?.name || 'Essential Item',
          qty: oi.quantity || 1,
          price: oi.price_at_purchase || 0
        })) || [];

        return order;
      });

      // 🔄 FAIL-SAFE: If any order has 0 items mapped (due to any Postgres join/caching issues in browser),
      // fetch its order items directly by order_id to guarantee they are loaded successfully!
      try {
        await Promise.all(processedOrders.map(async (order) => {
          if (!order.items || order.items.length === 0) {
            const { data: directItems, error: directErr } = await supabase
              .from('order_items')
              .select(`
                id,
                quantity,
                price_at_purchase,
                products(name)
              `)
              .eq('order_id', order.id);
            
            if (!directErr && directItems && directItems.length > 0) {
              order.items = directItems.map(oi => ({
                name: oi.products?.name || 'Essential Item',
                qty: oi.quantity || 1,
                price: oi.price_at_purchase || 0
              }));
            }
          }
        }));
      } catch (fallbackErr) {
        console.warn("Direct order items fallback fetch warning:", fallbackErr);
      }

      setOrders(processedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (order) => {
    setSelectedOrderDetails(order);

    // On-demand direct fetch if items are empty in the modal
    if (!order.items || order.items.length === 0) {
      try {
        const { data: directItems, error: directErr } = await supabase
          .from('order_items')
          .select(`
            id,
            quantity,
            price_at_purchase,
            products(name)
          `)
          .eq('order_id', order.id);
        
        if (!directErr && directItems && directItems.length > 0) {
          const mappedItems = directItems.map(oi => ({
            name: oi.products?.name || 'Essential Item',
            qty: oi.quantity || 1,
            price: oi.price_at_purchase || 0
          }));
          
          // Update the orders list state so the card dynamically updates from 0 to correct count!
          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, items: mappedItems } : o));
          // Update the modal details state
          setSelectedOrderDetails(prev => prev && prev.id === order.id ? { ...prev, items: mappedItems } : prev);
        }
      } catch (err) {
        console.warn("Could not fetch order items on-demand for modal:", err);
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'DELIVERED': return <CheckCircle2 size={16} color="#10b981" />;
      case 'CANCELLED': return <XCircle size={16} color="#ef4444" />;
      case 'PENDING': return <Clock size={16} color="#f59e0b" />;
      default: return <AlertCircle size={16} color="#64748b" />;
    }
  };

  const handleDownloadInvoice = (order) => {
    const doc = new jsPDF();
    
    const storeName = order.stores?.name || order.items?.[0]?.store || 'Passwala Partner';
    const storeAddress = order.stores?.address || 'Thaltej, Ahmedabad, Gujarat 380054';
    const isMahadev = storeName.toLowerCase().includes('mahadev');
    const storeGSTIN = order.stores?.gstin || (isMahadev ? '24AAAMH4812K1Z9' : '24AAACP1234Q1Z5');
    const customerName = order.addresses?.name || 'Customer';
    const customerAddress = `${order.addresses?.society || ''}, ${order.addresses?.address_line_1 || ''}`;
    const orderId = order.id ? String(order.id).substring(0, 8).toUpperCase() : 'N/A';
    const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    
    // Default styles
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.1);

    // Header Logo & Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 118, 34); // Passwala orange
    doc.text(storeName.toUpperCase(), 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Tax Invoice", 196, 20, { align: "right" });
    
    // --- TOP GRID ---
    let startY = 25;
    let gridHeight = 60;
    
    // Outer Border for Top Grid
    doc.rect(14, startY, 182, gridHeight);
    
    // Horizontal divider
    doc.line(14, startY + 30, 196, startY + 30);
    // Vertical divider
    doc.line(125, startY, 125, startY + gridHeight);

    // SELLER INFO (Top Left)
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Sold By : Seller", 16, startY + 5);
    doc.text(storeName.toUpperCase(), 16, startY + 9);
    doc.setFont("helvetica", "normal");
    doc.text(storeAddress, 16, startY + 13, { maxWidth: 105 });
    
    doc.setFont("helvetica", "bold");
    doc.text("FSSAI License Number:", 16, startY + 23);
    doc.setFont("helvetica", "normal");
    doc.text("10722999000123", 45, startY + 23);
    
    doc.setFont("helvetica", "bold");
    doc.text("GSTIN:", 16, startY + 27);
    doc.setFont("helvetica", "normal");
    doc.text(storeGSTIN, 28, startY + 27);
    
    doc.setFont("helvetica", "bold");
    doc.text("PAN:", 65, startY + 27);
    doc.setFont("helvetica", "normal");
    doc.text(storeGSTIN.substring(2, 12), 75, startY + 27);

    // INVOICE NUMBER (Top Right)
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Invoice Number:", 127, startY + 15);
    doc.setFont("helvetica", "normal");
    doc.text(`${orderId}-INV`, 155, startY + 15);

    // BUYER INFO (Bottom Left)
    let bottomY = startY + 30;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Invoice To:", 16, bottomY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(customerName, 40, bottomY + 5);
    
    doc.setFont("helvetica", "bold");
    doc.text("Address:", 16, bottomY + 9);
    doc.setFont("helvetica", "normal");
    doc.text(customerAddress, 40, bottomY + 9, { maxWidth: 80 });
    
    doc.setFont("helvetica", "bold");
    doc.text("Pin code:", 16, bottomY + 20);
    doc.setFont("helvetica", "normal");
    doc.text("380054", 40, bottomY + 20);

    doc.setFont("helvetica", "bold");
    doc.text("State:", 16, bottomY + 24);
    doc.setFont("helvetica", "normal");
    doc.text("Gujarat", 40, bottomY + 24);

    // ORDER INFO (Bottom Right)
    doc.setFont("helvetica", "bold");
    doc.text("Order Id:", 127, bottomY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(orderId, 155, bottomY + 5);
    
    doc.setFont("helvetica", "bold");
    doc.text("Invoice Date:", 127, bottomY + 9);
    doc.setFont("helvetica", "normal");
    doc.text(invoiceDate, 155, bottomY + 9);
    
    doc.setFont("helvetica", "bold");
    doc.text("Place of Supply:", 127, bottomY + 15);
    doc.setFont("helvetica", "normal");
    doc.text("Gujarat", 155, bottomY + 15);

    // --- TABLE ---
    const tableColumn = ["Sr no", "Item Description", "MRP", "Disc.", "Qty", "Taxable Value", "CGST (%)", "CGST (Amt)", "SGST (%)", "SGST (Amt)", "Total"];
    const tableRows = [];
    
    let subtotal = 0;
    
    (order.items || []).forEach((item, index) => {
      const itemPrice = parseFloat(item.price || item.price_at_purchase || 0);
      const itemQty = parseInt(item.qty || item.quantity || 1);
      const baseValue = itemPrice * itemQty;
      const cgstAmt = baseValue * 0.025;
      const sgstAmt = baseValue * 0.025;
      const itemTotal = baseValue + cgstAmt + sgstAmt;
      
      subtotal += itemTotal;
      
      tableRows.push([
        index + 1,
        item.name || item.products?.name || 'Item',
        itemPrice.toFixed(2),
        "0.00",
        itemQty,
        baseValue.toFixed(2),
        "2.5%",
        cgstAmt.toFixed(2),
        "2.5%",
        sgstAmt.toFixed(2),
        itemTotal.toFixed(2)
      ]);
    });
    
    if (order.delivery_fee && parseFloat(order.delivery_fee) > 0) {
       const fee = parseFloat(order.delivery_fee);
       subtotal += fee;
       tableRows.push([
         tableRows.length + 1,
         "Delivery charges",
         fee.toFixed(2),
         "0.00",
         1,
         fee.toFixed(2),
         "0%",
         "0.00",
         "0%",
         "0.00",
         fee.toFixed(2)
       ]);
    }
    
    autoTable(doc, {
      startY: startY + gridHeight + 2,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 6, cellPadding: 2, textColor: [0,0,0], lineColor: [150,150,150], lineWidth: 0.1 },
      headStyles: { fillColor: [250, 250, 250], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'center' },
        5: { halign: 'right' },
        6: { halign: 'center' },
        7: { halign: 'right' },
        8: { halign: 'center' },
        9: { halign: 'right' },
        10: { halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });
    
    let finalY = doc.lastAutoTable.finalY;
    
    // --- TOTAL ROW ---
    doc.rect(14, finalY, 182, 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Total", 16, finalY + 4);
    doc.text(subtotal.toFixed(2), 194, finalY + 4, { align: 'right' });
    finalY += 6;
    
    // --- AMOUNT IN WORDS ---
    const amountInWords = `Rupees ${subtotal.toFixed(2)} Only`;
    doc.rect(14, finalY, 182, 6);
    doc.setFont("helvetica", "bold");
    doc.text("Amount in Words:", 16, finalY + 4);
    doc.setFont("helvetica", "normal");
    doc.text(amountInWords, 45, finalY + 4);
    finalY += 6;

    // --- COMPANY FOOTER BOX ---
    let footerHeight = 22;
    doc.rect(14, finalY, 182, footerHeight);
    
    doc.setFont("helvetica", "bold");
    doc.text("Passwala Logistics & Delivery Partner Services", 16, finalY + 5);
    
    doc.text("GSTIN:", 16, finalY + 9);
    doc.setFont("helvetica", "normal");
    doc.text("24AAACP1234Q1Z5", 35, finalY + 9);
    
    doc.setFont("helvetica", "bold");
    doc.text("CIN:", 16, finalY + 13);
    doc.setFont("helvetica", "normal");
    doc.text("U74999GJ2026PTC000000", 35, finalY + 13);
    
    doc.setFont("helvetica", "bold");
    doc.text("FSSAI License Number:", 80, finalY + 9);
    doc.setFont("helvetica", "normal");
    doc.text("10722999000123", 110, finalY + 9);
    
    doc.setFont("helvetica", "bold");
    doc.text("PAN:", 80, finalY + 13);
    doc.setFont("helvetica", "normal");
    doc.text("AAACP1234Q", 110, finalY + 13);
    
    // Signature
    doc.setFontSize(6);
    doc.text("Authorized Signatory", 170, finalY + 18, { align: 'center' });
    doc.line(155, finalY + 15, 185, finalY + 15); // Signature line
    finalY += footerHeight;
    
    // --- REVERSE CHARGE ---
    doc.rect(14, finalY, 182, 6);
    doc.setFont("helvetica", "bold");
    doc.text("Whether the tax is payable on reverse charge: No", 16, finalY + 4);
    finalY += 6;

    // --- TERMS & CONDITIONS ---
    doc.rect(14, finalY, 182, 28);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("Terms & Conditions:", 16, finalY + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text("1. If you have any issues or queries in respect of your order, please contact customer chat support through Passwala platform or drop in email at", 16, finalY + 9);
    doc.text("support@passwala.in.", 16, finalY + 12);
    doc.text("2. Please note that we never ask for bank account details such as CVV, account number, UPI Pin etc. across our support channels. For your safety please do", 16, finalY + 16);
    doc.text("not share these details with anyone over any medium.", 16, finalY + 19);
    doc.text("3. MRP displayed on the platform is as printed on the product package. Actual MRP and amount payable may be a function of offers, discounts and/or the", 16, finalY + 23);
    doc.text("revised GST rates made effective by Govt. From time to time.", 16, finalY + 26);
    
    doc.save(`Invoice_${orderId}.pdf`);
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="profile-sub-page"
      >
        <main className="sub-page-content">
          {loading ? (
            <div className="discovery-loading">
              <div className="spinner"></div>
              <p>Gathering your past orders...</p>
            </div>
          ) : (
            <div className="orders-list-profile">
              {orders.length === 0 ? (
                 <div className="empty-state-profile">
                    <ShoppingBag size={48} />
                    <h3>No orders yet</h3>
                    <p>When you place an order, it will appear here.</p>
                    <button onClick={() => navigate('/near-shops')} className="shop-now-btn">Shop Now</button>
                 </div>
              ) : (
                orders.map((order, i) => (
                  <motion.div 
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="order-history-card glass"
                  >
                    <div className="order-card-top">
                        <div className="order-main-info">
                           <strong>Order #{order.id.toString().slice(0, 8)}</strong>
                           <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                              <Clock size={12} /> {new Date(order.created_at).toLocaleDateString()}
                           </span>
                           {order.addresses?.society && (
                              <span style={{ color: 'var(--rider-primary)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                 <MapPin size={12} /> {order.addresses.society}
                              </span>
                           )}
                        </div>
                        <div className={`order-status-badge status-${order.status?.toLowerCase() || 'pending'}`}>
                           {getStatusIcon(order.status)}
                           <span>{order.status || 'Processing'}</span>
                        </div>
                    </div>
                    <div className="order-card-items">
                       <p>{order.items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0} items purchased</p>
                       <strong>₹{order.total_amount || 0}</strong>
                    </div>
                     <div className="order-card-footer" onClick={() => handleViewDetails(order)} style={{ cursor: 'pointer' }}>
                        <button className="reorder-btn" onClick={(e) => { e.stopPropagation(); handleViewDetails(order); }}>View Details</button>
                        <ChevronRight size={18} />
                     </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </main>
      </motion.div>

      <AnimatePresence>
        {selectedOrderDetails && (
          <div className="past-order-modal-overlay" onClick={() => setSelectedOrderDetails(null)}>
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="past-order-modal-content"
              onClick={e => e.stopPropagation()}
            >
              <div className="past-order-modal-header">
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>Order Details</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleDownloadInvoice(selectedOrderDetails)} style={{ background: 'var(--border-light, #f1f5f9)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: 'var(--primary, #ff7622)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Download Invoice">
                    <Download size={20} />
                  </button>
                  <button onClick={() => setSelectedOrderDetails(null)} style={{ background: 'var(--border-light, #f1f5f9)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: 'var(--text-secondary, #64748b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="past-order-modal-body">
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', background: 'rgba(0, 0, 0, 0.02)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-light, #f1f5f9)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 107, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary, #ff7622)' }}>
                    <Store size={24} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary, #1e293b)' }}>{selectedOrderDetails.stores?.name || selectedOrderDetails.items?.[0]?.store || 'Passwala Grocery Partner'}</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={14} /> Ordered on {new Date(selectedOrderDetails.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>

                {/* Address Section */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                    Delivery Address
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: 'rgba(0, 0, 0, 0.02)', borderRadius: '16px', border: '1px solid var(--border-light, #f1f5f9)' }}>
                    <MapPin size={20} color="var(--primary, #ff7622)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ color: 'var(--text-primary, #1e293b)', fontWeight: 700, fontSize: '0.95rem' }}>{selectedOrderDetails.addresses?.society || 'Thaltej'}</div>
                      <div style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.85rem', marginTop: '4px', lineHeight: 1.4 }}>{selectedOrderDetails.addresses?.address_line_1 || ''}</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Items Summary</h4>
                  <div style={{ border: '1px solid var(--border-light, #e2e8f0)', borderRadius: '12px', overflow: 'hidden' }}>
                    {(selectedOrderDetails.items || []).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: idx !== (selectedOrderDetails.items || []).length - 1 ? '1px solid var(--border-light, #e2e8f0)' : 'none', background: 'var(--bg-soft, #fff)' }}>
                        <span style={{ color: 'var(--text-primary, #334155)', fontWeight: 500 }}>{item.qty || item.quantity || 1}x {item.name || item.products?.name || 'Item'}</span>
                        <span style={{ color: 'var(--text-primary, #0f172a)', fontWeight: 600 }}>₹{item.price_at_purchase || item.price || 0}</span>
                      </div>
                    ))}
                    {(!selectedOrderDetails.items || selectedOrderDetails.items.length === 0) && (
                      <div style={{ padding: '12px 16px', color: 'var(--text-secondary, #64748b)' }}>Details not available</div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid var(--border-light, #e2e8f0)' }}>
                      <span style={{ color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>
                        {selectedOrderDetails.status?.toUpperCase() === 'CANCELLED' ? 'Total Refunded (Paytm)' : 'Total Paid'}
                      </span>
                      <span style={{ color: selectedOrderDetails.status?.toUpperCase() === 'CANCELLED' ? '#ef4444' : '#10b981', fontWeight: 800, fontSize: '1.1rem' }}>₹{selectedOrderDetails.total_price || selectedOrderDetails.total_amount}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Payment Info</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--border-light, #f1f5f9)', borderRadius: '12px' }}>
                    <CreditCard size={20} color="var(--text-secondary, #64748b)" />
                    <div>
                      <div style={{ color: 'var(--text-primary, #334155)', fontWeight: 600 }}>
                        {selectedOrderDetails.status?.toUpperCase() === 'CANCELLED' ? 'Refunded to Paytm' : (selectedOrderDetails.payment_method || 'Paid Online')}
                      </div>
                      <div style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.85rem', marginTop: '2px' }}>
                        Transaction ID: {selectedOrderDetails.id ? (typeof selectedOrderDetails.id === 'string' ? selectedOrderDetails.id.split('-')[0].toUpperCase() : String(selectedOrderDetails.id)) : ''}
                      </div>
                    </div>
                    <div style={{ 
                      marginLeft: 'auto', 
                      background: selectedOrderDetails.status?.toUpperCase() === 'CANCELLED' ? '#ef4444' : '#10b981', 
                      color: 'white', 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      padding: '4px 8px', 
                      borderRadius: '8px' 
                    }}>
                      {selectedOrderDetails.status?.toUpperCase() === 'CANCELLED' ? 'REFUNDED' : 'SUCCESS'}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OrderHistory;
