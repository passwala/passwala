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
  Download,
  Ticket,
  Calendar,
  QrCode,
  Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './ProfilePages.css';
import { useTranslation } from '../LanguageContext';
import { apiFetch } from '../../utils/apiClient';
import { OrderSkeleton, EventSkeleton } from '../components/Skeletons';

const _ = motion;

const OrderHistory = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'events'
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [eventBookings, setEventBookings] = useState([]);
  const [eventLoading, setEventLoading] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(null); // { booking } | null
  const [ratingModal, setRatingModal] = useState(null);     // { order } | null
  const [ratingValue, setRatingValue] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);         // hover preview
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratedOrderIds, setRatedOrderIds] = useState(new Set());
  // Ref to hold resolved user UUID for realtime filter — set on first fetchOrders
  const currentUserIdRef = React.useRef(null);
  // BUG B3 FIX: Use a React ref instead of window global to store event userId
  // This avoids stale/race condition when user navigates quickly
  const resolvedEventUserIdRef = React.useRef(null);
  // BUG B10 FIX: Store channel in a ref for proper cleanup on unmount
  const realtimeChannelRef = React.useRef(null);

  useEffect(() => {
    fetchOrders();
    fetchEventBookings();
    loadRatedOrderIds(); // ← pre-load from DB so badges survive refresh

    // ⚡ REAL-TIME: Listen for status updates on THIS user's orders only
    // BUG B10 FIX: Store channel in ref so cleanup runs on actual unmount
    const timer = setTimeout(() => {
      const userId = currentUserIdRef.current;
      const filterStr = userId ? `user_id=eq.${userId}` : undefined;

      const channelOptions = {
        event: '*',
        schema: 'public',
        table: 'orders',
        ...(filterStr ? { filter: filterStr } : {})
      };

      const channel = supabase
        .channel(`buyer-order-updates-${userId || 'anon'}`)
        .on('postgres_changes', channelOptions, (payload) => {
          fetchOrders();
          if (payload.new && payload.new.status === 'DELIVERED') {
            toast.success('Your order has been delivered! Enjoy!', { icon: '🎁' });
          }
        })
        .subscribe();

      // Store in ref for cleanup
      realtimeChannelRef.current = channel;
    }, 1500);

    return () => {
      clearTimeout(timer);
      // BUG B10 FIX: properly remove channel on unmount
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, []);

  const fetchEventBookings = async () => {
    setEventLoading(true);
    try {
      const savedUser = JSON.parse(localStorage.getItem('passwala_user') || '{}');
      let resolvedUserId = savedUser.id || savedUser.uid;

      // Resolve UUID if needed
      if (resolvedUserId && resolvedUserId.length !== 36) {
        const phoneNo = savedUser.phoneNumber?.replace('+91','') || savedUser.phone?.replace('+91','');
        const orFilters = [];
        if (savedUser.uid) orFilters.push(`uid.eq.${savedUser.uid}`);
        if (savedUser.email) orFilters.push(`email.eq.${savedUser.email}`);
        if (phoneNo) { orFilters.push(`phone.eq.${phoneNo}`); orFilters.push(`phone.eq.+91${phoneNo}`); }
        if (orFilters.length > 0) {
          const { data: usr } = await supabase.from('users').select('id').or(orFilters.join(',')).maybeSingle();
          resolvedUserId = usr?.id || null;
        } else resolvedUserId = null;
      }

      if (!resolvedUserId || resolvedUserId.length !== 36) return;

      const { data, error } = await supabase
        .from('event_bookings')
        .select(`
          id, ticket_count, total_amount, base_amount, cgst_amount, sgst_amount,
          status, qr_code_hash, invoice_number, created_at, tier_id,
          events!event_id(id, title, venue_name, event_date, banner_url, category, created_by),
          event_ticket_tiers!tier_id(id, tier_name, price)
        `)
        .eq('user_id', resolvedUserId)
        .order('created_at', { ascending: false });

      if (error) console.warn('Event bookings query error:', error.message);
      if (!error && data) {
        setEventBookings(data);
        // BUG B3 FIX: Store in React ref, not window global
        resolvedEventUserIdRef.current = resolvedUserId;
      }
    } catch (err) {
      console.warn('Failed to fetch event bookings:', err);
    } finally {
      setEventLoading(false);
    }
  };

  const BASE_URL = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);

  const handleCancelTicket = (booking) => {
    // Show custom confirm modal instead of browser dialog
    setCancelConfirm({ booking });
  };

  const confirmCancelTicket = async () => {
    if (!cancelConfirm) return;
    const { booking } = cancelConfirm;
    setCancelConfirm(null);
    // BUG B3 FIX: Read from React ref, not window global
    const userId = resolvedEventUserIdRef.current;
    if (!userId) { toast.error('Could not verify your identity. Please refresh and try again.'); return; }
    try {
      let authHeaders = { 'Content-Type': 'application/json' };
      try {
        const token = await getAuthToken();
        if (token) {
          authHeaders['Authorization'] = `Bearer ${token}`;
        }
      } catch (_) { /* no auth token */ }

      const data = await apiFetch(`${BASE_URL}/api/events/cancel`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ bookingId: booking.id, userId })
      });
      toast.success('Ticket cancelled. Seats have been released.');
      fetchEventBookings();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel ticket');
    }
  };

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
        // Store for realtime subscription filter
        currentUserIdRef.current = resolvedUserId;
        const apiBase = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);

        // BUG B4 FIX: Attach auth token (Firebase or WhatsApp session) — userAuth middleware requires it
        let authHeaders = { 'Content-Type': 'application/json' };
        try {
          const token = await getAuthToken();
          if (token) {
            authHeaders['Authorization'] = `Bearer ${token}`;
          }
        } catch (_) { /* no auth token */ }

        dbOrders = await apiFetch(`${apiBase}/api/orders/user-history/${resolvedUserId}`, {
          headers: authHeaders
        });
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

  /**
   * Load order IDs already rated by this user from DB.
   * So the ⭐ Rated badge shows even after page refresh.
   */
  const loadRatedOrderIds = async () => {
    try {
      const savedUser = JSON.parse(localStorage.getItem('passwala_user') || '{}');
      let resolvedUserId = savedUser.id;

      // Resolve UUID if needed
      if (!resolvedUserId || resolvedUserId.length !== 36) {
        const phoneNo = savedUser.phoneNumber?.replace('+91','') || savedUser.phone?.replace('+91','');
        const orFilters = [];
        if (savedUser.uid) orFilters.push(`uid.eq.${savedUser.uid}`);
        if (savedUser.email) orFilters.push(`email.eq.${savedUser.email}`);
        if (phoneNo) orFilters.push(`phone.eq.${phoneNo}`);
        if (orFilters.length > 0) {
          const { data: usr } = await supabase.from('users').select('id').or(orFilters.join(',')).maybeSingle();
          resolvedUserId = usr?.id || null;
        }
      }

      if (!resolvedUserId || resolvedUserId.length !== 36) return;

      const { data: ratings } = await supabase
        .from('order_ratings')
        .select('order_id')
        .eq('user_id', resolvedUserId);

      if (ratings && ratings.length > 0) {
        setRatedOrderIds(new Set(ratings.map(r => r.order_id)));
      }
    } catch (err) {
      console.warn('[loadRatedOrderIds] Failed:', err);
    }
  };

  async function getAuthToken() {
    try {
      const { auth: authObj } = await import('../../firebase');
      const currentUser = authObj?.currentUser;
      if (currentUser) {
        return await currentUser.getIdToken();
      }
    } catch (e) {
      console.warn("Failed to get Firebase ID token:", e);
    }
    const userJson = localStorage.getItem('passwala_user');
    const userObj = userJson ? JSON.parse(userJson) : null;
    const uid = userObj?.uid || userObj?.id || 'mock_user_123';
    return `mock_session_token_${uid}`;
  };

  const submitRating = async () => {
    if (!ratingModal || ratingValue === 0) { toast.error('Please select a star rating.'); return; }
    setRatingSubmitting(true);
    try {
      const token = await getAuthToken();
      const apiBase = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);

      const res = await fetch(`${apiBase}/api/orders/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          orderId: ratingModal.order.id,
          rating: ratingValue,
          comment: ratingComment.trim() || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast('You already rated this order.');
          setRatedOrderIds(prev => new Set([...prev, ratingModal.order.id]));
          setRatingModal(null);
        } else {
          throw new Error(data.error || 'Failed to submit rating.');
        }
        return;
      }
      setRatedOrderIds(prev => new Set([...prev, ratingModal.order.id]));
      toast.success('Thank you for your feedback! ⭐');
      setRatingModal(null);
      setRatingValue(0);
      setRatingComment('');
    } catch (err) {
      toast.error(err.message || 'Could not submit rating. Please try again.');
    } finally {
      setRatingSubmitting(false);
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
    const user = JSON.parse(localStorage.getItem('passwala_user') || '{}');

    // ── Seller / Store info
    const storeName    = order.stores?.name || 'Passwala Partner Store';
    const storeAddress = order.stores?.address || 'Ahmedabad, Gujarat';
    // GSTIN: stores table doesn't have this column yet — show placeholder or Mahadev GSTIN
    const isMahadev    = storeName.toLowerCase().includes('mahadev');
    const isShiv       = storeName.toLowerCase().includes('shiv');
    const storeGSTIN   = order.stores?.gstin || 
                         (isMahadev ? '24AAAMH4812K1Z9' : 
                          (isShiv ? '24BCBR78R78UF1Z' : 'Not Registered'));
    const storePhone   = order.stores?.phone || '';

    // ── Buyer / Customer info (name from users join, address from addresses)
    const customerName    = order.users?.full_name ||
                            order.addresses?.name ||
                            user?.displayName ||
                            user?.full_name || 'Customer';
    const customerPhone   = order.users?.phone || user?.phone || '';
    const addrLine1       = order.addresses?.address_line_1 || '';
    const addrLine2       = order.addresses?.address_line_2 || '';
    const addrCity        = order.addresses?.city || 'Ahmedabad';
    const addrState       = order.addresses?.state || 'Gujarat';
    const addrPincode     = order.addresses?.pincode || '380001';
    // Build clean address (no duplicates)
    const customerAddress = [addrLine1, addrLine2, addrCity]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)  // deduplicate
      .join(', ');

    const orderId     = order.id ? String(order.id).substring(0, 8).toUpperCase() : 'N/A';
    const invoiceNo   = `PW-${orderId}-INV`;
    const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
    const deliveredDate = order.updated_at
      ? new Date(order.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : invoiceDate;

    // ── PDF setup
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.1);

    // ── HEADER BAND
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(storeName.toUpperCase(), 14, 13);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Powered by Passwala • Tax Invoice', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ORIGINAL FOR BUYER', 196, 16, { align: 'right' });

    doc.setTextColor(0, 0, 0);

    // ── TOP INFO GRID (4 panels in 2 rows)
    const G = { x: 14, y: 32, w: 182, rowH: 52 };
    doc.setDrawColor(180, 180, 180);
    doc.rect(G.x, G.y, G.w, G.rowH * 2);
    // Row divider
    doc.line(G.x, G.y + G.rowH, G.x + G.w, G.y + G.rowH);
    // Col divider
    doc.line(G.x + 111, G.y, G.x + 111, G.y + G.rowH * 2);

    // ─ Panel A: Seller Info (top-left)
    const pA = { x: G.x + 2, y: G.y + 4 };
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLD BY:', pA.x, pA.y);
    doc.setFontSize(8.5);
    doc.text(storeName, pA.x, pA.y + 5);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    const addrLines = doc.splitTextToSize(storeAddress, 105);
    doc.text(addrLines, pA.x, pA.y + 11);
    if (storePhone) doc.text(`Ph: ${storePhone}`, pA.x, pA.y + 11 + addrLines.length * 4);

    doc.setFont('helvetica', 'bold');
    doc.text('GSTIN:', pA.x, pA.y + 38);
    doc.setFont('helvetica', 'normal');
    doc.text(storeGSTIN, pA.x + 12, pA.y + 38);
    doc.setFont('helvetica', 'bold');
    doc.text('PAN:', pA.x + 45, pA.y + 38);
    doc.setFont('helvetica', 'normal');
    doc.text(storeGSTIN !== 'Not Registered' ? storeGSTIN.substring(2, 12) : 'N/A', pA.x + 55, pA.y + 38);
    doc.setFont('helvetica', 'bold');
    doc.text('State:', pA.x, pA.y + 43);
    doc.setFont('helvetica', 'normal');
    doc.text('Gujarat (24)', pA.x + 11, pA.y + 43);

    // ─ Panel B: Invoice details (top-right)
    const pB = { x: G.x + 113, y: G.y + 4 };
    const addRow = (label, value, yOff) => {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text(label, pB.x, pB.y + yOff);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value), pB.x + 28, pB.y + yOff);
    };
    addRow('Invoice No.:', invoiceNo, 0);
    addRow('Invoice Date:', invoiceDate, 6);
    addRow('Delivery Date:', deliveredDate, 12);
    addRow('Place of Supply:', 'Gujarat (24)', 18);
    addRow('Order ID:', orderId, 24);
    addRow('Payment Mode:', order.payment_method || 'Online', 30);
    addRow('Payment Status:', order.payment_status || 'PAID', 36);

    // ─ Panel C: Bill-to (bottom-left)
    const pC = { x: G.x + 2, y: G.y + G.rowH + 4 };
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO:', pC.x, pC.y);
    doc.setFontSize(8);
    doc.text(customerName, pC.x, pC.y + 5);
    if (customerPhone) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Ph: ${customerPhone}`, pC.x, pC.y + 10);
    }
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    const custAddrLines = doc.splitTextToSize(customerAddress, 105);
    doc.text(custAddrLines, pC.x, pC.y + 15);
    doc.setFont('helvetica', 'bold');
    doc.text('State:', pC.x, pC.y + 15 + custAddrLines.length * 4 + 2);
    doc.setFont('helvetica', 'normal');
    doc.text(`${addrState} (24)`, pC.x + 11, pC.y + 15 + custAddrLines.length * 4 + 2);
    doc.setFont('helvetica', 'bold');
    doc.text('Pincode:', pC.x + 50, pC.y + 15 + custAddrLines.length * 4 + 2);
    doc.setFont('helvetica', 'normal');
    doc.text(addrPincode, pC.x + 65, pC.y + 15 + custAddrLines.length * 4 + 2);

    // ─ Panel D: GSTIN of buyer (bottom-right)
    const pD = { x: G.x + 113, y: G.y + G.rowH + 4 };
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text('BUYER GSTIN:', pD.x, pD.y);
    doc.setFont('helvetica', 'normal');
    doc.text('Unregistered Consumer', pD.x, pD.y + 5);

    // ── ITEM TABLE
    const tableStartY = G.y + G.rowH * 2 + 3;
    const tableColumns = [
      'Sr', 'HSN', 'Item Description', 'MRP', 'Disc.', 'Qty',
      'Taxable Val.', 'CGST%', 'CGST Rs.', 'SGST%', 'SGST Rs.', 'Total'
    ];
    const tableRows = [];
    let subtotal       = 0;
    let totalCGST      = 0;
    let totalSGST      = 0;
    let totalTaxable   = 0;
    const GST_RATE     = 5;   // 5% GST (CGST 2.5% + SGST 2.5%) — standard for grocery/food
    const CGST_RATE    = GST_RATE / 2;
    const SGST_RATE    = GST_RATE / 2;
    const HSN_DEFAULT  = '0401'; // Generic food HSN

    (order.items || []).forEach((item, idx) => {
      const mrp      = parseFloat(item.price || item.price_at_purchase || 0);
      const qty      = parseInt(item.qty || item.quantity || 1);
      const taxable  = mrp * qty;
      const cgst     = taxable * CGST_RATE / 100;
      const sgst     = taxable * SGST_RATE / 100;
      const lineTotal = taxable + cgst + sgst;

      subtotal     += lineTotal;
      totalCGST    += cgst;
      totalSGST    += sgst;
      totalTaxable += taxable;

      tableRows.push([
        idx + 1,
        HSN_DEFAULT,
        item.name || item.products?.name || 'Item',
        mrp.toFixed(2),
        '0.00',
        qty,
        taxable.toFixed(2),
        `${CGST_RATE}%`,
        cgst.toFixed(2),
        `${SGST_RATE}%`,
        sgst.toFixed(2),
        lineTotal.toFixed(2),
      ]);
    });

    // Delivery fee row
    const deliveryFee = parseFloat(order.delivery_fee || 0);
    if (deliveryFee > 0) {
      subtotal += deliveryFee;
      tableRows.push([
        tableRows.length + 1, '9965', 'Delivery Charges',
        deliveryFee.toFixed(2), '0.00', 1,
        deliveryFee.toFixed(2), '0%', '0.00', '0%', '0.00', deliveryFee.toFixed(2),
      ]);
    }

    autoTable(doc, {
      startY: tableStartY,
      head: [tableColumns],
      body: tableRows,
      theme: 'grid',
      styles: { fontSize: 6, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.1 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 5.5 },
      columnStyles: {
        0:  { halign: 'center', cellWidth: 8 },
        1:  { halign: 'center', cellWidth: 14 },
        2:  { cellWidth: 40 },
        3:  { halign: 'right', cellWidth: 14 },
        4:  { halign: 'right', cellWidth: 12 },
        5:  { halign: 'center', cellWidth: 8 },
        6:  { halign: 'right', cellWidth: 18 },
        7:  { halign: 'center', cellWidth: 12 },
        8:  { halign: 'right', cellWidth: 14 },
        9:  { halign: 'center', cellWidth: 12 },
        10: { halign: 'right', cellWidth: 14 },
        11: { halign: 'right', cellWidth: 14 },
      },
      margin: { left: 14, right: 14 },
    });

    let finalY = doc.lastAutoTable.finalY + 2;

    // ── TAX SUMMARY TABLE (right-aligned block)
    const totalGST = totalCGST + totalSGST;
    const summaryRows = [
      ['Taxable Amount', `Rs. ${totalTaxable.toFixed(2)}`],
      [`CGST @ ${CGST_RATE}%`, `Rs. ${totalCGST.toFixed(2)}`],
      [`SGST @ ${SGST_RATE}%`, `Rs. ${totalSGST.toFixed(2)}`],
    ];
    if (deliveryFee > 0) {
      summaryRows.push(['Delivery Charges', `Rs. ${deliveryFee.toFixed(2)}`]);
    }
    summaryRows.push(['Total Tax (GST)', `Rs. ${totalGST.toFixed(2)}`]);
    summaryRows.push(['GRAND TOTAL', `Rs. ${subtotal.toFixed(2)}`]);

    autoTable(doc, {
      startY: finalY,
      head: [['Description', 'Amount']],
      body: summaryRows,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, textColor: [0, 0, 0], lineColor: [180, 180, 180], lineWidth: 0.1 },
      headStyles: { fillColor: [248, 250, 252], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      bodyStyles: { halign: 'right' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 50 }, 1: { cellWidth: 30 } },
      margin: { left: 196 - 80, right: 14 },
      didParseCell: (data) => {
        if (data.row.index === summaryRows.length - 1) {
          data.cell.styles.fillColor = [15, 23, 42];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    finalY = doc.lastAutoTable.finalY + 2;

    // ── AMOUNT IN WORDS
    const toWords = (n) => {
      const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
        'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
      const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
      if (n === 0) return 'Zero';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
      if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + toWords(n%100) : '');
      if (n < 100000) return toWords(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + toWords(n%1000) : '');
      return toWords(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + toWords(n%100000) : '');
    };

    const rupees = Math.floor(subtotal);
    const paise  = Math.round((subtotal - rupees) * 100);
    const amtWords = `Indian Rupee ${toWords(rupees)}${paise > 0 ? ' and ' + toWords(paise) + ' Paise' : ''} Only`;

    doc.setFillColor(248, 250, 252);
    doc.rect(14, finalY, 182, 8, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.rect(14, finalY, 182, 8);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Amount in Words:', 16, finalY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(amtWords, 50, finalY + 5);
    finalY += 10;

    // ── TERMS
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', 14, finalY + 4);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('1. For issues/queries contact support@passwala.in or use in-app chat.', 14, finalY + 9);
    doc.text('2. Never share bank/UPI details with anyone. Passwala will never ask for them.', 14, finalY + 13);
    doc.text('3. MRP is as printed on package. Final amount may vary due to offers or revised GST rates.', 14, finalY + 17);
    finalY += 22;

    // ── FOOTER BAND
    doc.setFillColor(15, 23, 42);
    doc.rect(0, finalY, 210, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Platform / Facilitator: Passwala', 14, finalY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text('CIN: U74999GJ2026PTC000000', 14, finalY + 11);
    doc.text('Email: support@passwala.in  |  Website: www.passwala.in', 14, finalY + 16);
    doc.setFont('helvetica', 'bold');
    doc.text('Authorised Signatory', 194, finalY + 16, { align: 'right' });
    doc.setDrawColor(150, 150, 150);
    doc.line(160, finalY + 12, 194, finalY + 12);

    // Reverse charge
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text('Whether tax is payable on reverse charge basis: No', 14, finalY + 25);

    doc.save(`Invoice_${storeName.replace(/\s+/g, '_')}_${orderId}.pdf`);
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
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', background: '#f1f5f9', padding: '5px', borderRadius: '14px' }}>
            <button
              onClick={() => setActiveTab('orders')}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.875rem',
                background: activeTab === 'orders' ? 'white' : 'transparent',
                color: activeTab === 'orders' ? 'var(--primary, #ff6b00)' : '#64748b',
                boxShadow: activeTab === 'orders' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              🛍 {t('orders') || 'Orders'}
            </button>
            <button
              onClick={() => setActiveTab('events')}
              style={{
                flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.875rem',
                background: activeTab === 'events' ? 'white' : 'transparent',
                color: activeTab === 'events' ? 'var(--primary, #ff6b00)' : '#64748b',
                boxShadow: activeTab === 'events' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}
            >
              🎟 {t('event_tickets') || 'Event Tickets'}
              {eventBookings.length > 0 && (
                <span style={{ background: 'var(--primary, #ff6b00)', color: 'white', borderRadius: '20px', padding: '1px 8px', fontSize: '0.72rem', fontWeight: 800 }}>
                  {eventBookings.length}
                </span>
              )}
            </button>
          </div>

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            loading ? (
              <OrderSkeleton count={3} />
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
                        {order.status?.toUpperCase() === 'DELIVERED' && !ratedOrderIds.has(order.id) && (
                          <button
                            className="reorder-btn"
                            style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)', color: '#92400e', border: '1px solid #fbbf24', marginLeft: '6px' }}
                            onClick={(e) => { e.stopPropagation(); setRatingModal({ order }); setRatingValue(0); setRatingComment(''); }}
                          >
                            ⭐ Rate Order
                          </button>
                        )}
                        {ratedOrderIds.has(order.id) && (
                          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, marginLeft: '8px' }}>⭐ Rated</span>
                        )}
                        <ChevronRight size={18} />
                     </div>
                  </motion.div>
                ))
              )}
            </div>
            )
          )}

          {/* EVENT TICKETS TAB */}
          {activeTab === 'events' && (
            eventLoading ? (
              <EventSkeleton count={2} />
            ) : eventBookings.length === 0 ? (
              <div className="empty-state-profile">
                <Ticket size={48} />
                <h3>No event tickets yet</h3>
                <p>When you book event tickets, they'll appear here.</p>
                <button onClick={() => navigate('/events')} className="shop-now-btn">Browse Events</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {eventBookings.map((booking, i) => {
                  const event = booking.events;
                  const tier = booking.event_ticket_tiers;
                  return (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{
                        background: 'white', borderRadius: '20px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                        overflow: 'hidden', border: '1px solid #f1f5f9'
                      }}
                    >
                      {/* Banner */}
                      <div style={{ position: 'relative', height: '100px' }}>
                        <img
                          src={event?.banner_url || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80'}
                          alt={event?.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80';
                          }}
                        />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.7) 100%)' }} />
                        <div style={{ position: 'absolute', bottom: 10, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <h4 style={{ margin: 0, color: 'white', fontWeight: 800, fontSize: '1rem' }}>{event?.title}</h4>
                          <span style={{ 
                            background: booking.status === 'CONFIRMED' ? '#22c55e' : booking.status === 'COMPLETED' ? '#16a34a' : booking.status === 'CANCELLED' ? '#ef4444' : '#f59e0b', 
                            color: 'white', padding: '3px 10px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 800 
                          }}>
                            {booking.status === 'COMPLETED' ? '✅ Attended' : booking.status}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} /> {event?.event_date ? new Date(event.event_date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={13} /> {event?.venue_name || '—'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                            <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '8px', fontWeight: 600 }}>{tier?.tier_name || 'Standard'}</span>
                            <span style={{ marginLeft: '8px' }}>{booking.ticket_count} ticket{booking.ticket_count > 1 ? 's' : ''}</span>
                          </div>
                          <span style={{ fontWeight: 800, color: 'var(--primary, #ff6b00)', fontSize: '1rem' }}>₹{booking.total_amount || 0}</span>
                        </div>

                        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #e2e8f0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => navigate('/events/ticket', { state: { booking, event, tier } })}
                            style={{ flex: 1, minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--primary, #ff6b00)', color: 'white', border: 'none', padding: '10px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                          >
                            <QrCode size={15} /> View Ticket
                          </button>
                          {/* Cancel button — only if CONFIRMED and event hasn't happened yet */}
                          {booking.status === 'CONFIRMED' && event?.event_date && new Date(event.event_date) > new Date() && (
                            <button
                              onClick={() => handleCancelTicket(booking)}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fecaca', padding: '10px 14px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
                            >
                              ✕ Cancel
                            </button>
                          )}
                          <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.72rem', color: '#94a3b8' }}>
                            {new Date(booking.created_at).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )
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

      {/* ── Custom Cancel Confirm Modal ──────────────────────────────── */}
      <AnimatePresence>
        {cancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(15,23,42,0.55)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1.5rem'
            }}
            onClick={() => setCancelConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.82, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'white',
                borderRadius: '24px',
                padding: '2rem',
                maxWidth: '340px',
                width: '100%',
                boxShadow: '0 32px 64px rgba(0,0,0,0.22)',
                textAlign: 'center'
              }}
            >
              {/* Warning Icon */}
              <div style={{
                width: '64px', height: '64px',
                background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem',
                border: '3px solid rgba(239,68,68,0.15)'
              }}>
                <span style={{ fontSize: '1.8rem' }}>🎫</span>
              </div>

              {/* Title */}
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Cancel Ticket?
              </h3>

              {/* Event name */}
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5 }}>
                You are cancelling your ticket for
              </p>
              <p style={{
                margin: '0 0 1.5rem',
                fontSize: '1rem', fontWeight: 700, color: '#ef4444',
                background: 'rgba(239,68,68,0.07)',
                borderRadius: '10px', padding: '8px 14px',
                display: 'inline-block'
              }}>
                "{cancelConfirm.booking?.events?.title || 'this event'}"
              </p>

              {/* Warning note */}
              <div style={{
                background: '#fff7ed',
                border: '1.5px solid rgba(251,146,60,0.3)',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '1.5rem',
                display: 'flex', alignItems: 'flex-start', gap: '8px', textAlign: 'left'
              }}>
                <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#9a3412', lineHeight: 1.5 }}>
                  This <strong>cannot be undone</strong>. Your seats will be released back to the pool.
                </p>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setCancelConfirm(null)}
                  style={{
                    flex: 1, padding: '0.85rem',
                    background: '#f1f5f9', color: '#475569',
                    border: 'none', borderRadius: '14px',
                    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                >
                  Keep Ticket
                </button>
                <button
                  onClick={confirmCancelTicket}
                  style={{
                    flex: 1, padding: '0.85rem',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: 'white',
                    border: 'none', borderRadius: '14px',
                    fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
                    transition: 'opacity 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating Modal */}
      <AnimatePresence>
        {ratingModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setRatingModal(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              style={{ background: 'white', borderRadius: '28px 28px 0 0', padding: '0', width: '100%', maxWidth: '480px', boxShadow: '0 -12px 50px rgba(0,0,0,0.22)', overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}
            >
              {/* ── Header band */}
              <div style={{ background: 'linear-gradient(135deg,#fff7ed,#fffbeb)', padding: '1.4rem 1.5rem 1rem', borderBottom: '1px solid #fde68a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontWeight: 900, fontSize: '1.15rem', color: '#0f172a' }}>{t('rate_order')} ⭐</h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#92400e', fontWeight: 600 }}>
                      {t('order_no')} #{ratingModal.order.id?.slice(0,8).toUpperCase()}
                      {ratingModal.order.stores?.name ? ` · ${ratingModal.order.stores.name}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => { setRatingModal(null); setRatingValue(0); setHoverRating(0); setRatingComment(''); }}
                    style={{ background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div style={{ padding: '1.5rem' }}>
                {/* ── Emoji display */}
                <div style={{ textAlign: 'center', fontSize: '3rem', marginBottom: '0.5rem', lineHeight: 1, minHeight: '3.5rem', transition: 'all 0.2s' }}>
                  {['😶', '😞', '😐', '🙂', '😊', '🤩'][hoverRating || ratingValue]}
                </div>

                {/* ── Star picker — hover + click */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '0.6rem' }}>
                  {[1,2,3,4,5].map(s => {
                    const isActive = s <= (hoverRating || ratingValue);
                    return (
                      <button
                        key={s}
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRatingValue(s)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px',
                          transform: s === ratingValue ? 'scale(1.35)' : isActive ? 'scale(1.15)' : 'scale(1)',
                          transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1), filter 0.15s',
                          filter: isActive ? 'drop-shadow(0 2px 6px rgba(245,158,11,0.5))' : 'none'
                        }}
                      >
                        <Star
                          size={38}
                          fill={isActive ? '#f59e0b' : 'none'}
                          color={isActive ? '#f59e0b' : '#d1d5db'}
                          strokeWidth={1.8}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* ── Rating label */}
                <p style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.25rem', minHeight: '1.4rem',
                  color: (hoverRating || ratingValue) > 0 ? '#d97706' : '#94a3b8',
                  transition: 'color 0.2s'
                }}>
                  {[
                    hoverRating || ratingValue,
                    ['', t('rate_terrible') !== 'rate_terrible' ? t('rate_terrible') : 'Terrible 😞', t('rate_not_good') !== 'rate_not_good' ? t('rate_not_good') : 'Not Good 😕', t('rate_okay') !== 'rate_okay' ? t('rate_okay') : 'Okay 🙂', t('rate_very_good') !== 'rate_very_good' ? t('rate_very_good') : 'Very Good 😊', t('rate_excellent') !== 'rate_excellent' ? t('rate_excellent') : 'Excellent! 🤩'][hoverRating || ratingValue]
                  ][1]}
                </p>

                {/* ── Comment textarea */}
                <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                  <textarea
                    placeholder={t('tell_us_more') !== 'tell_us_more' ? t('tell_us_more') : "Tell us more (optional)..."}
                    value={ratingComment}
                    onChange={e => setRatingComment(e.target.value)}
                    maxLength={300}
                    rows={3}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: '14px',
                      border: `1.5px solid ${ratingValue > 0 ? '#fde68a' : '#e2e8f0'}`,
                      fontSize: '0.88rem', resize: 'none', outline: 'none',
                      background: ratingValue > 0 ? '#fffbeb' : '#f8fafc',
                      boxSizing: 'border-box', lineHeight: 1.5, color: '#0f172a',
                      transition: 'border-color 0.2s, background 0.2s'
                    }}
                  />
                  <span style={{ position: 'absolute', bottom: '8px', right: '12px', fontSize: '0.7rem', color: '#94a3b8' }}>
                    {ratingComment.length}/300
                  </span>
                </div>

                {/* ── Submit button */}
                <motion.button
                  onClick={submitRating}
                  disabled={ratingSubmitting || ratingValue === 0}
                  whileTap={{ scale: ratingValue > 0 ? 0.97 : 1 }}
                  style={{
                    width: '100%', padding: '14px',
                    background: ratingValue === 0
                      ? '#e2e8f0'
                      : `linear-gradient(135deg, ${{ 1:'#ef4444', 2:'#f97316', 3:'#eab308', 4:'#22c55e', 5:'#f59e0b' }[ratingValue]}, ${{ 1:'#dc2626', 2:'#ea580c', 3:'#ca8a04', 4:'#16a34a', 5:'#d97706' }[ratingValue]})`,
                    color: ratingValue === 0 ? '#94a3b8' : 'white',
                    border: 'none', borderRadius: '16px', fontWeight: 900, fontSize: '1rem',
                    cursor: ratingValue === 0 || ratingSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: ratingValue > 0 ? '0 6px 20px rgba(245,158,11,0.35)' : 'none',
                    transition: 'all 0.25s'
                  }}
                >
                  {ratingSubmitting
                    ? (t('submitting') !== 'submitting' ? t('submitting') : '⏳ Submitting...')
                    : ratingValue === 0
                      ? (t('select_rating_above') !== 'select_rating_above' ? t('select_rating_above') : 'Select a rating above')
                      : (t('submit_n_star_rating') !== 'submit_n_star_rating' ? t('submit_n_star_rating').replace('{stars}', ['', '1 ★', '2 ★★', '3 ★★★', '4 ★★★★', '5 ★★★★★'][ratingValue]) : `Submit ${['','1 ★','2 ★★','3 ★★★','4 ★★★★','5 ★★★★★'][ratingValue]} Rating`)}
                </motion.button>

                <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.75rem' }}>
                  {t('feedback_direct_store') !== 'feedback_direct_store' ? t('feedback_direct_store') : 'Your feedback goes directly to the store'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OrderHistory;
