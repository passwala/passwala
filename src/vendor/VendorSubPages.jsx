import React from 'react';
import ReactDOM from 'react-dom';
import { Package, FileText, IndianRupee, Wallet, Star, Bell, HelpCircle, CheckCircle, Clock, MapPin, Download, ArrowUpRight, ArrowDownRight, Tag, Trash2, PackagePlus, Camera, Wrench, AlertTriangle, X, Calendar, ScanLine, Zap, QrCode, Layers, Trophy } from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import { getOSRMRoute } from '../utils/dijkstra';
import { AHMEDABAD_AREA_COORDS } from '../utils/constants';
import jsQR from 'jsqr';

const safeSetLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`localStorage setItem failed for key "${key}":`, e);
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      try {
        localStorage.removeItem('vProfileImage');
        localStorage.setItem(key, value);
      } catch (retryErr) {
        console.error("Retry setItem failed after clearing profile image:", retryErr);
      }
    }
  }
};

// ── Upload image to Supabase Storage and return public URL ───────────────────
// Converts base64 dataURL → Blob → uploads to 'event-images' bucket
// Falls back to original dataURL if upload fails (e.g. bucket not yet created)
const uploadImageToSupabase = async (dataUrl, folder = 'events') => {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;
  try {
    // Convert base64 to Blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = blob.type.split('/')[1] || 'jpg';
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('event-images')
      .upload(fileName, blob, { contentType: blob.type, upsert: false });

    if (error) {
      console.warn('Supabase Storage upload failed, keeping dataURL:', error.message);
      return dataUrl; // fallback: keep original
    }

    const { data: urlData } = supabase.storage.from('event-images').getPublicUrl(data.path);
    return urlData?.publicUrl || dataUrl;
  } catch (err) {
    console.warn('Image upload error:', err);
    return dataUrl; // fallback: keep original
  }
};

// ── QR Scanner Modal (camera-based) ─────────────────────────────────────────
const QRScannerModal = ({ isOpen, onClose, onScan, businessType }) => {
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const animFrameRef = React.useRef(null);
  const scanFoundRef = React.useRef(false);
  const cooldownRef = React.useRef(false);      // 1.5s cooldown between invalid scans
  const [scanning, setScanning] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [scanned, setScanned] = React.useState(false);
  const [invalidMsg, setInvalidMsg] = React.useState('');

  // Only accept proper Passwalaa QR codes — reject plain barcodes / random numbers
  const isValidQR = (data) => {
    if (!data) return false;
    const d = data.trim();
    // Accept PW-EVT prefix, UUID format, or any non-pure-numeric string
    const isPureNumeric = /^\d+$/.test(d);
    return !isPureNumeric && d.length > 8;
  };

  React.useEffect(() => {
    if (!isOpen) {
      scanFoundRef.current = false;
      cooldownRef.current = false;
      setScanned(false);
      setInvalidMsg('');
      return;
    }
    setError(null);
    setScanned(false);
    setInvalidMsg('');
    scanFoundRef.current = false;
    cooldownRef.current = false;

    const startCamera = async () => {
      // Camera API requires HTTPS (or localhost)
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isSecure) {
        setError('🔒 Scanner requires HTTPS. Please open the app on a secure (https://) connection or localhost to use the camera.');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera not supported on this browser. Please use Chrome or Safari on a mobile device.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setScanning(true);
          startScanLoop();
        }
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please tap "Allow" when prompted, or enable camera in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError('Could not start camera: ' + err.message);
        }
      }
    };

    const startScanLoop = () => {
      let lastScanTime = 0;
      const tick = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
          animFrameRef.current = requestAnimationFrame(tick);
          return;
        }
        if (scanFoundRef.current || cooldownRef.current) {
          animFrameRef.current = requestAnimationFrame(tick);
          return;
        }

        const now = Date.now();
        // Limit scanner analysis to 5-6 runs per second to prevent CPU overload
        if (now - lastScanTime > 180) {
          lastScanTime = now;

          // Downscale the camera resolution for faster QR decoding (max 360px dimension)
          const maxDim = 360;
          let w = video.videoWidth;
          let h = video.videoHeight;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
          ctx.drawImage(video, 0, 0, w, h);

          const imageData = ctx.getImageData(0, 0, w, h);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data) {
            if (isValidQR(code.data)) {
              scanFoundRef.current = true;
              setScanned(true);
              setTimeout(() => {
                onScan(code.data.trim());
              }, 300);
              return;
            } else {
              cooldownRef.current = true;
              setInvalidMsg('Invalid code — show the ticket QR');
              setTimeout(() => {
                cooldownRef.current = false;
                setInvalidMsg('');
              }, 1500);
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setScanning(false);
    };
  }, [isOpen, onScan]);


  if (!isOpen) return null;

  const modalContent = (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.82)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(6px)',
      padding: '1.5rem',
    }}>
      <div style={{
        background: '#0f172a',
        borderRadius: '22px',
        padding: '1.75rem',
        width: '100%',
        maxWidth: '440px',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg,#16a34a,#15803d)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <QrCode size={20} color="white" />
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'white', fontWeight: 800, fontSize: '1.05rem' }}>Scan QR to Check In</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.78rem' }}>Point camera at attendee's ticket QR</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '10px', width: '34px', height: '34px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Camera Preview — fixed 300px height */}
        <div style={{ position: 'relative', width: '100%', height: '300px', borderRadius: '16px', overflow: 'hidden', background: '#000', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Dark vignette to guide eye to center */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.55) 100%)' }} />

          {/* Scanner frame — 190×190 with explicit L-bracket corners */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '190px', height: '190px', position: 'relative' }}>
              {/* Top-left corner */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '26px', height: '26px', borderTop: '3px solid #22c55e', borderLeft: '3px solid #22c55e', borderRadius: '2px 0 0 0' }} />
              {/* Top-right corner */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: '26px', height: '26px', borderTop: '3px solid #22c55e', borderRight: '3px solid #22c55e', borderRadius: '0 2px 0 0' }} />
              {/* Bottom-left corner */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '26px', height: '26px', borderBottom: '3px solid #22c55e', borderLeft: '3px solid #22c55e', borderRadius: '0 0 0 2px' }} />
              {/* Bottom-right corner */}
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '26px', height: '26px', borderBottom: '3px solid #22c55e', borderRight: '3px solid #22c55e', borderRadius: '0 0 2px 0' }} />
              {/* Animated scan line */}
              <div style={{ position: 'absolute', top: 0, left: '4px', right: '4px', height: '2px', background: 'linear-gradient(90deg, transparent, #22c55e, transparent)', animation: 'scanline 2s linear infinite', boxShadow: '0 0 6px #22c55e' }} />
            </div>
          </div>

          {/* Loading state */}
          {!scanning && !error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.6)' }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.15)', borderTop: '3px solid #22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>Starting camera...</span>
            </div>
          )}
          {/* Error state */}
          {error && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.7)', padding: '1.5rem', textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem' }}>📷</span>
              <p style={{ color: '#f59e0b', fontSize: '0.85rem', fontWeight: 700, margin: 0, lineHeight: 1.4 }}>{error}</p>
            </div>
          )}
          {/* ✅ QR Detected — green flash */}
          {scanned && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', background: 'rgba(22,163,74,0.85)', transition: 'all 0.3s' }}>
              <div style={{ width: '64px', height: '64px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(34,197,94,0.6)' }}>
                <span style={{ fontSize: '2rem' }}>✓</span>
              </div>
              <span style={{ color: 'white', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.5px' }}>QR Detected!</span>
            </div>
          )}
          {/* ❌ Invalid code feedback (cooldown) */}
          {invalidMsg && (
            <div style={{ position: 'absolute', bottom: '16px', left: 0, right: 0, textAlign: 'center' }}>
              <span style={{ background: 'rgba(239,68,68,0.85)', color: 'white', fontSize: '0.75rem', fontWeight: 700, padding: '5px 14px', borderRadius: '20px', letterSpacing: '0.5px' }}>
                ⚠ {invalidMsg}
              </span>
            </div>
          )}
          {/* "Align QR here" label — only when actively scanning and no invalid msg */}
          {scanning && !error && !scanned && !invalidMsg && (
            <div style={{ position: 'absolute', bottom: '16px', left: 0, right: 0, textAlign: 'center' }}>
              <span style={{ background: 'rgba(0,0,0,0.6)', color: '#4ade80', fontSize: '0.72rem', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', letterSpacing: '0.5px' }}>
                ALIGN QR CODE WITHIN FRAME
              </span>
            </div>
          )}
        </div>

        {/* Tip */}
        <p style={{ color: '#475569', fontSize: '0.72rem', textAlign: 'center', margin: '1rem 0 0 0', lineHeight: 1.5 }}>
          📱 Ask attendee to open <strong style={{ color: '#94a3b8' }}>Order History → {businessType === 'sports' ? 'Sports Slots' : 'My Events'} → View Ticket</strong>
        </p>

        <style>{`
          @keyframes scanline {
            0% { top: 4px; }
            100% { top: calc(100% - 6px); }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};


export const ConfirmModal = ({ isOpen, title, message, confirmText, cancelText, onConfirm, onCancel, type = 'danger' }) => {
  const content = (
    <AnimatePresence>
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '1.5rem',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            style={{
              background: 'white',
              borderRadius: '24px',
              padding: '2rem',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
              border: '1px solid #f1f5f9',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
              position: 'relative'
            }}
          >
            <div 
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: type === 'danger' ? '#fef2f2' : '#fff7ed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: type === 'danger' ? '0 10px 15px -3px rgba(239, 68, 68, 0.1)' : '0 10px 15px -3px rgba(249, 115, 22, 0.1)'
              }}
            >
              {type === 'danger' ? (
                <Trash2 size={32} color="#ef4444" />
              ) : (
                <AlertTriangle size={32} color="#f97316" />
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>{title}</h3>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748b', fontWeight: 600, lineHeight: 1.5 }}>{message}</p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
              <button 
                type="button"
                onClick={onCancel}
                className="v-btn-outline" 
                style={{ flex: 1, padding: '14px', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer' }}
              >
                {cancelText || 'Cancel'}
              </button>
              <button 
                type="button"
                onClick={onConfirm}
                className="v-btn-primary" 
                style={{ 
                  flex: 1, 
                  padding: '14px', 
                  borderRadius: '14px', 
                  fontSize: '0.95rem', 
                  fontWeight: 800, 
                  background: type === 'danger' ? '#dc2626' : '#ea580c', 
                  borderColor: type === 'danger' ? '#dc2626' : '#ea580c',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: type === 'danger' ? '0 10px 20px rgba(220, 38, 38, 0.15)' : '0 10px 20px rgba(234, 88, 12, 0.15)'
                }}
              >
                {confirmText || 'Confirm'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
  return ReactDOM.createPortal(content, document.body);
};

export const VendorInventory = ({ vendorData, businessType, storeId, _setActiveTab }) => {
  const [items, setItems] = React.useState([]);
  const loadedBusinessTypeRef = React.useRef(businessType);

  React.useEffect(() => {
    setItems([]);
  }, [businessType]);

  const [showForm, setShowForm] = React.useState(false);
  const [eventWizardStep, setEventWizardStep] = React.useState(1);
  const wizardScrollRef = React.useRef(null);

  React.useEffect(() => {
    if (wizardScrollRef.current) {
      wizardScrollRef.current.scrollTop = 0;
    }
  }, [eventWizardStep, showForm]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [showQrScanner, setShowQrScanner] = React.useState(false);
  const [checkinResult, setCheckinResult] = React.useState(null); // { success, booking, error, status }
  const [checkinLoading, setCheckinLoading] = React.useState(false);
  const [newItem, setNewItem] = React.useState({ 
    name: '', 
    detail: '', 
    price: '299', 
    image: null, 
    barcode: '', 
    barcode_type: 'EAN-13', 
    stock_quantity: '', 
    category_id: '', 
    category: 'Music & Concerts', 
    venue_name: '', 
    event_date: '',
    booking_start: '',
    booking_end: '',
    show_type: 'single',
    duration: '',
    age_restriction: '',
    language: '',
    schedule_slots: [
      { id: Date.now(), date: '', starts: '19:00', ends: '22:00', venue_name: '' }
    ],
    ticket_tiers: [
      { tier_name: 'General Admission', price: '299', total_seats: '100', booking_open: '', booking_close: '' }
    ]
  });
  const [confirmDialog, setConfirmDialog] = React.useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger'
  });

  const eventImages = React.useMemo(() => {
    const raw = newItem.image || '';
    if (typeof raw === 'string' && raw.startsWith('[')) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
      } catch (_) { /* ignore */ }
    }
    return raw ? [raw] : [];
  }, [newItem.image]);

  const handleAddEventImage = (dataUrl) => {
    if (!dataUrl) return;
    const nextList = [...eventImages, dataUrl];
    const serialized = JSON.stringify(nextList);
    setNewItem(prev => ({ ...prev, image: serialized }));
  };

  const handleRemoveEventImage = (index) => {
    const nextList = eventImages.filter((_, idx) => idx !== index);
    const serialized = nextList.length > 1 ? JSON.stringify(nextList) : (nextList[0] || null);
    setNewItem(prev => ({ ...prev, image: serialized }));
  };

  // Compute minimum allowed datetime string (now, in local timezone, YYYY-MM-DDTHH:MM format)

  const fetchCatalog = React.useCallback(async () => {
    if (!storeId && !vendorData?.user_id) {
      setItems([]);
      loadedBusinessTypeRef.current = businessType;
      return;
    }

    let dbItems = [];
    const effectiveId = storeId || vendorData?.id || vendorData?.user_id;
    const isValidUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(effectiveId);
    if (supabase && (isValidUuid || businessType === 'event')) {
      try {
        let data = null;
        let error = null;
        if (businessType === 'sports') {
          const BASE_URL = window.location.protocol === 'https:'
            ? ''
            : (window._API_URL || `http://${window.location.hostname}:3004`);
          const res = await fetch(`${BASE_URL}/api/sports/vendor-venues?owner_id=${storeId || vendorData?.id}`);
          const resData = await res.json();
          if (res.ok && resData.success) {
            data = resData.venues;
          } else {
            error = { message: resData.error || 'Failed to fetch venues' };
          }
        } else {
          const targetTable = businessType === 'shop' ? 'products' : businessType === 'event' ? 'events' : 'services';
          let query = supabase.from(targetTable).select('*');
          if (businessType === 'event') {
            const userId = vendorData?.user_id || storeId || vendorData?.id;
            if (userId) {
              query = query.or(`created_by.eq.${userId},allowed_scanner_id.eq.${userId}`);
            }
          } else {
            const idCol = businessType === 'shop' ? 'store_id' : 'provider_id';
            query = query.eq(idCol, storeId || vendorData?.id);
          }
          const res = await query;
          data = res.data;
          error = res.error;
        }

        if (error) throw error;
        if (data) {
          let filteredData = data;
          if (businessType === 'shop') {
            filteredData = data.filter(item => item.description !== 'Service item auto-registered');
          }

          const mapped = [];
          for (const item of filteredData) {
            let eventPrice = 299;
            let totalSeats = 0;
            let availableSeats = 0;
            if (businessType === 'event') {
              try {
                const { data: tiers } = await supabase.from('event_ticket_tiers').select('price, total_seats, available_seats').eq('event_id', item.id);
                if (tiers && tiers.length > 0) {
                  eventPrice = Math.min(...tiers.map(t => t.price));
                  totalSeats = tiers.reduce((s, t) => s + (t.total_seats || 0), 0);
                  availableSeats = tiers.reduce((s, t) => s + (t.available_seats || 0), 0);
                }
              } catch (e) { console.warn(e); }
            } else if (businessType === 'sports') {
              const prices = Object.values(item.price_per_hour || {});
              eventPrice = prices.length > 0 ? Math.min(...prices) : 0;
            } else {
              eventPrice = item.price;
            }

            mapped.push({
              id: item.id,
              name: item.name || item.title,
              detail: item.description || item.category,
              price: eventPrice,
              total_seats: totalSeats,
              available_seats: availableSeats,
              image: businessType === 'sports' && Array.isArray(item.images) && item.images.length > 0
                ? item.images[0]
                : (item.image_url || item.banner_url || item.image),
              sports: item.sport_types || [],
              price_per_hour: item.price_per_hour || {},
              images: item.images || [],
              barcode: item.barcode || '',
              barcode_type: item.barcode_type || 'EAN-13',
              stock_quantity: item.stock_quantity !== null && item.stock_quantity !== undefined ? item.stock_quantity : 9999,
              type: businessType || 'shop',
              category_id: item.category_id,
              category: item.category,
              status: item.status,
              booking_start: item.booking_start,
              booking_end: item.booking_end,
              venue_name: item.venue_name,
              event_date: item.event_date || '',
              duration: item.duration || '',
              age_restriction: item.age_restriction || '',
              language: item.language || '',
              show_type: item.show_type || 'single',
              is_admin_organized: item.is_admin_organized || false
            });
          }
          dbItems = mapped;
        }
      } catch (e) { console.error(e); }
    }

    const localStored = JSON.parse(localStorage.getItem('vVendorItems_' + businessType) || '[]');

    let finalItems = [];
    if (dbItems.length > 0) {
      finalItems = dbItems;
    } else {
      finalItems = localStored;
    }

    if (businessType === 'event') {
      const grouped = [];
      const groupMap = {};
      const titleCounts = {};
      finalItems.forEach(item => {
        const titleKey = (item.name || '').toLowerCase().trim();
        if (titleKey) {
          titleCounts[titleKey] = (titleCounts[titleKey] || 0) + 1;
        }
      });

      finalItems.forEach(item => {
        const titleKey = (item.name || '').toLowerCase().trim();
        const isMultiShow = item.show_type === 'multiple' || item.show_type === 'festival' || item.show_type === 'tour' || (titleCounts[titleKey] > 1);
        if (isMultiShow) {
          if (titleKey && groupMap[titleKey] !== undefined) {
            const existing = grouped[groupMap[titleKey]];
            existing.showCount = (existing.showCount || 1) + 1;
            existing.showsList = existing.showsList || [
              { id: existing.id, event_date: existing.event_date, venue_name: existing.venue_name, available_seats: existing.available_seats, total_seats: existing.total_seats }
            ];
            existing.showsList.push({ id: item.id, event_date: item.event_date, venue_name: item.venue_name, available_seats: item.available_seats, total_seats: item.total_seats });
            existing.total_seats = (existing.total_seats || 0) + (item.total_seats || 0);
            existing.available_seats = (existing.available_seats || 0) + (item.available_seats || 0);
            if (item.price !== undefined && (existing.price === undefined || item.price < existing.price)) {
              existing.price = item.price;
            }
          } else {
            const entry = { ...item, showCount: 1, showsList: [{ id: item.id, event_date: item.event_date, venue_name: item.venue_name, available_seats: item.available_seats, total_seats: item.total_seats }] };
            groupMap[titleKey] = grouped.length;
            grouped.push(entry);
          }
        } else {
          grouped.push({ ...item, showCount: 1 });
        }
      });
      setItems(grouped);
    } else {
      const seen = new Set();
      const unique = [];
      finalItems.forEach(item => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          unique.push(item);
        }
      });
      setItems(unique);
    }
    loadedBusinessTypeRef.current = businessType;
  }, [storeId, businessType, vendorData]);

  React.useEffect(() => {
    fetchCatalog();

    if (storeId && supabase) {
      const targetTable = businessType === 'shop' ? 'products' : businessType === 'event' ? 'events' : businessType === 'sports' ? 'sports_venues' : 'services';
      const idCol = businessType === 'shop' ? 'store_id' : businessType === 'event' ? 'created_by' : businessType === 'sports' ? 'owner_id' : 'provider_id';
      const filterVal = businessType === 'event' ? (vendorData?.user_id || storeId) : storeId;
      
      const sub = supabase.channel(`vendor_inventory_${storeId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: targetTable, filter: `${idCol}=eq.${filterVal}` }, () => {
          fetchCatalog();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(sub);
      };
    }
  }, [storeId, businessType, vendorData, fetchCatalog]);

  React.useEffect(() => {
    if (loadedBusinessTypeRef.current !== businessType) {
      return;
    }
    const cleanItems = items.filter(i => !i.id.toString().startsWith('d') && !i.id.toString().startsWith('s'));
    safeSetLocalStorage('vVendorItems_' + businessType, JSON.stringify(cleanItems));
  }, [items, businessType]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Clean large base64 images to prevent Supabase database insert timeouts
      // Images are now uploaded to Supabase Storage before this point — no base64 cleanup needed.
      // If image is still a blob: URL (upload pending), keep it as-is.

    if (businessType === 'event') {
      const validTiers = (newItem.ticket_tiers || []).filter(t => t.price);
      if (validTiers.length > 0) {
        newItem.price = String(Math.min(...validTiers.map(t => parseFloat(t.price))));
      } else {
        newItem.price = '0';
      }
    }

    if (!newItem.name) {
      toast.error("Please enter a title.");
      return;
    }
    if (!newItem.price) {
      toast.error("Please specify pricing.");
      return;
    }

    if (businessType === 'event') {
      if (!newItem.ticket_tiers || newItem.ticket_tiers.length === 0) {
        toast.error("Please add at least one ticket category.");
        return;
      }
      for (const tier of newItem.ticket_tiers) {
        if (!tier.tier_name || !tier.tier_name.trim()) {
          toast.error("Please enter a name for all ticket categories.");
          return;
        }
        if (!tier.price || parseFloat(tier.price) < 0) {
          toast.error(`Please enter a valid price for the category "${tier.tier_name}".`);
          return;
        }
        if (!tier.total_seats || parseInt(tier.total_seats) < 1) {
          toast.error(`Seats for "${tier.tier_name}" must be at least 1.`);
          return;
        }
        // Ensure seats are a clean integer — no decimals
        tier.total_seats = String(Math.floor(Math.max(1, parseInt(tier.total_seats))));
      }
    }

    if (editingId) {
      // pricePerHour is declared here (outer scope) so it is accessible in the
      // setItems() callback below, which runs OUTSIDE the inner if-block.
      let pricePerHour = {};
      if (storeId || vendorData?.user_id) {
        try {
          const targetTable = businessType === 'shop' ? 'products' : businessType === 'event' ? 'events' : businessType === 'sports' ? 'sports_venues' : 'services';
          let updatePayload = {};
          if (businessType === 'shop') {
            updatePayload = {
              name: newItem.name,
              description: newItem.detail || 'Updated Manually',
              price: parseFloat(newItem.price),
              image_url: newItem.image,
              barcode: newItem.barcode || null,
              barcode_type: newItem.barcode_type || 'EAN-13',
              stock_quantity: parseInt(newItem.stock_quantity) || 0
            };
            const res = await supabase.from(targetTable).update(updatePayload).eq('id', editingId);
            let error = res.error;
            if (error) throw error;
          } else if (businessType === 'event') {
            if (newItem.show_type === 'multiple' || newItem.show_type === 'festival' || newItem.show_type === 'tour') {
              const { data: originalEvent } = await supabase.from('events').select('title, category, created_by, show_type').eq('id', editingId).maybeSingle();
              if (originalEvent) {
                const { data: existingSiblings } = await supabase
                  .from('events')
                  .select('id')
                  .eq('title', originalEvent.title)
                  .eq('category', originalEvent.category)
                  .eq('created_by', originalEvent.created_by);
                
                const existingIds = existingSiblings ? existingSiblings.map(s => s.id) : [];
                const currentSlotIds = newItem.schedule_slots ? newItem.schedule_slots.map(s => s.id).filter(id => id && !String(id).startsWith('temp_') && !String(id).startsWith('item-')) : [];
                
                // 1. Delete slots that were removed by the vendor
                const toDelete = existingIds.filter(id => !currentSlotIds.includes(id));
                if (toDelete.length > 0) {
                  await supabase.from('events').delete().in('id', toDelete);
                }

                // 2. Insert or update the shows
                for (const slot of (newItem.schedule_slots || [])) {
                  const slotPayload = {
                    title: newItem.name,
                    description: newItem.detail || 'Updated Manually',
                    category: newItem.category || 'Music & Concerts',
                    venue_name: slot.venue_name || 'Ahmedabad Venue',
                    venue_lat: 23.0225,
                    venue_lng: 72.5714,
                    event_date: slot.date ? new Date(`${slot.date}T${slot.starts || '19:00'}:00`).toISOString() : new Date().toISOString(),
                    ends_at: slot.date ? new Date(`${slot.date}T${slot.ends || '22:00'}:00`).toISOString() : new Date().toISOString(),
                    banner_url: newItem.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=400&q=80',
                    booking_start: newItem.booking_start ? new Date(newItem.booking_start).toISOString() : null,
                    booking_end: newItem.booking_end ? new Date(newItem.booking_end).toISOString() : null,
                    show_type: newItem.show_type,
                    visibility: newItem.visibility || 'public',
                    is_online: !!newItem.is_online,
                    created_by: originalEvent.created_by,
                    status: 'PENDING_APPROVAL',
                    duration: newItem.duration || null,
                    age_restriction: newItem.age_restriction || null,
                    language: newItem.language || null
                  };

                  let targetEventId = slot.id;
                  if (slot.id && !String(slot.id).startsWith('temp_') && !String(slot.id).startsWith('item-')) {
                    await supabase.from('events').update(slotPayload).eq('id', slot.id);
                  } else {
                    const { data: newEvt } = await supabase.from('events').insert([slotPayload]).select().single();
                    if (newEvt) targetEventId = newEvt.id;
                  }

                  if (targetEventId) {
                    const { data: existingTiers } = await supabase.from('event_ticket_tiers').select('id, tier_name').eq('event_id', targetEventId);
                    const existingMap = {};
                    if (existingTiers) {
                      existingTiers.forEach(t => { existingMap[t.tier_name] = t.id; });
                    }
                    const currentTierNames = [];
                    for (const t of (newItem.ticket_tiers || [])) {
                      currentTierNames.push(t.tier_name);
                      const cap = t.slot_capacities?.[slot.id] !== undefined ? (parseInt(t.slot_capacities[slot.id]) || 100) : (parseInt(t.total_seats) || 100);
                      const tierPayload = {
                        event_id: targetEventId,
                        tier_name: t.tier_name,
                        price: parseFloat(t.price) || 0,
                        total_seats: cap,
                        available_seats: cap,
                        booking_open:  t.booking_open  ? new Date(t.booking_open).toISOString()  : null,
                        booking_close: t.booking_close ? new Date(t.booking_close).toISOString() : null
                      };
                      const existingId = existingMap[t.tier_name];
                      if (existingId) {
                        const { data: bookingsData } = await supabase
                          .from('event_bookings')
                          .select('ticket_count')
                          .eq('tier_id', existingId)
                          .neq('status', 'CANCELLED');
                        const soldSeats = bookingsData ? bookingsData.reduce((sum, b) => sum + (b.ticket_count || 0), 0) : 0;
                        tierPayload.available_seats = Math.max(0, cap - soldSeats);
                        await supabase.from('event_ticket_tiers').update(tierPayload).eq('id', existingId);
                      } else {
                        await supabase.from('event_ticket_tiers').insert([tierPayload]);
                      }
                    }
                    if (existingTiers) {
                      const toDeleteTiers = existingTiers.filter(t => !currentTierNames.includes(t.tier_name));
                      for (const t of toDeleteTiers) {
                        await supabase.from('event_ticket_tiers').delete().eq('id', t.id);
                      }
                    }
                  }
                }
              }
            } else {
              updatePayload = {
                title: newItem.name,
                description: newItem.detail || 'Updated Manually',
                category: newItem.category || 'Music & Concerts',
                venue_name: newItem.venue_name || 'Ahmedabad Venue',
                event_date: newItem.event_date ? new Date(newItem.event_date).toISOString() : new Date().toISOString(),
                banner_url: newItem.image,
                booking_start: newItem.booking_start ? new Date(newItem.booking_start).toISOString() : null,
                booking_end: newItem.booking_end ? new Date(newItem.booking_end).toISOString() : null,
                show_type: newItem.show_type || 'single',
                duration: newItem.duration || null,
                age_restriction: newItem.age_restriction || null,
                language: newItem.language || null
              };
              const { error } = await supabase.from(targetTable).update(updatePayload).eq('id', editingId);
              if (error) throw error;

              const { data: existingTiers } = await supabase.from('event_ticket_tiers').select('id, tier_name').eq('event_id', editingId);
              const existingMap = {};
              if (existingTiers) {
                existingTiers.forEach(t => { existingMap[t.tier_name] = t.id; });
              }
              const currentTierNames = [];
              for (const t of (newItem.ticket_tiers || [])) {
                currentTierNames.push(t.tier_name);
                const tierPayload = {
                  event_id: editingId,
                  tier_name: t.tier_name,
                  price: parseFloat(t.price) || 0,
                  total_seats: parseInt(t.total_seats) || 100,
                  available_seats: parseInt(t.total_seats) || 100,
                  booking_open:  t.booking_open  ? new Date(t.booking_open).toISOString()  : null,
                  booking_close: t.booking_close ? new Date(t.booking_close).toISOString() : null
                };
                const existingId = existingMap[t.tier_name];
                if (existingId) {
                  const { data: bookingsData } = await supabase
                    .from('event_bookings')
                    .select('ticket_count')
                    .eq('tier_id', existingId)
                    .neq('status', 'CANCELLED');
                  const soldSeats = bookingsData ? bookingsData.reduce((sum, b) => sum + (b.ticket_count || 0), 0) : 0;
                  tierPayload.available_seats = Math.max(0, parseInt(t.total_seats) - soldSeats);
                  await supabase.from('event_ticket_tiers').update(tierPayload).eq('id', existingId);
                } else {
                  await supabase.from('event_ticket_tiers').insert([tierPayload]);
                }
              }
              if (existingTiers) {
                const toDelete = existingTiers.filter(t => !currentTierNames.includes(t.tier_name));
                for (const t of toDelete) {
                  await supabase.from('event_ticket_tiers').delete().eq('id', t.id);
                }
              }
            }
          } else if (businessType === 'sports') {
            if (newItem.sports && newItem.sports.length > 0) {
              newItem.sports.forEach(sp => {
                pricePerHour[sp] = parseFloat(newItem.price) || 400;
              });
            }
            updatePayload = {
              name: newItem.name,
              description: newItem.detail || 'Updated Manually',
              address: newItem.detail || 'Ahmedabad',
              sport_types: newItem.sports || [],
              price_per_hour: pricePerHour,
              images: newItem.images || []
            };
            let error = null;
            const BASE_URL = window.location.protocol === 'https:'
              ? ''
              : (window._API_URL || `http://${window.location.hostname}:3004`);
            try {
              const res = await fetch(`${BASE_URL}/api/sports/venues/${editingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
              });
              const resData = await res.json();
              if (!res.ok || !resData.success) {
                error = { message: resData.error || 'Failed to update venue' };
              }
            } catch (err) {
              error = { message: err.message };
            }
            if (error) throw error;
          } else {
            updatePayload = {
              title: newItem.name,
              price: parseFloat(newItem.price),
              category_id: null,
              description: newItem.detail || 'Updated Manually',
              duration_minutes: 60
            };
            const { error } = await supabase.from(targetTable).update(updatePayload).eq('id', editingId);
            if (error) throw error;
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to update listing due to connection issue.');
          return;
        }
      }

      setItems(prev => {
        const updated = prev.map(item => item.id === editingId ? {
          ...item,
          name: newItem.name,
          detail: newItem.detail || 'Updated Manually',
          price: (() => {
            if (businessType === 'sports') {
              // pricePerHour is defined in outer scope
              const prices = Object.values(pricePerHour || {});
              return prices.length > 0 ? Math.min(...prices) : parseFloat(newItem.price);
            }
            return parseFloat(newItem.price);
          })(),
          price_per_hour: businessType === 'sports' ? pricePerHour : (newItem.price_per_hour || {}),
          sports: newItem.sports || [],
          images: newItem.images || [],
          image: businessType === 'sports' && Array.isArray(newItem.images) && newItem.images.length > 0
            ? newItem.images[0]
            : newItem.image,
          barcode: newItem.barcode || '',
          barcode_type: newItem.barcode_type || 'EAN-13',
          stock_quantity: parseInt(newItem.stock_quantity) || 0,
          type: businessType || 'shop',
          category_id: newItem.category_id || null,
          category: newItem.category,
          venue_name: newItem.venue_name,
          event_date: newItem.event_date,
          booking_start: newItem.booking_start,
          booking_end: newItem.booking_end,
          show_type: newItem.show_type
        } : item);
        safeSetLocalStorage('vVendorItems_' + businessType, JSON.stringify(updated.filter(i => !i.id.toString().startsWith('d') && !i.id.toString().startsWith('s'))));
        return updated;
      });

      toast.success('Listing updated successfully!');
      setEditingId(null);
      setNewItem({ name: '', detail: '', price: '', image: null, barcode: '', barcode_type: 'EAN-13', stock_quantity: '', category_id: null, category: 'Music & Concerts', venue_name: '', event_date: '', booking_start: '', booking_end: '', duration: '', age_restriction: '', language: '', ticket_tiers: [{ tier_name: 'General Admission', price: '299', total_seats: '100' }] });
      setShowForm(false);
      return;
    }

    const localId = 'item-' + Date.now();
    const newProductObj = {
      id: localId,
      name: newItem.name,
      detail: newItem.detail || 'Added Manually',
      price: parseFloat(newItem.price),
      image: newItem.image,
      barcode: newItem.barcode || '',
      barcode_type: newItem.barcode_type || 'EAN-13',
      stock_quantity: parseInt(newItem.stock_quantity) || 0,
      type: businessType || 'shop',
      category_id: newItem.category_id || null,
      category: newItem.category,
      venue_name: newItem.venue_name,
      event_date: newItem.event_date,
      booking_start: newItem.booking_start,
      booking_end: newItem.booking_end
    };

    if ((storeId || vendorData?.user_id) && (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(storeId) || businessType === 'event')) {
      try {
        const targetTable = businessType === 'shop' ? 'products' : businessType === 'event' ? 'events' : businessType === 'sports' ? 'sports_venues' : 'services';
        
        if (businessType === 'event' && (newItem.show_type === 'multiple' || newItem.show_type === 'festival' || newItem.show_type === 'tour') && newItem.schedule_slots && newItem.schedule_slots.length > 0) {
          for (const slot of newItem.schedule_slots) {
            const payload = {
              title: newProductObj.name,
              description: newProductObj.detail || 'Added Manually',
              category: newItem.category || 'Music & Concerts',
              venue_name: slot.venue_name || 'Ahmedabad Venue',
              venue_lat: 23.0225,
              venue_lng: 72.5714,
              event_date: slot.date ? new Date(`${slot.date}T${slot.starts || '19:00'}:00`).toISOString() : new Date().toISOString(),
              ends_at: slot.date ? new Date(`${slot.date}T${slot.ends || '22:00'}:00`).toISOString() : new Date().toISOString(),
              banner_url: newProductObj.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=400&q=80',
              status: 'PENDING_APPROVAL',
              created_by: vendorData?.user_id || null,
              booking_start: newItem.booking_start ? new Date(newItem.booking_start).toISOString() : null,
              booking_end: newItem.booking_end ? new Date(newItem.booking_end).toISOString() : null,
              show_type: newItem.show_type,
              visibility: newItem.visibility || 'public',
              is_online: !!newItem.is_online,
              duration: newItem.duration || null,
              age_restriction: newItem.age_restriction || null,
              language: newItem.language || null
            };

            const { data, error } = await supabase.from(targetTable).insert([payload]).select();
            if (error) {
              console.error('Supabase insert error:', error);
              toast.error(`Failed to publish listing: ${error.message}`);
              return;
            }

            if (data && data[0]) {
              const tiersPayload = (newItem.ticket_tiers && newItem.ticket_tiers.length > 0)
                ? newItem.ticket_tiers.map(t => {
                    const cap = t.slot_capacities?.[slot.id] !== undefined ? (parseInt(t.slot_capacities[slot.id]) || 100) : (parseInt(t.total_seats) || 100);
                    return {
                      event_id: data[0].id,
                      tier_name: t.tier_name || 'General Admission',
                      price: parseFloat(t.price) || 299,
                      total_seats: cap,
                      available_seats: cap,
                      booking_open:  t.booking_open  ? new Date(t.booking_open).toISOString()  : null,
                      booking_close: t.booking_close ? new Date(t.booking_close).toISOString() : null
                    };
                  })
                : [{
                    event_id: data[0].id,
                    tier_name: 'General Admission',
                    price: parseFloat(newProductObj.price) || 299,
                    total_seats: 200,
                    available_seats: 200
                  }];
              await supabase.from('event_ticket_tiers').insert(tiersPayload);
            }
          }
          await fetchCatalog();
          toast.success(`Published ${newItem.schedule_slots.length} shows successfully!`);
          setNewItem({ name: '', detail: '', price: '299', image: null, barcode: '', barcode_type: 'EAN-13', stock_quantity: '', category_id: null, category: 'Music & Concerts', venue_name: '', event_date: '', booking_start: '', booking_end: '', show_type: 'single', duration: '', age_restriction: '', language: '', schedule_slots: [{ id: Date.now(), date: '', starts: '19:00', ends: '22:00', venue_name: '' }], ticket_tiers: [{ tier_name: 'General Admission', price: '299', total_seats: '100' }] });
          setShowForm(false);
          setEventWizardStep(1);
          return;
        }

        let payload = {};
        if (businessType === 'shop') {
          payload = {
            store_id: storeId,
            name: newProductObj.name,
            category_id: null,
            description: newProductObj.detail || 'Added Manually',
            price: parseFloat(newProductObj.price),
            image_url: newProductObj.image,
            barcode: newProductObj.barcode || null,
            barcode_type: newProductObj.barcode_type || 'EAN-13',
            stock_quantity: parseInt(newItem.stock_quantity) || 0,
            is_active: true
          };
        } else if (businessType === 'event') {
          payload = {
            title: newProductObj.name,
            description: newProductObj.detail || 'Added Manually',
            category: newItem.category || 'Music & Concerts',
            venue_name: newItem.venue_name || 'Ahmedabad Venue',
            venue_lat: 23.0225,
            venue_lng: 72.5714,
            event_date: newItem.event_date ? new Date(newItem.event_date).toISOString() : new Date().toISOString(),
            ends_at: newItem.ends_at ? new Date(newItem.ends_at).toISOString() : null,
            banner_url: newProductObj.image || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=400&q=80',
            status: 'PENDING_APPROVAL',
            created_by: vendorData?.user_id || null,
            booking_start: newItem.booking_start ? new Date(newItem.booking_start).toISOString() : null,
            booking_end: newItem.booking_end ? new Date(newItem.booking_end).toISOString() : null,
            show_type: newItem.show_type || 'single',
            visibility: newItem.visibility || 'public',
            is_online: !!newItem.is_online,
            duration: newItem.duration || null,
            age_restriction: newItem.age_restriction || null,
            language: newItem.language || null
          };
        } else if (businessType === 'sports') {
          const pricePerHour = {};
          if (newItem.sports && newItem.sports.length > 0) {
            newItem.sports.forEach(sp => {
              pricePerHour[sp] = parseFloat(newItem.price) || 400;
            });
          }
          payload = {
            owner_id: storeId || vendorData?.id,
            owner_user_id: vendorData?.user_id || null,
            owner_name: vendorData?.name || 'Partner',
            owner_phone: vendorData?.phone || '',
            name: newItem.name,
            description: newItem.detail || 'Added Manually',
            address: newItem.detail || 'Ahmedabad',
            city: 'Ahmedabad',
            sport_types: newItem.sports || [],
            price_per_hour: pricePerHour,
            images: newItem.images || [],
            status: 'approved',
            open_time: '00:00:00',
            close_time: '00:00:00',
            slot_duration_mins: 60
          };
        } else {
          payload = {
            provider_id: storeId,
            title: newProductObj.name,
            category_id: null,
            description: newProductObj.detail || 'Added Manually',
            price: parseFloat(newProductObj.price),
            duration_minutes: 60
          };
        }

        let data = null;
        let error = null;
        if (businessType === 'sports') {
          const BASE_URL = window.location.protocol === 'https:'
            ? ''
            : (window._API_URL || `http://${window.location.hostname}:3004`);
          try {
            const res = await fetch(`${BASE_URL}/api/sports/venues`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const resData = await res.json();
            if (res.ok && resData.success) {
              data = [resData.venue];
            } else {
              error = { message: resData.error || 'Failed to register venue' };
            }
          } catch (err) {
            error = { message: err.message };
          }
        } else {
          const res = await supabase.from(targetTable).insert([payload]).select();
          data = res.data;
          error = res.error;
        }

        if (error) {
          console.error('Insert error:', error);
          toast.error(`Failed to publish listing: ${error.message}`);
          return;
        }

        if (data && data[0]) {
          if (businessType === 'event') {
            const tiersPayload = (newItem.ticket_tiers && newItem.ticket_tiers.length > 0)
              ? newItem.ticket_tiers.map(t => ({
                  event_id: data[0].id,
                  tier_name: t.tier_name || 'General Admission',
                  price: parseFloat(t.price) || 299,
                  total_seats: parseInt(t.total_seats) || 100,
                  available_seats: parseInt(t.total_seats) || 100,
                  booking_open:  t.booking_open  ? new Date(t.booking_open).toISOString()  : null,
                  booking_close: t.booking_close ? new Date(t.booking_close).toISOString() : null
                }))
              : [{
                  event_id: data[0].id,
                  tier_name: 'General Admission',
                  price: parseFloat(newProductObj.price) || 299,
                  total_seats: 200,
                  available_seats: 200
                }];
            await supabase.from('event_ticket_tiers').insert(tiersPayload);
          }

          const dbObj = {
            id: data[0].id,
            name: data[0].name || data[0].title,
            detail: data[0].description || data[0].category || 'Added Manually',
            price: businessType === 'sports' ? (data[0].price_per_hour ? Math.min(...Object.values(data[0].price_per_hour)) : parseFloat(newItem.price)) : (businessType === 'event' ? parseFloat(newProductObj.price) : data[0].price),
            image: businessType === 'sports' ? (data[0].images?.[0] || null) : (data[0].image_url || data[0].banner_url || data[0].image),
            barcode: data[0].barcode || '',
            barcode_type: data[0].barcode_type || 'EAN-13',
            stock_quantity: data[0].stock_quantity || 0,
            type: businessType || 'shop',
            category_id: data[0].category_id,
            category: data[0].category,
            venue_name: data[0].venue_name,
            event_date: data[0].event_date,
            booking_start: data[0].booking_start,
            booking_end: data[0].booking_end,
            duration: data[0].duration || '',
            age_restriction: data[0].age_restriction || '',
            language: data[0].language || '',
            show_type: data[0].show_type || 'single'
          };
          setItems(prev => [dbObj, ...prev.filter(i => i.id !== localId && !i.id.toString().startsWith('d') && !i.id.toString().startsWith('s'))]);
          await fetchCatalog();
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to publish listing due to connection issue.');
        return;
      }
    } else {
      setItems(prev => {
        const cleanPrev = prev.filter(i => !i.id.toString().startsWith('d') && !i.id.toString().startsWith('s'));
        const updated = [newProductObj, ...cleanPrev];
        safeSetLocalStorage('vVendorItems_' + businessType, JSON.stringify(updated));
        return updated;
      });
    }

    toast.success('Listing published successfully!');
    setNewItem({ name: '', detail: '', price: '', image: null, barcode: '', barcode_type: 'EAN-13', stock_quantity: '', category_id: businessType === 'shop' ? '44444444-4444-4444-4444-444444444444' : '77777777-7777-7777-7777-777777777777', category: 'Music & Concerts', venue_name: '', event_date: '', booking_start: '', booking_end: '', duration: '', age_restriction: '', language: '', ticket_tiers: [{ tier_name: 'General Admission', price: '299', total_seats: '100' }] });
    setShowForm(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = async (item) => {
    if (item.is_admin_organized) {
      toast.error('You cannot edit an admin-organized event.');
      return;
    }
    setEditingId(item.id);

    // Helper: convert ISO timestamp to datetime-local input format (YYYY-MM-DDTHH:MM)
    const toLocal = (iso) => {
      if (!iso) return '';
      try {
        const d = new Date(iso);
        const tzOffset = d.getTimezoneOffset() * 60000;
        return new Date(d - tzOffset).toISOString().slice(0, 16);
      } catch { return ''; }
    };

    let tiers = [{ tier_name: 'General Admission', price: item.price || '299', total_seats: '100', booking_open: '', booking_close: '' }];
    let showType = 'single';
    let scheduleSlots = [{ id: Date.now(), date: '', starts: '19:00', ends: '22:00', venue_name: '' }];

    if (businessType === 'event') {
      try {
        const { data: dbEvt } = await supabase.from('events').select('show_type, title, category, created_by').eq('id', item.id).maybeSingle();
        if (dbEvt) {
          showType = dbEvt.show_type || 'single';
          if (showType === 'multiple' || showType === 'festival' || showType === 'tour') {
            const { data: siblings } = await supabase
              .from('events')
              .select('id, event_date, ends_at, venue_name')
              .eq('title', dbEvt.title)
              .eq('category', dbEvt.category)
              .eq('created_by', dbEvt.created_by)
              .order('event_date', { ascending: true });
            if (siblings && siblings.length > 0) {
              scheduleSlots = siblings.map(s => {
                const d = new Date(s.event_date);
                const dateStr = d.toISOString().split('T')[0];
                const startsStr = d.toTimeString().slice(0, 5);
                const endsStr = s.ends_at ? new Date(s.ends_at).toTimeString().slice(0, 5) : '22:00';
                return {
                  id: s.id,
                  date: dateStr,
                  starts: startsStr,
                  ends: endsStr,
                  venue_name: s.venue_name
                };
              });
            }
          }
        }

        const { data: dbTiers } = await supabase
          .from('event_ticket_tiers')
          .select('*')
          .eq('event_id', item.id);
        if (dbTiers && dbTiers.length > 0) {
          tiers = dbTiers.map(t => ({
            id: t.id,
            tier_name: t.tier_name,
            price: String(t.price),
            total_seats: String(t.total_seats),
            booking_open:  t.booking_open  ? toLocal(t.booking_open)  : '',
            booking_close: t.booking_close ? toLocal(t.booking_close) : ''
          }));
        }
      } catch (err) {
        console.warn("Failed to load event details or ticket tiers for edit:", err);
      }
    }

    setNewItem({
      name: item.name,
      detail: item.detail || '',
      price: item.price,
      image: item.image,
      barcode: item.barcode || '',
      barcode_type: item.barcode_type || 'EAN-13',
      stock_quantity: item.stock_quantity || '',
      category_id: item.category_id || null,
      category: item.category || 'Music & Concerts',
      venue_name: item.venue_name || '',
      event_date: toLocal(item.event_date),
      booking_start: toLocal(item.booking_start),
      booking_end: toLocal(item.booking_end),
      show_type: showType,
      schedule_slots: scheduleSlots,
      ticket_tiers: tiers,
      duration: item.duration || '',
      age_restriction: item.age_restriction || '',
      language: item.language || '',
      sports: item.sports || [],
      price_per_hour: item.price_per_hour || {},
      images: item.images || []
    });
    setEventWizardStep(2);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQrScan = async (qrData) => {
    setShowQrScanner(false);
    setCheckinLoading(true);
    setCheckinResult(null);
    try {
      const BASE_URL = window.location.protocol === 'https:'
        ? ''
        : (window._API_URL || `http://${window.location.hostname}:3004`);

      // Get auth token from supabase session
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`${BASE_URL}/api/events/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ qr_code_hash: qrData })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCheckinResult({ success: true, booking: data.booking });
        toast.success('✅ Check-in successful!');
      } else if (res.status === 400 && data.status === 'COMPLETED') {
        // Already scanned — show the info but flag as duplicate
        setCheckinResult({ success: false, alreadyUsed: true, booking: data.booking, error: data.error });
        toast.error('⚠️ Already checked in!');
      } else {
        setCheckinResult({ success: false, error: data.error || 'Unknown error' });
        toast.error(data.error || 'Check-in failed');
      }
    } catch (err) {
      setCheckinResult({ success: false, error: 'Network error. Check your connection.' });
      toast.error('Network error during check-in');
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleDelete = (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    if (item.is_admin_organized) {
      toast.error('You cannot delete an admin-organized event.');
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Listing',
      message: 'Are you sure you want to permanently delete this listing from your storefront? This action cannot be undone.',
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        setItems(prev => prev.filter(i => i.id !== id));
        if (storeId || vendorData?.user_id) {
          try {
            if (businessType === 'event') {
              await supabase.from('events')
                .delete()
                .eq('title', item.name || item.title)
                .eq('category', item.category)
                .eq('created_by', vendorData?.user_id || null);
            } else {
              await supabase.from(businessType === 'shop' ? 'products' : 'services').delete().eq('id', id);
            }
          } catch (e) { console.error(e); }
        }
      }
    });
  };

  return (
    <div className="v-container animate-fade-in">
      <div className="v-hero-section">
        <div className="v-hero-info">
          <div className="v-hero-badge">
            <div className="v-hero-badge-icon" style={{ background: '#fff7ed' }}>
              {businessType === 'shop' ? (
                <Package size={20} color="#f97316" />
              ) : businessType === 'event' ? (
                <Package size={20} color="#f97316" />
              ) : businessType === 'sports' ? (
                <Trophy size={20} color="#f97316" />
              ) : (
                <Wrench size={20} color="#f97316" />
              )}
            </div>
            <span className="v-hero-badge-text" style={{ color: '#f97316' }}>
              {businessType === 'shop' ? 'Store Management' : businessType === 'event' ? 'Event Management' : businessType === 'sports' ? 'Venue Management' : 'Service Management'}
            </span>
          </div>
          <h1 className="v-hero-title">{businessType === 'shop' ? 'Product Catalog' : businessType === 'event' ? 'Events & Shows' : businessType === 'sports' ? 'Venue Management' : 'Service Menu'}</h1>
          <p className="v-hero-subtitle">
            {businessType === 'event' ? 'Manage your events, ticket pricing, and passes details for local audiences.' : businessType === 'sports' ? 'Manage your sports courts, turf bookings, hourly slots, and pricing.' : 'Manage your digital storefront and keep your price list updated for local customers.'}
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingId(null); setNewItem({ name: '', detail: '', price: '299', image: null, barcode: '', barcode_type: 'EAN-13', stock_quantity: '', category_id: null, category: 'Music & Concerts', venue_name: '', event_date: '', booking_start: '', booking_end: '', show_type: 'single', duration: '', age_restriction: '', language: '', schedule_slots: [{ id: Date.now(), date: '', starts: '19:00', ends: '22:00', venue_name: '' }], ticket_tiers: [{ tier_name: 'General Admission', price: '299', total_seats: '100' }] }); setEventWizardStep(1); setShowForm(true); }}
          className="v-btn-primary"
        >
          <PackagePlus size={20} />
          {businessType === 'shop' ? 'Add Product' : businessType === 'event' ? 'Add Event' : businessType === 'sports' ? 'Add Venue' : 'Add Service'}
        </motion.button>
        {businessType === 'event' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setCheckinResult(null); setShowQrScanner(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(22,163,74,0.35)' }}
          >
            <QrCode size={18} /> Scan QR
          </motion.button>
        )}
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        onScan={handleQrScan}
      />

      {/* Check-in Loading Overlay */}
      {checkinLoading && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999998, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem 3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #16a34a', borderRadius: '50%', animation: 'checkin-spin 1s linear infinite' }} />
            <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Verifying ticket...</p>
            <style>{`@keyframes checkin-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )}

      {/* Check-in Result Modal */}
      <AnimatePresence>
        {checkinResult && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 999997, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(6px)' }}
            onClick={() => setCheckinResult(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              style={{ background: 'white', borderRadius: '28px', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 30px 60px rgba(0,0,0,0.25)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Result Icon */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 1rem',
                  background: checkinResult.success ? '#dcfce7' : checkinResult.alreadyUsed ? '#fef3c7' : '#fee2e2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: checkinResult.success ? '0 0 30px rgba(34,197,94,0.25)' : 'none'
                }}>
                  <span style={{ fontSize: '2.2rem' }}>
                    {checkinResult.success ? '✅' : checkinResult.alreadyUsed ? '⚠️' : '❌'}
                  </span>
                </div>
                <h2 style={{ margin: '0 0 4px', fontWeight: 900, fontSize: '1.3rem', color: '#0f172a' }}>
                  {checkinResult.success ? 'Checked In!' : checkinResult.alreadyUsed ? 'Already Used' : 'Invalid Ticket'}
                </h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                  {checkinResult.success ? 'Entry approved. Attendee may enter.' : checkinResult.error}
                </p>
              </div>

              {/* Attendee Details Card */}
              {checkinResult.booking && (
                <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendee</span>
                    <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '1rem' }}>{checkinResult.booking.attendee}</span>
                  </div>
                  {checkinResult.booking.phone && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Phone</span>
                      <span style={{ fontWeight: 700, color: '#475569' }}>{checkinResult.booking.phone}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Event</span>
                    <span style={{ fontWeight: 700, color: '#475569', textAlign: 'right', maxWidth: '60%' }}>{checkinResult.booking.event}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Tier</span>
                    <span style={{ fontWeight: 700, color: '#475569' }}>{checkinResult.booking.tier}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Tickets</span>
                    <span style={{ fontWeight: 900, color: '#ff7622', fontSize: '1rem' }}>{checkinResult.booking.ticket_count}</span>
                  </div>
                  {checkinResult.booking.invoice && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Invoice</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#64748b', fontSize: '0.8rem' }}>{checkinResult.booking.invoice}</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => { setCheckinResult(null); setShowQrScanner(true); }}
                  style={{ flex: 1, padding: '13px', background: '#f1f5f9', border: 'none', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', color: '#475569', fontSize: '0.9rem' }}
                >
                  Scan Next
                </button>
                <button
                  onClick={() => setCheckinResult(null)}
                  style={{ flex: 1, padding: '13px', background: checkinResult.success ? 'linear-gradient(135deg,#16a34a,#15803d)' : '#0f172a', border: 'none', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', color: 'white', fontSize: '0.9rem' }}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              padding: '1.5rem',
            }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                width: '100%',
                maxWidth: businessType === 'event' ? '850px' : '650px',
                maxHeight: '90vh',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                margin: 'auto',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '28px',
                overflow: 'hidden',
                background: 'white'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <form 
                onSubmit={handleAdd} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  maxHeight: '90vh', 
                  width: '100%', 
                  margin: 0 
                }}
              >
                <div className="v-form-header" style={{ padding: '2.5rem 3rem 1.5rem 3rem', marginBottom: 0, borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <h3 className="v-form-header-title" style={{ fontSize: '1.5rem', fontWeight: 950, color: '#0f172a', marginBottom: '4px' }}>
                      {editingId ? (businessType === 'event' ? 'Edit Event' : 'Edit Listing') : (businessType === 'event' ? 'Publish New Event' : 'Publish New Offering')}
                    </h3>
                    <p className="v-form-header-subtitle">Create a professional listing to attract more local orders.</p>
                  </div>
                  <button type="button" onClick={() => setShowForm(false)} className="v-action-btn delete" style={{ background: '#f1f5f9', color: '#64748b' }}><X size={20} /></button>
                </div>

                {businessType === 'event' ? (
                  // EVENT ORGANIZER WIZARD
                  <div ref={wizardScrollRef} style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1, padding: '1.5rem 3rem' }}>
                    {eventWizardStep === 1 ? (
                      // Step 1: Event Type Selection
                      <div className="event-type-selection-container">
                        <p className="event-type-subtitle">Choose the type of setup for your upcoming event. You can customize details later.</p>
                        <div className="event-type-cards">
                          {/* Single Show Card */}
                          <div 
                            className={`event-type-card ${newItem.show_type === 'single' || !newItem.show_type ? 'selected' : ''}`}
                            onClick={() => setNewItem({ ...newItem, show_type: 'single' })}
                          >
                            <div className="card-top-row">
                              <div className="card-icon-box orange-tint">
                                <Clock size={20} color="var(--v-primary)" />
                              </div>
                              <div className="card-badge-container">
                                <span className="card-badge-most-common">Most common</span>
                                <div className={`card-check-circle ${(newItem.show_type === 'single' || !newItem.show_type) ? 'checked' : ''}`}>
                                  {(newItem.show_type === 'single' || !newItem.show_type) && (
                                    <div className="card-checkmark-fill">✓</div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <h4 className="card-title">Single show</h4>
                            <p className="card-desc">One date, one venue and one show time. Perfect for concerts, comedy nights and workshops.</p>
                            <span className="card-duration-info">Takes about 2 minutes.</span>
                          </div>

                          {/* Multiple Shows Card */}
                          <div 
                            className={`event-type-card ${newItem.show_type === 'multiple' ? 'selected' : ''}`}
                            onClick={() => setNewItem({ ...newItem, show_type: 'multiple' })}
                          >
                            <div className="card-top-row">
                              <div className="card-icon-box orange-tint">
                                <Layers size={20} color="var(--v-primary)" />
                              </div>
                              <div className="card-badge-container">
                                <div className={`card-check-circle ${newItem.show_type === 'multiple' ? 'checked' : ''}`}>
                                  {newItem.show_type === 'multiple' && (
                                    <div className="card-checkmark-fill">✓</div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <h4 className="card-title">Multiple shows</h4>
                            <p className="card-desc">One event across several dates or times, such as a theatre run or weekly comedy night.</p>
                            <span className="card-duration-info">Manage every show from a simple schedule.</span>
                          </div>

                          {/* Festival or Tour Card */}
                          <div 
                            className={`event-type-card ${newItem.show_type === 'tour' ? 'selected' : ''}`}
                            onClick={() => setNewItem({ ...newItem, show_type: 'tour' })}
                          >
                            <div className="card-top-row">
                              <div className="card-icon-box orange-tint">
                                <MapPin size={20} color="var(--v-primary)" />
                              </div>
                              <div className="card-badge-container">
                                <span className="card-badge-advanced">Advanced</span>
                                <div className={`card-check-circle ${newItem.show_type === 'tour' ? 'checked' : ''}`}>
                                  {newItem.show_type === 'tour' && (
                                    <div className="card-checkmark-fill">✓</div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <h4 className="card-title">Festival or tour</h4>
                            <p className="card-desc">Multiple venues, multi-day festivals, tours, custom passes or complex per-slot setup.</p>
                            <span className="card-duration-info">Opens the complete step-by-step advanced setup.</span>
                          </div>
                        </div>

                        <div className="event-type-footer">
                          <span className="event-type-selected-text">
                            Selected: <strong>{newItem.show_type === 'tour' ? 'Festival or tour' : newItem.show_type === 'multiple' ? 'Multiple shows' : 'Single show'}</strong>
                          </span>
                          <button 
                            type="button" 
                            className="event-type-continue-btn"
                            onClick={() => setEventWizardStep(2)}
                          >
                            Continue
                          </button>
                        </div>
                      </div>
                    ) : newItem.show_type === 'multiple' ? (
                      // MULTIPLE SHOWS WIZARD STEPS
                      newItem.show_type === 'multiple' && (
                        eventWizardStep === 2 ? (
                          // Step 2: Basics
                          <div className="single-event-wizard-step animate-fade-in">
                            <div className="wizard-stepper-bar">
                              <div className="step-item active"><span className="step-number">1</span><span className="step-label">Basics</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">2</span><span className="step-label">Schedule</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">3</span><span className="step-label">Tickets</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">4</span><span className="step-label">Photos & details</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">5</span><span className="step-label">Review</span></div>
                            </div>
                            <div className="wizard-step-header">
                              <div className="wizard-back-indicator">
                                <span className="current-selection-badge">Multiple shows</span>
                                <button type="button" className="change-selection-btn" onClick={() => setEventWizardStep(1)}>Change</button>
                              </div>
                              <h2 className="wizard-title">Create multiple shows</h2>
                              <p className="wizard-subtitle">Build a multi-date or multi-time event without using the advanced setup.</p>
                            </div>
                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>Basics</h4>
                                <span className="required-badge">Required</span>
                              </div>
                              <div className="wizard-fields-stack">
                                <div className="v-form-group">
                                  <label>Event name *</label>
                                  <input type="text" className="v-input" placeholder="e.g. Friday night comedy run" required value={newItem.name || ''} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
                                </div>
                                <div className="v-form-group">
                                  <label>Event visibility *</label>
                                  <div className="visibility-cards-row">
                                    <div className={`visibility-card ${(newItem.visibility === 'public' || !newItem.visibility) ? 'selected' : ''}`} onClick={() => setNewItem({ ...newItem, visibility: 'public' })}>
                                      <div className="visibility-circle">{(newItem.visibility === 'public' || !newItem.visibility) && <div className="checkmark" />}</div>
                                      <div className="visibility-info"><strong>Public</strong><span>Visible on Showmates listings.</span></div>
                                    </div>
                                    <div className={`visibility-card ${newItem.visibility === 'private' ? 'selected' : ''}`} onClick={() => setNewItem({ ...newItem, visibility: 'private' })}>
                                      <div className="visibility-circle">{newItem.visibility === 'private' && <div className="checkmark" />}</div>
                                      <div className="visibility-info"><strong>Private</strong><span>Accessible only by private access links.</span></div>
                                    </div>
                                  </div>
                                </div>
                                <div className="online-checkbox-card">
                                  <input type="checkbox" id="is_online_evt_mult" checked={!!newItem.is_online} onChange={(e) => setNewItem({ ...newItem, is_online: e.target.checked })} />
                                  <label htmlFor="is_online_evt_mult"><strong>Online event</strong><span>Online events use listing cities for each show instead of physical venues.</span></label>
                                </div>
                                <div className="v-form-group">
                                  <label>Category *</label>
                                  <select required className="v-input" value={newItem.category || ''} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}>
                                    <option value="">Search group or category</option>
                                    <option value="Music & Concerts">Music & Concerts</option>
                                    <option value="Comedy & Theatre">Comedy & Theatre</option>
                                    <option value="Workshops & Classes">Workshops & Classes</option>
                                    <option value="Parties & Nightlife">Parties & Nightlife</option>
                                    <option value="Festivals & Fairs">Festivals & Fairs</option>
                                    <option value="Sports & Fitness">Sports & Fitness</option>
                                    <option value="Corporate & Business">Corporate & Business</option>
                                    <option value="Other Events">Other Events</option>
                                  </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                                  <div className="v-form-group">
                                    <label>Booking Opens *</label>
                                    <input 
                                      type="datetime-local" 
                                      required 
                                      className="v-input" 
                                      value={newItem.booking_start || ''} 
                                      onChange={(e) => setNewItem({ ...newItem, booking_start: e.target.value })} 
                                    />
                                  </div>
                                  <div className="v-form-group">
                                    <label>Booking Closes *</label>
                                    <input 
                                      type="datetime-local" 
                                      required 
                                      className="v-input" 
                                      value={newItem.booking_end || ''} 
                                      onChange={(e) => setNewItem({ ...newItem, booking_end: e.target.value })} 
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>Show Details</h4>
                              </div>
                              <p className="section-card-desc">Provide language, duration, and age restriction details for attendees.</p>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                <div className="v-form-group">
                                  <label>Language</label>
                                  <input type="text" className="v-input" placeholder="e.g. Hindi / English" value={newItem.language || ''} onChange={(e) => setNewItem({ ...newItem, language: e.target.value })} />
                                </div>
                                <div className="v-form-group">
                                  <label>Duration</label>
                                  <input type="text" className="v-input" placeholder="e.g. 2h 30m" value={newItem.duration || ''} onChange={(e) => setNewItem({ ...newItem, duration: e.target.value })} />
                                </div>
                                <div className="v-form-group">
                                  <label>Entry (Age Restriction)</label>
                                  <input type="text" className="v-input" placeholder="e.g. All Ages, 18+" value={newItem.age_restriction || ''} onChange={(e) => setNewItem({ ...newItem, age_restriction: e.target.value })} />
                                </div>
                              </div>
                            </div>
                            <div className="wizard-navigation-footer">
                              <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(1)}>← Back</button>
                              <button type="button" className="wizard-next-btn" onClick={() => {
                                if (!newItem.name || !newItem.category) {
                                  toast.error("Please fill in required fields!");
                                  return;
                                }
                                setEventWizardStep(3);
                              }}>Next: Schedule</button>
                            </div>
                          </div>
                        ) : eventWizardStep === 3 ? (
                          // Step 3: Schedule
                          <div className="single-event-wizard-step animate-fade-in">
                            <div className="wizard-stepper-bar">
                              <div className="step-item active-past"><span className="step-number">1</span><span className="step-label">Basics</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active"><span className="step-number">2</span><span className="step-label">Schedule</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">3</span><span className="step-label">Tickets</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">4</span><span className="step-label">Photos & details</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">5</span><span className="step-label">Review</span></div>
                            </div>
                            <div className="wizard-step-header">
                              <h2 className="wizard-title">Event Schedule</h2>
                              <p className="wizard-subtitle">Add each date and time slot for your shows.</p>
                            </div>
                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>Schedules ({(newItem.schedule_slots || []).length})</h4>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {(newItem.schedule_slots || []).map((slot, index) => (
                                  <div key={slot.id || index} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', background: '#f8fafc' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontWeight: 'bold', fontSize: '0.85rem', color: '#ea580c' }}>
                                      <span>Show #{index + 1}</span>
                                      {newItem.schedule_slots.length > 1 && (
                                        <button type="button" style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => {
                                          setNewItem({ ...newItem, schedule_slots: newItem.schedule_slots.filter(s => s.id !== slot.id) });
                                        }}><Trash2 size={16} /></button>
                                      )}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                      <div className="v-form-group">
                                        <label>Date *</label>
                                        <input type="date" className="v-input" required value={slot.date || ''} onChange={(e) => {
                                          const slots = [...newItem.schedule_slots];
                                          slots[index] = { ...slot, date: e.target.value };
                                          setNewItem({ ...newItem, schedule_slots: slots });
                                        }} />
                                      </div>
                                      <div className="v-form-group">
                                        <label>Starts *</label>
                                        <input type="time" className="v-input" required value={slot.starts || '19:00'} onChange={(e) => {
                                          const slots = [...newItem.schedule_slots];
                                          slots[index] = { ...slot, starts: e.target.value };
                                          setNewItem({ ...newItem, schedule_slots: slots });
                                        }} />
                                      </div>
                                      <div className="v-form-group">
                                        <label>Ends *</label>
                                        <input type="time" className="v-input" required value={slot.ends || '22:00'} onChange={(e) => {
                                          const slots = [...newItem.schedule_slots];
                                          slots[index] = { ...slot, ends: e.target.value };
                                          setNewItem({ ...newItem, schedule_slots: slots });
                                        }} />
                                      </div>
                                      <div className="v-form-group">
                                        <label>Venue *</label>
                                        <input type="text" className="v-input" required placeholder="Venue details..." value={slot.venue_name || ''} onChange={(e) => {
                                          const slots = [...newItem.schedule_slots];
                                          slots[index] = { ...slot, venue_name: e.target.value };
                                          setNewItem({ ...newItem, schedule_slots: slots });
                                        }} />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <button type="button" className="add-tier-dashed-btn" onClick={() => {
                                const slots = [...(newItem.schedule_slots || [])];
                                slots.push({ id: Date.now(), date: '', starts: '19:00', ends: '22:00', venue_name: '' });
                                setNewItem({ ...newItem, schedule_slots: slots });
                              }}>+ Add another show date/time</button>
                            </div>
                            <div className="wizard-navigation-footer">
                              <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(2)}>← Back</button>
                              <button type="button" className="wizard-next-btn" onClick={() => {
                                const invalid = newItem.schedule_slots?.some(s => !s.date || !s.venue_name);
                                if (invalid || !newItem.schedule_slots?.length) {
                                  toast.error("Please fill in date and venue for all scheduled shows!");
                                  return;
                                }
                                setEventWizardStep(4);
                              }}>Next: Tickets</button>
                            </div>
                          </div>
                        ) : eventWizardStep === 4 ? (
                          // Step 4: Tickets
                          <div className="single-event-wizard-step animate-fade-in">
                            <div className="wizard-stepper-bar">
                              <div className="step-item active-past"><span className="step-number">1</span><span className="step-label">Basics</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active-past"><span className="step-number">2</span><span className="step-label">Schedule</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active"><span className="step-number">3</span><span className="step-label">Tickets</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">4</span><span className="step-label">Photos & details</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">5</span><span className="step-label">Review</span></div>
                            </div>
                            <div className="wizard-step-header">
                              <h2 className="wizard-title">Tickets</h2>
                              <p className="wizard-subtitle">Define the pricing tiers for your multiple shows.</p>
                            </div>
                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>Tickets</h4>
                                <span className="sell-badge">Tiers: {newItem.ticket_tiers?.length || 0}</span>
                              </div>
                              <div className="ticket-tiers-list">
                                {(newItem.ticket_tiers || []).map((tier, index) => (
                                  <div className="ticket-tier-row-card" key={tier.id || index}>
                                    <div className="tier-row-header">
                                      <span className="tier-index-number">{index + 1}</span>
                                      <span className="tier-badge-type">{parseFloat(tier.price) === 0 ? 'Free' : 'Paid'}</span>
                                      {newItem.ticket_tiers.length > 1 && (
                                        <button type="button" className="delete-tier-btn" onClick={() => {
                                          setNewItem({ ...newItem, ticket_tiers: newItem.ticket_tiers.filter((_, idx) => idx !== index) });
                                        }}><Trash2 size={16} /></button>
                                      )}
                                    </div>
                                    <div className="tier-inputs-grid">
                                      <div className="v-form-group">
                                        <label>Name *</label>
                                        <input type="text" className="v-input" placeholder="General Admission" required value={tier.tier_name || ''} onChange={(e) => {
                                          const nextTiers = [...newItem.ticket_tiers];
                                          nextTiers[index] = { ...tier, tier_name: e.target.value };
                                          setNewItem({ ...newItem, ticket_tiers: nextTiers });
                                        }} />
                                      </div>
                                      <div className="v-form-group">
                                        <label>Price *</label>
                                        <input type="number" className="v-input" placeholder="₹ 0" required value={tier.price === 0 ? '' : tier.price} onChange={(e) => {
                                          const nextTiers = [...newItem.ticket_tiers];
                                          nextTiers[index] = { ...tier, price: parseFloat(e.target.value) || 0 };
                                          setNewItem({ ...newItem, ticket_tiers: nextTiers });
                                        }} />
                                      </div>
                                      <div className="v-form-group">
                                        <label>Quantity *</label>
                                        {(newItem.schedule_slots && newItem.schedule_slots.length > 1) ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seats per Show Date</span>
                                            {(newItem.schedule_slots || []).map((slot, sIdx) => {
                                              const dateStr = slot.date ? new Date(slot.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : `Show #${sIdx + 1}`;
                                              const slotCap = tier.slot_capacities?.[slot.id] !== undefined ? tier.slot_capacities[slot.id] : (tier.total_seats || '100');
                                              return (
                                                <div key={slot.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{dateStr}:</span>
                                                  <input
                                                    type="number"
                                                    className="v-input"
                                                    style={{ padding: '6px 12px', fontSize: '0.8rem', width: '90px', height: '32px' }}
                                                    placeholder="100"
                                                    required
                                                    value={slotCap}
                                                    onChange={(e) => {
                                                      const nextTiers = [...newItem.ticket_tiers];
                                                      const slotCaps = { ...(tier.slot_capacities || {}) };
                                                      slotCaps[slot.id] = e.target.value;
                                                      nextTiers[index] = { ...tier, slot_capacities: slotCaps };
                                                      setNewItem({ ...newItem, ticket_tiers: nextTiers });
                                                    }}
                                                  />
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <input type="number" className="v-input" placeholder="100" required value={tier.total_seats || ''} onChange={(e) => {
                                            const nextTiers = [...newItem.ticket_tiers];
                                            nextTiers[index] = { ...tier, total_seats: parseInt(e.target.value) || 0, available_seats: parseInt(e.target.value) || 0 };
                                            setNewItem({ ...newItem, ticket_tiers: nextTiers });
                                          }} />
                                        )}
                                      </div>
                                      <div className="v-form-group">
                                        <label>Entries per ticket *</label>
                                        <input type="number" className="v-input" defaultValue={1} required />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <button type="button" className="add-tier-dashed-btn" onClick={() => {
                                const nextTiers = [...(newItem.ticket_tiers || [])];
                                nextTiers.push({ id: 'temp_' + Date.now(), tier_name: '', price: 0, total_seats: 100, available_seats: 100 });
                                setNewItem({ ...newItem, ticket_tiers: nextTiers });
                              }}>+ Add another ticket type</button>
                            </div>
                            <div className="wizard-navigation-footer">
                              <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(3)}>← Back</button>
                              <button type="button" className="wizard-next-btn" onClick={() => {
                                if (!newItem.ticket_tiers?.length || newItem.ticket_tiers.some(t => !t.tier_name)) {
                                  toast.error("Please add at least one complete ticket tier!");
                                  return;
                                }
                                setEventWizardStep(5);
                              }}>Next: Photos & details</button>
                            </div>
                          </div>
                        ) : eventWizardStep === 5 ? (
                          // Step 5: Photos & details
                          <div className="single-event-wizard-step animate-fade-in">
                            <div className="wizard-stepper-bar">
                              <div className="step-item active-past"><span className="step-number">1</span><span className="step-label">Basics</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active-past"><span className="step-number">2</span><span className="step-label">Schedule</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active-past"><span className="step-number">3</span><span className="step-label">Tickets</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active"><span className="step-number">4</span><span className="step-label">Photos & details</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">5</span><span className="step-label">Review</span></div>
                            </div>
                            <div className="wizard-step-header">
                              <h2 className="wizard-title">Event Banner & Description</h2>
                              <p className="wizard-subtitle">Upload assets to publish your multiple shows listing.</p>
                            </div>
                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>Visual Cover Photo & Gallery Images</h4>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Upload one or multiple images</span>
                              </div>
                              <div className="v-form-group">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                                  {eventImages.map((img, idx) => (
                                    <div key={idx} style={{ position: 'relative', height: '110px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                      <img src={img} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      <button
                                        type="button"
                                        style={{
                                          position: 'absolute',
                                          top: '4px',
                                          right: '4px',
                                          background: 'white',
                                          border: 'none',
                                          borderRadius: '50%',
                                          width: '24px',
                                          height: '24px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                          cursor: 'pointer',
                                          zIndex: 10
                                        }}
                                        onClick={() => handleRemoveEventImage(idx)}
                                      >
                                        <Trash2 size={12} color="#ef4444" />
                                      </button>
                                      {idx === 0 && (
                                        <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(15,23,42,0.85)', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                          Cover
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                  
                                  <label
                                    style={{
                                      height: '110px',
                                      border: '2px dashed #cbd5e1',
                                      borderRadius: '12px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      background: '#f8fafc',
                                      gap: '4px',
                                      transition: 'border-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ea580c'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                                  >
                                    <input
                                      type="file"
                                      hidden
                                      accept="image/*"
                                      onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                          const tempUrl = URL.createObjectURL(file);
                                          handleAddEventImage(tempUrl);
                                          const reader = new FileReader();
                                          reader.onloadend = async () => {
                                            const publicUrl = await uploadImageToSupabase(reader.result, 'events');
                                            setNewItem(prev => {
                                              const imgs = (() => { try { const a = JSON.parse(prev.image||''); if(Array.isArray(a)) return a; } catch(_){ /* ignore */ } return prev.image ? [prev.image] : []; })();
                                              const updated = imgs.map(u => u === tempUrl ? publicUrl : u);
                                              return { ...prev, image: updated.length > 1 ? JSON.stringify(updated) : (updated[0] || null) };
                                            });
                                            e.target.value = '';
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                    <Camera size={24} color="#64748b" />
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'bold' }}>Add Image</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>Event Description</h4>
                              </div>
                              <div className="v-form-group">
                                <label>Description *</label>
                                <textarea placeholder="Describe your event in detail..." required rows={6} value={newItem.detail || ''} onChange={(e) => setNewItem({ ...newItem, detail: e.target.value })} className="wizard-textarea" />
                              </div>
                            </div>
                            <div className="wizard-navigation-footer">
                              <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(4)}>← Back</button>
                              <button type="button" className="wizard-next-btn" onClick={() => {
                                if (!newItem.image || !newItem.detail) {
                                  toast.error("Please add cover photo and description!");
                                  return;
                                }
                                setEventWizardStep(6);
                              }}>Next: Review</button>
                            </div>
                          </div>
                        ) : (
                          // Step 6: Review
                          <div className="single-event-wizard-step animate-fade-in">
                            <div className="wizard-stepper-bar">
                              <div className="step-item active-past"><span className="step-number">1</span><span className="step-label">Basics</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active-past"><span className="step-number">2</span><span className="step-label">Schedule</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active-past"><span className="step-number">3</span><span className="step-label">Tickets</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active-past"><span className="step-number">4</span><span className="step-label">Photos & details</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active"><span className="step-number">5</span><span className="step-label">Review</span></div>
                            </div>
                            <div className="wizard-step-header">
                              <h2 className="wizard-title">Review Event Details</h2>
                              <p className="wizard-subtitle">Verify the details before publishing multiple shows live.</p>
                            </div>
                            <div className="wizard-section-card review-summary-card">
                              <div className="review-banner">
                                {(() => {
                                   let previewImg = newItem.image;
                                   if (typeof previewImg === 'string' && previewImg.startsWith('[')) {
                                     try {
                                       const parsed = JSON.parse(previewImg);
                                       if (Array.isArray(parsed) && parsed.length > 0) {
                                         previewImg = parsed[0];
                                       }
                                     } catch (_) { /* ignore */ }
                                   }
                                   return previewImg ? <img src={previewImg} alt="Banner" /> : <div className="no-banner-placeholder">No Banner Provided</div>;
                                 })()}
                                <span className="review-status-badge">UPCOMING</span>
                              </div>
                              <div className="review-content">
                                <h3 className="review-title">{newItem.name || 'Untitled Event'}</h3>
                                <div className="review-meta-row">
                                  <span className="review-category-tag">{newItem.category}</span>
                                  <span className="review-visibility-tag">{newItem.visibility || 'public'}</span>
                                </div>
                                <div style={{ margin: '1.5rem 0' }}>
                                  <strong>📅 Scheduled Shows ({(newItem.schedule_slots || []).length})</strong>
                                  <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {(newItem.schedule_slots || []).map((s, idx) => (
                                      <div key={s.id || idx} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Show #{idx + 1}: {s.date} ({s.starts} - {s.ends})</span>
                                        <strong>📍 {s.venue_name}</strong>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="review-tickets-section">
                                  <strong>Ticket Tiers ({newItem.ticket_tiers?.length || 0})</strong>
                                  <div className="review-tiers-list">
                                    {(newItem.ticket_tiers || []).map((t, idx) => {
                                      const capacity = (newItem.schedule_slots && newItem.schedule_slots.length > 1)
                                        ? newItem.schedule_slots.reduce((sum, slot) => sum + (t.slot_capacities?.[slot.id] !== undefined ? (parseInt(t.slot_capacities[slot.id]) || 0) : (parseInt(t.total_seats) || 100)), 0)
                                        : (t.total_seats || 100);
                                      return (
                                        <div className="review-tier-item" key={t.id || idx}>
                                          <div className="tier-left">
                                            <strong>{t.tier_name}</strong>
                                            <span>Capacity: {capacity} seats</span>
                                          </div>
                                          <span className="tier-price-tag">₹{t.price}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="wizard-navigation-footer">
                              <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(5)}>← Back</button>
                              <button type="submit" className="wizard-publish-btn" disabled={isSaving}>
                                {isSaving ? 'Publishing...' : 'Publish Multiple Shows'}
                              </button>
                            </div>
                          </div>
                        )
                      )
                    ) : (newItem.show_type === 'festival' || newItem.show_type === 'tour') ? (
                      // FESTIVAL OR TOUR WIZARD STEPS
                      (newItem.show_type === 'festival' || newItem.show_type === 'tour') && (
                        eventWizardStep === 2 ? (
                          // Step 2: Basics
                          <div className="single-event-wizard-step animate-fade-in">
                            <div className="wizard-stepper-bar">
                              <div className="step-item active"><span className="step-number">1</span><span className="step-label">Basic Details</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">2</span><span className="step-label">Venues</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">3</span><span className="step-label">Tickets</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">4</span><span className="step-label">Photos</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">5</span><span className="step-label">Review</span></div>
                            </div>
                            <div className="wizard-step-header">
                              <div className="wizard-back-indicator">
                                <span className="current-selection-badge">Festival or tour</span>
                                <button type="button" className="change-selection-btn" onClick={() => setEventWizardStep(1)}>Change</button>
                              </div>
                              <h2 className="wizard-title">Create Festival or Tour</h2>
                              <p className="wizard-subtitle">Use this flow for complex schedules, multiple venues, tours or advanced setup.</p>
                            </div>
                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>Basic Details</h4>
                              </div>
                              <div className="wizard-fields-stack">
                                <div className="v-form-group">
                                  <label>Event Title *</label>
                                  <input type="text" className="v-input" placeholder="Enter captivating event title" required value={newItem.name || ''} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                  <div className="v-form-group">
                                    <label>Event Category *</label>
                                    <select required className="v-input" value={newItem.category || ''} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}>
                                      <option value="">Select category</option>
                                      <option value="Music & Concerts">Music & Concerts</option>
                                      <option value="Comedy & Theatre">Comedy & Theatre</option>
                                      <option value="Workshops & Classes">Workshops & Classes</option>
                                      <option value="Parties & Nightlife">Parties & Nightlife</option>
                                      <option value="Festivals & Fairs">Festivals & Fairs</option>
                                      <option value="Sports & Fitness">Sports & Fitness</option>
                                    </select>
                                  </div>
                                  <div className="v-form-group">
                                    <label>Visibility *</label>
                                    <select required className="v-input" value={newItem.visibility || 'public'} onChange={(e) => setNewItem({ ...newItem, visibility: e.target.value })}>
                                      <option value="public">Public - Visible to anyone</option>
                                      <option value="private">Private - Invitation only</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="online-checkbox-card">
                                  <input type="checkbox" id="is_online_fest" checked={!!newItem.is_online} onChange={(e) => setNewItem({ ...newItem, is_online: e.target.checked })} />
                                  <label htmlFor="is_online_fest"><strong>This is an online event</strong><span>Virtual events use video conferencing platforms instead of physical venues.</span></label>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                                  <div className="v-form-group">
                                    <label>Booking Opens *</label>
                                    <input 
                                      type="datetime-local" 
                                      required 
                                      className="v-input" 
                                      value={newItem.booking_start || ''} 
                                      onChange={(e) => setNewItem({ ...newItem, booking_start: e.target.value })} 
                                    />
                                  </div>
                                  <div className="v-form-group">
                                    <label>Booking Closes *</label>
                                    <input 
                                      type="datetime-local" 
                                      required 
                                      className="v-input" 
                                      value={newItem.booking_end || ''} 
                                      onChange={(e) => setNewItem({ ...newItem, booking_end: e.target.value })} 
                                    />
                                  </div>
                                </div>
                                <div className="v-form-group">
                                  <label>Event Description *</label>
                                  <textarea className="wizard-textarea" placeholder="Describe your event in detail. What can attendees expect?" required rows={5} value={newItem.detail || ''} onChange={(e) => setNewItem({ ...newItem, detail: e.target.value })} />
                                </div>
                              </div>
                            </div>

                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>Show Details</h4>
                              </div>
                              <p className="section-card-desc">Provide language, duration, and age restriction details for attendees.</p>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                <div className="v-form-group">
                                  <label>Language</label>
                                  <input type="text" className="v-input" placeholder="e.g. Hindi / English" value={newItem.language || ''} onChange={(e) => setNewItem({ ...newItem, language: e.target.value })} />
                                </div>
                                <div className="v-form-group">
                                  <label>Duration</label>
                                  <input type="text" className="v-input" placeholder="e.g. 2h 30m" value={newItem.duration || ''} onChange={(e) => setNewItem({ ...newItem, duration: e.target.value })} />
                                </div>
                                <div className="v-form-group">
                                  <label>Entry (Age Restriction)</label>
                                  <input type="text" className="v-input" placeholder="e.g. All Ages, 18+" value={newItem.age_restriction || ''} onChange={(e) => setNewItem({ ...newItem, age_restriction: e.target.value })} />
                                </div>
                              </div>
                            </div>
                            <div className="wizard-navigation-footer">
                              <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(1)}>← Back</button>
                              <button type="button" className="wizard-next-btn" onClick={() => {
                                if (!newItem.name || !newItem.category || !newItem.detail) {
                                  toast.error("Please fill in title, category and description!");
                                  return;
                                }
                                setEventWizardStep(3);
                              }}>Next: Venues</button>
                            </div>
                          </div>
                        ) : eventWizardStep === 3 ? (
                          // Step 3: Venues/Stops
                          <div className="single-event-wizard-step animate-fade-in">
                            <div className="wizard-stepper-bar">
                              <div className="step-item active-past"><span className="step-number">1</span><span className="step-label">Basic Details</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active"><span className="step-number">2</span><span className="step-label">Venues</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">3</span><span className="step-label">Tickets</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">4</span><span className="step-label">Photos</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">5</span><span className="step-label">Review</span></div>
                            </div>
                            <div className="wizard-step-header">
                              <h2 className="wizard-title">Tour stops & Venues</h2>
                              <p className="wizard-subtitle">Define where and when each stop of the tour/festival occurs.</p>
                            </div>
                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>Venues ({(newItem.schedule_slots || []).length})</h4>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {(newItem.schedule_slots || []).map((slot, index) => (
                                  <div key={slot.id || index} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', background: '#f8fafc' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontWeight: 'bold', fontSize: '0.85rem', color: '#ea580c' }}>
                                      <span>Stop #{index + 1}</span>
                                      {newItem.schedule_slots.length > 1 && (
                                        <button type="button" style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => {
                                          setNewItem({ ...newItem, schedule_slots: newItem.schedule_slots.filter(s => s.id !== slot.id) });
                                        }}><Trash2 size={16} /></button>
                                      )}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                      <div className="v-form-group">
                                        <label>Venue / City *</label>
                                        <input type="text" className="v-input" required placeholder="Venue name and city" value={slot.venue_name || ''} onChange={(e) => {
                                          const slots = [...newItem.schedule_slots];
                                          slots[index] = { ...slot, venue_name: e.target.value };
                                          setNewItem({ ...newItem, schedule_slots: slots });
                                        }} />
                                      </div>
                                      <div className="v-form-group">
                                        <label>Date *</label>
                                        <input type="date" className="v-input" required value={slot.date || ''} onChange={(e) => {
                                          const slots = [...newItem.schedule_slots];
                                          slots[index] = { ...slot, date: e.target.value };
                                          setNewItem({ ...newItem, schedule_slots: slots });
                                        }} />
                                      </div>
                                      <div className="v-form-group">
                                        <label>Starts *</label>
                                        <input type="time" className="v-input" required value={slot.starts || '19:00'} onChange={(e) => {
                                          const slots = [...newItem.schedule_slots];
                                          slots[index] = { ...slot, starts: e.target.value };
                                          setNewItem({ ...newItem, schedule_slots: slots });
                                        }} />
                                      </div>
                                      <div className="v-form-group">
                                        <label>Ends *</label>
                                        <input type="time" className="v-input" required value={slot.ends || '22:00'} onChange={(e) => {
                                          const slots = [...newItem.schedule_slots];
                                          slots[index] = { ...slot, ends: e.target.value };
                                          setNewItem({ ...newItem, schedule_slots: slots });
                                        }} />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <button type="button" className="add-tier-dashed-btn" onClick={() => {
                                const slots = [...(newItem.schedule_slots || [])];
                                slots.push({ id: Date.now(), date: '', starts: '19:00', ends: '22:00', venue_name: '' });
                                setNewItem({ ...newItem, schedule_slots: slots });
                              }}>+ Add another tour stop</button>
                            </div>
                            <div className="wizard-navigation-footer">
                              <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(2)}>← Back</button>
                              <button type="button" className="wizard-next-btn" onClick={() => {
                                if (newItem.schedule_slots?.some(s => !s.date || !s.venue_name)) {
                                  toast.error("Please fill in date and venue details for all tour stops!");
                                  return;
                                }
                                setEventWizardStep(4);
                              }}>Next: Tickets</button>
                            </div>
                          </div>
                        ) : eventWizardStep === 4 ? (
                          // Step 4: Ticket Tiers
                          <div className="single-event-wizard-step animate-fade-in">
                            <div className="wizard-stepper-bar">
                              <div className="step-item active-past"><span className="step-number">1</span><span className="step-label">Basic Details</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active-past"><span className="step-number">2</span><span className="step-label">Venues</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active"><span className="step-number">3</span><span className="step-label">Tickets</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">4</span><span className="step-label">Photos</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">5</span><span className="step-label">Review</span></div>
                            </div>
                            <div className="wizard-step-header">
                              <h2 className="wizard-title">Ticket Tiers</h2>
                              <p className="wizard-subtitle">Create pricing categories for this tour/festival.</p>
                            </div>
                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>Tickets</h4>
                              </div>
                              <div className="ticket-tiers-list">
                                {(newItem.ticket_tiers || []).map((tier, index) => (
                                  <div className="ticket-tier-row-card" key={tier.id || index}>
                                    <div className="tier-row-header">
                                      <span className="tier-index-number">{index + 1}</span>
                                      <span className="tier-badge-type">{parseFloat(tier.price) === 0 ? 'Free' : 'Paid'}</span>
                                      {newItem.ticket_tiers.length > 1 && (
                                        <button type="button" className="delete-tier-btn" onClick={() => {
                                          setNewItem({ ...newItem, ticket_tiers: newItem.ticket_tiers.filter((_, idx) => idx !== index) });
                                        }}><Trash2 size={16} /></button>
                                      )}
                                    </div>
                                    <div className="tier-inputs-grid">
                                      <div className="v-form-group">
                                        <label>Name *</label>
                                        <input type="text" className="v-input" placeholder="General Admission" required value={tier.tier_name || ''} onChange={(e) => {
                                          const nextTiers = [...newItem.ticket_tiers];
                                          nextTiers[index] = { ...tier, tier_name: e.target.value };
                                          setNewItem({ ...newItem, ticket_tiers: nextTiers });
                                        }} />
                                      </div>
                                      <div className="v-form-group">
                                        <label>Price *</label>
                                        <input type="number" className="v-input" placeholder="₹ 0" required value={tier.price === 0 ? '' : tier.price} onChange={(e) => {
                                          const nextTiers = [...newItem.ticket_tiers];
                                          nextTiers[index] = { ...tier, price: parseFloat(e.target.value) || 0 };
                                          setNewItem({ ...newItem, ticket_tiers: nextTiers });
                                        }} />
                                      </div>
                                      <div className="v-form-group">
                                        <label>Quantity *</label>
                                        {(newItem.schedule_slots && newItem.schedule_slots.length > 1) ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seats per Show Date</span>
                                            {(newItem.schedule_slots || []).map((slot, sIdx) => {
                                              const dateStr = slot.date ? new Date(slot.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : `Show #${sIdx + 1}`;
                                              const slotCap = tier.slot_capacities?.[slot.id] !== undefined ? tier.slot_capacities[slot.id] : (tier.total_seats || '100');
                                              return (
                                                <div key={slot.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{dateStr}:</span>
                                                  <input
                                                    type="number"
                                                    className="v-input"
                                                    style={{ padding: '6px 12px', fontSize: '0.8rem', width: '90px', height: '32px' }}
                                                    placeholder="100"
                                                    required
                                                    value={slotCap}
                                                    onChange={(e) => {
                                                      const nextTiers = [...newItem.ticket_tiers];
                                                      const slotCaps = { ...(tier.slot_capacities || {}) };
                                                      slotCaps[slot.id] = e.target.value;
                                                      nextTiers[index] = { ...tier, slot_capacities: slotCaps };
                                                      setNewItem({ ...newItem, ticket_tiers: nextTiers });
                                                    }}
                                                  />
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <input type="number" className="v-input" placeholder="100" required value={tier.total_seats || ''} onChange={(e) => {
                                            const nextTiers = [...newItem.ticket_tiers];
                                            nextTiers[index] = { ...tier, total_seats: parseInt(e.target.value) || 0, available_seats: parseInt(e.target.value) || 0 };
                                            setNewItem({ ...newItem, ticket_tiers: nextTiers });
                                          }} />
                                        )}
                                      </div>
                                      <div className="v-form-group">
                                        <label>Entries per ticket *</label>
                                        <input type="number" className="v-input" defaultValue={1} required />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <button type="button" className="add-tier-dashed-btn" onClick={() => {
                                const nextTiers = [...(newItem.ticket_tiers || [])];
                                nextTiers.push({ id: 'temp_' + Date.now(), tier_name: '', price: 0, total_seats: 100, available_seats: 100 });
                                setNewItem({ ...newItem, ticket_tiers: nextTiers });
                              }}>+ Add another ticket type</button>
                            </div>
                            <div className="wizard-navigation-footer">
                              <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(3)}>← Back</button>
                              <button type="button" className="wizard-next-btn" onClick={() => {
                                if (!newItem.ticket_tiers?.length || newItem.ticket_tiers.some(t => !t.tier_name)) {
                                  toast.error("Please add at least one complete ticket tier!");
                                  return;
                                }
                                setEventWizardStep(5);
                              }}>Next: Photos</button>
                            </div>
                          </div>
                        ) : eventWizardStep === 5 ? (
                          // Step 5: Photos & Cover
                          <div className="single-event-wizard-step animate-fade-in">
                            <div className="wizard-stepper-bar">
                              <div className="step-item active-past"><span className="step-number">1</span><span className="step-label">Basic Details</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active-past"><span className="step-number">2</span><span className="step-label">Venues</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active-past"><span className="step-number">3</span><span className="step-label">Tickets</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active"><span className="step-number">4</span><span className="step-label">Photos</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">5</span><span className="step-label">Review</span></div>
                            </div>
                            <div className="wizard-step-header">
                              <h2 className="wizard-title">Event Banner</h2>
                              <p className="wizard-subtitle">Add a banner image to attract attendees to your festival/tour stops.</p>
                            </div>
                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>Banner Image</h4>
                              </div>
                              <div className="v-form-group">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                                  {eventImages.map((img, idx) => (
                                    <div key={idx} style={{ position: 'relative', height: '110px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                      <img src={img} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      <button
                                        type="button"
                                        style={{
                                          position: 'absolute',
                                          top: '4px',
                                          right: '4px',
                                          background: 'white',
                                          border: 'none',
                                          borderRadius: '50%',
                                          width: '24px',
                                          height: '24px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                          cursor: 'pointer',
                                          zIndex: 10
                                        }}
                                        onClick={() => handleRemoveEventImage(idx)}
                                      >
                                        <Trash2 size={12} color="#ef4444" />
                                      </button>
                                      {idx === 0 && (
                                        <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(15,23,42,0.85)', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                          Cover
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                  <label
                                    style={{
                                      height: '110px',
                                      border: '2px dashed #cbd5e1',
                                      borderRadius: '12px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      background: '#f8fafc',
                                      gap: '4px',
                                      transition: 'border-color 0.2s'
                                    }}
                                  >
                                    <input
                                      type="file"
                                      hidden
                                      accept="image/*"
                                      onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                          const tempUrl = URL.createObjectURL(file);
                                          handleAddEventImage(tempUrl);
                                          const reader = new FileReader();
                                          reader.onloadend = async () => {
                                            const publicUrl = await uploadImageToSupabase(reader.result, 'events');
                                            setNewItem(prev => {
                                              const imgs = (() => { try { const a = JSON.parse(prev.image||''); if(Array.isArray(a)) return a; } catch (_) { /* ignore */ } return prev.image ? [prev.image] : []; })();
                                              const updated = imgs.map(u => u === tempUrl ? publicUrl : u);
                                              return { ...prev, image: updated.length > 1 ? JSON.stringify(updated) : (updated[0] || null) };
                                            });
                                            e.target.value = '';
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                    <Camera size={24} color="#64748b" />
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'bold' }}>Add Image</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                            <div className="wizard-navigation-footer">
                              <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(4)}>← Back</button>
                              <button type="button" className="wizard-next-btn" onClick={() => {
                                if (eventImages.length === 0) {
                                  toast.error("Please upload a banner image!");
                                  return;
                                }
                                setNewItem(prev => ({ ...prev, image: JSON.stringify(eventImages) }));
                                setEventWizardStep(6);
                              }}>Next: Review</button>
                            </div>
                          </div>
                        ) : (
                          // Step 6: Review
                          <div className="single-event-wizard-step animate-fade-in">
                            <div className="wizard-stepper-bar">
                              <div className="step-item active-past"><span className="step-number">1</span><span className="step-label">Basic Details</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active-past"><span className="step-number">2</span><span className="step-label">Venues</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active-past"><span className="step-number">3</span><span className="step-label">Tickets</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active-past"><span className="step-number">4</span><span className="step-label">Photos</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active"><span className="step-number">5</span><span className="step-label">Review</span></div>
                            </div>
                            <div className="wizard-step-header">
                              <h2 className="wizard-title">Review Tour Details</h2>
                              <p className="wizard-subtitle">Verify the details before publishing your tour stops live.</p>
                            </div>
                            <div className="wizard-section-card review-summary-card">
                              <div className="review-banner">
                                {(() => {
                                   let previewImg = newItem.image;
                                   if (typeof previewImg === 'string' && previewImg.startsWith('[')) {
                                     try {
                                       const parsed = JSON.parse(previewImg);
                                       if (Array.isArray(parsed) && parsed.length > 0) {
                                         previewImg = parsed[0];
                                       }
                                     } catch (_) { /* ignore */ }
                                   }
                                   return previewImg ? <img src={previewImg} alt="Banner" /> : <div className="no-banner-placeholder">No Banner Provided</div>;
                                 })()}
                                <span className="review-status-badge">UPCOMING</span>
                              </div>
                              <div className="review-content">
                                <h3 className="review-title">{newItem.name || 'Untitled Tour/Festival'}</h3>
                                <div className="review-meta-row">
                                  <span className="review-category-tag">{newItem.category}</span>
                                  <span className="review-visibility-tag">{newItem.visibility || 'public'}</span>
                                </div>
                                <div style={{ margin: '1.5rem 0' }}>
                                  <strong>📅 Tour Stops / Venues ({(newItem.schedule_slots || []).length})</strong>
                                  <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {(newItem.schedule_slots || []).map((s, idx) => (
                                      <div key={s.id || idx} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Stop #{idx + 1}: {s.venue_name}</span>
                                        <strong>📍 {s.date} ({s.starts} - {s.ends})</strong>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="review-tickets-section">
                                  <strong>Ticket Tiers ({newItem.ticket_tiers?.length || 0})</strong>
                                  <div className="review-tiers-list">
                                    {(newItem.ticket_tiers || []).map((t, idx) => {
                                      const capacity = (newItem.schedule_slots && newItem.schedule_slots.length > 1)
                                        ? newItem.schedule_slots.reduce((sum, slot) => sum + (t.slot_capacities?.[slot.id] !== undefined ? (parseInt(t.slot_capacities[slot.id]) || 0) : (parseInt(t.total_seats) || 100)), 0)
                                        : (t.total_seats || 100);
                                      return (
                                        <div className="review-tier-item" key={t.id || idx}>
                                          <div className="tier-left">
                                            <strong>{t.tier_name}</strong>
                                            <span>Capacity: {capacity} seats</span>
                                          </div>
                                          <span className="tier-price-tag">₹{t.price}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="wizard-navigation-footer">
                              <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(5)}>← Back</button>
                              <button type="submit" className="wizard-publish-btn" disabled={isSaving}>
                                {isSaving ? 'Publishing...' : 'Publish Tour / Festival'}
                              </button>
                            </div>
                          </div>
                        )
                      )
                    ) : (
                      // SINGLE SHOW WIZARD STEPS
                      (newItem.show_type === 'single' || !newItem.show_type) && (
                        eventWizardStep === 2 ? (
                          // Step 2: Create your show (basics, when/where, tickets)
                          <div className="single-event-wizard-step animate-fade-in">
                            <div className="wizard-stepper-bar">
                              <div className="step-item active"><span className="step-number">1</span><span className="step-label">Create your show</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">2</span><span className="step-label">Photos & details</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">3</span><span className="step-label">Review</span></div>
                            </div>
                            <div className="wizard-step-header">
                              <div className="wizard-back-indicator">
                                <span className="current-selection-badge">Single show</span>
                                <button type="button" className="change-selection-btn" onClick={() => setEventWizardStep(1)}>Change</button>
                              </div>
                              <h2 className="wizard-title">Create your show</h2>
                              <p className="wizard-subtitle">Everything needed to start selling, all in one place.</p>
                            </div>

                            {/* Section 1: The basics */}
                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>The basics</h4>
                                <span className="required-badge">Required</span>
                              </div>
                              <p className="section-card-desc">Name the event and choose the category guests will browse under.</p>
                              <div className="wizard-fields-stack">
                                <div className="v-form-group">
                                  <label>Event name *</label>
                                  <input type="text" className="v-input" placeholder="e.g. An evening with Prateek Kuhad" required value={newItem.name || ''} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
                                </div>
                                <div className="v-form-group">
                                  <label>Event visibility *</label>
                                  <div className="visibility-cards-row">
                                    <div className={`visibility-card ${(newItem.visibility === 'public' || !newItem.visibility) ? 'selected' : ''}`} onClick={() => setNewItem({ ...newItem, visibility: 'public' })}>
                                      <div className="visibility-circle">{(newItem.visibility === 'public' || !newItem.visibility) && <div className="checkmark" />}</div>
                                      <div className="visibility-info"><strong>Public</strong><span>Visible on Showmate listings.</span></div>
                                    </div>
                                    <div className={`visibility-card ${newItem.visibility === 'private' ? 'selected' : ''}`} onClick={() => setNewItem({ ...newItem, visibility: 'private' })}>
                                      <div className="visibility-circle">{newItem.visibility === 'private' && <div className="checkmark" />}</div>
                                      <div className="visibility-info"><strong>Private</strong><span>Accessible only by private access links.</span></div>
                                    </div>
                                  </div>
                                </div>
                                <div className="online-checkbox-card">
                                  <input type="checkbox" id="is_online_evt" checked={!!newItem.is_online} onChange={(e) => setNewItem({ ...newItem, is_online: e.target.checked })} />
                                  <label htmlFor="is_online_evt"><strong>Online event</strong><span>Virtual events use video conferencing details instead of a physical venue.</span></label>
                                </div>
                                <div className="v-form-group">
                                  <label>Category *</label>
                                  <select required className="v-input" value={newItem.category || ''} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}>
                                    <option value="">Search group or category</option>
                                    <option value="Music & Concerts">Music & Concerts</option>
                                    <option value="Comedy & Theatre">Comedy & Theatre</option>
                                    <option value="Workshops & Classes">Workshops & Classes</option>
                                    <option value="Parties & Nightlife">Parties & Nightlife</option>
                                    <option value="Festivals & Fairs">Festivals & Fairs</option>
                                    <option value="Sports & Fitness">Sports & Fitness</option>
                                    <option value="Corporate & Business">Corporate & Business</option>
                                    <option value="Other Events">Other Events</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Section 2: When and where */}
                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>When and where</h4>
                              </div>
                              <p className="section-card-desc">Set the single public show date, time and venue.</p>
                              <div className="when-where-grid">
                                <div className="v-form-group">
                                  <label>Date *</label>
                                  <input type="date" required className="v-input" value={newItem.event_date ? newItem.event_date.split('T')[0] : ''} onChange={(e) => {
                                    const timePart = newItem.event_date && newItem.event_date.includes('T') ? newItem.event_date.split('T')[1] : '19:00';
                                    setNewItem({ ...newItem, event_date: `${e.target.value}T${timePart}` });
                                  }} />
                                </div>
                                <div className="v-form-group">
                                  <label>Starts *</label>
                                  <input type="time" required className="v-input" value={newItem.event_date && newItem.event_date.includes('T') ? newItem.event_date.split('T')[1].substring(0, 5) : '19:00'} onChange={(e) => {
                                    const datePart = newItem.event_date ? newItem.event_date.split('T')[0] : new Date().toISOString().split('T')[0];
                                    setNewItem({ ...newItem, event_date: `${datePart}T${e.target.value}:00` });
                                  }} />
                                </div>
                                <div className="v-form-group">
                                  <label>Ends *</label>
                                  <input type="time" required className="v-input" value={newItem.ends_at && newItem.ends_at.includes('T') ? newItem.ends_at.split('T')[1].substring(0, 5) : '22:00'} onChange={(e) => {
                                    const datePart = newItem.ends_at ? newItem.ends_at.split('T')[0] : (newItem.event_date ? newItem.event_date.split('T')[0] : new Date().toISOString().split('T')[0]);
                                    setNewItem({ ...newItem, ends_at: `${datePart}T${e.target.value}:00` });
                                  }} />
                                </div>
                              </div>
                              <div className="when-where-grid" style={{ marginTop: '1.25rem' }}>
                                <div className="v-form-group">
                                  <label>Booking Opens *</label>
                                  <input 
                                    type="datetime-local" 
                                    required 
                                    className="v-input" 
                                    value={newItem.booking_start || ''} 
                                    onChange={(e) => setNewItem({ ...newItem, booking_start: e.target.value })} 
                                  />
                                </div>
                                <div className="v-form-group">
                                  <label>Booking Closes *</label>
                                  <input 
                                    type="datetime-local" 
                                    required 
                                    className="v-input" 
                                    value={newItem.booking_end || ''} 
                                    onChange={(e) => setNewItem({ ...newItem, booking_end: e.target.value })} 
                                  />
                                </div>
                              </div>
                              <div className="v-form-group">
                                <label>Venue *</label>
                                <input type="text" className="v-input" placeholder="Search venue..." required={!newItem.is_online} disabled={!!newItem.is_online} value={newItem.is_online ? 'Online Virtual Venue' : (newItem.venue_name || '')} onChange={(e) => setNewItem({ ...newItem, venue_name: e.target.value })} />
                              </div>
                            </div>

                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>Show Details</h4>
                              </div>
                              <p className="section-card-desc">Provide language, duration, and age restriction details for attendees.</p>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                <div className="v-form-group">
                                  <label>Language</label>
                                  <input type="text" className="v-input" placeholder="e.g. Hindi / English" value={newItem.language || ''} onChange={(e) => setNewItem({ ...newItem, language: e.target.value })} />
                                </div>
                                <div className="v-form-group">
                                  <label>Duration</label>
                                  <input type="text" className="v-input" placeholder="e.g. 2h 30m" value={newItem.duration || ''} onChange={(e) => setNewItem({ ...newItem, duration: e.target.value })} />
                                </div>
                                <div className="v-form-group">
                                  <label>Entry (Age Restriction)</label>
                                  <input type="text" className="v-input" placeholder="e.g. All Ages, 18+" value={newItem.age_restriction || ''} onChange={(e) => setNewItem({ ...newItem, age_restriction: e.target.value })} />
                                </div>
                              </div>
                            </div>

                            {/* Section 3: Tickets */}
                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>Tickets</h4>
                                <div className="ticket-capacity-badges">
                                  <span className="cap-badge">Capacity: {newItem.ticket_tiers?.reduce((sum, t) => sum + (parseInt(t.total_seats) || 0), 0) || 0}</span>
                                </div>
                              </div>
                              <p className="section-card-desc">Each ticket type automatically applies to this one show.</p>
                              <div className="ticket-tiers-list">
                                {(newItem.ticket_tiers || []).map((tier, index) => (
                                  <div className="ticket-tier-row-card" key={tier.id || index}>
                                    <div className="tier-row-header">
                                      <span className="tier-index-number">{index + 1}</span>
                                      <span className="tier-badge-type">{parseFloat(tier.price) === 0 ? 'Free' : 'Paid'}</span>
                                      {newItem.ticket_tiers.length > 1 && (
                                        <button type="button" className="delete-tier-btn" onClick={() => {
                                          setNewItem({ ...newItem, ticket_tiers: newItem.ticket_tiers.filter((_, idx) => idx !== index) });
                                        }}><Trash2 size={16} /></button>
                                      )}
                                    </div>
                                    <div className="tier-inputs-grid">
                                      <div className="v-form-group">
                                        <label>Name *</label>
                                        <input type="text" className="v-input" placeholder="General Admission" required value={tier.tier_name || ''} onChange={(e) => {
                                          const nextTiers = [...newItem.ticket_tiers];
                                          nextTiers[index] = { ...tier, tier_name: e.target.value };
                                          setNewItem({ ...newItem, ticket_tiers: nextTiers });
                                        }} />
                                      </div>
                                      <div className="v-form-group">
                                        <label>Price *</label>
                                        <input type="number" className="v-input" placeholder="₹ 0" required value={tier.price === 0 ? '' : tier.price} onChange={(e) => {
                                          const nextTiers = [...newItem.ticket_tiers];
                                          nextTiers[index] = { ...tier, price: parseFloat(e.target.value) || 0 };
                                          setNewItem({ ...newItem, ticket_tiers: nextTiers });
                                        }} />
                                      </div>
                                      <div className="v-form-group">
                                        <label>Quantity *</label>
                                        {(newItem.schedule_slots && newItem.schedule_slots.length > 1) ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Seats per Show Date</span>
                                            {(newItem.schedule_slots || []).map((slot, sIdx) => {
                                              const dateStr = slot.date ? new Date(slot.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : `Show #${sIdx + 1}`;
                                              const slotCap = tier.slot_capacities?.[slot.id] !== undefined ? tier.slot_capacities[slot.id] : (tier.total_seats || '100');
                                              return (
                                                <div key={slot.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>{dateStr}:</span>
                                                  <input
                                                    type="number"
                                                    className="v-input"
                                                    style={{ padding: '6px 12px', fontSize: '0.8rem', width: '90px', height: '32px' }}
                                                    placeholder="100"
                                                    required
                                                    value={slotCap}
                                                    onChange={(e) => {
                                                      const nextTiers = [...newItem.ticket_tiers];
                                                      const slotCaps = { ...(tier.slot_capacities || {}) };
                                                      slotCaps[slot.id] = e.target.value;
                                                      nextTiers[index] = { ...tier, slot_capacities: slotCaps };
                                                      setNewItem({ ...newItem, ticket_tiers: nextTiers });
                                                    }}
                                                  />
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : (
                                          <input type="number" className="v-input" placeholder="100" required value={tier.total_seats || ''} onChange={(e) => {
                                            const nextTiers = [...newItem.ticket_tiers];
                                            nextTiers[index] = { ...tier, total_seats: parseInt(e.target.value) || 0, available_seats: parseInt(e.target.value) || 0 };
                                            setNewItem({ ...newItem, ticket_tiers: nextTiers });
                                          }} />
                                        )}
                                      </div>
                                      <div className="v-form-group">
                                        <label>Entries per ticket *</label>
                                        <input type="number" className="v-input" defaultValue={1} required />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <button type="button" className="add-tier-dashed-btn" onClick={() => {
                                const nextTiers = [...(newItem.ticket_tiers || [])];
                                nextTiers.push({ id: 'temp_' + Date.now(), tier_name: '', price: 0, total_seats: 100, available_seats: 100 });
                                setNewItem({ ...newItem, ticket_tiers: nextTiers });
                              }}>+ Add another ticket type</button>
                            </div>

                            <div className="wizard-navigation-footer">
                              <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(1)}>← Back</button>
                              <button type="button" className="wizard-next-btn" onClick={() => {
                                if (!newItem.name || !newItem.category) {
                                  toast.error("Please fill in the required basic fields!");
                                  return;
                                }
                                setEventWizardStep(3);
                              }}>Next: Photos & details</button>
                            </div>
                          </div>
                        ) : eventWizardStep === 3 ? (
                          // Step 3: Photos & details
                          <div className="single-event-wizard-step animate-fade-in">
                            <div className="wizard-stepper-bar">
                              <div className="step-item active-past"><span className="step-number">1</span><span className="step-label">Create your show</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active"><span className="step-number">2</span><span className="step-label">Photos & details</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item"><span className="step-number">3</span><span className="step-label">Review</span></div>
                            </div>
                            <div className="wizard-step-header">
                              <h2 className="wizard-title">Event Banner & Description</h2>
                              <p className="wizard-subtitle">Add rich details to attract attendees and make your listing premium.</p>
                            </div>
                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>Banner Image</h4>
                              </div>
                              <div className="v-form-group">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                                  {eventImages.map((img, idx) => (
                                    <div key={idx} style={{ position: 'relative', height: '110px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                      <img src={img} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      <button
                                        type="button"
                                        style={{
                                          position: 'absolute',
                                          top: '4px',
                                          right: '4px',
                                          background: 'white',
                                          border: 'none',
                                          borderRadius: '50%',
                                          width: '24px',
                                          height: '24px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                          cursor: 'pointer',
                                          zIndex: 10
                                        }}
                                        onClick={() => handleRemoveEventImage(idx)}
                                      >
                                        <Trash2 size={12} color="#ef4444" />
                                      </button>
                                      {idx === 0 && (
                                        <span style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'rgba(15,23,42,0.85)', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                          Cover
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                  <label
                                    style={{
                                      height: '110px',
                                      border: '2px dashed #cbd5e1',
                                      borderRadius: '12px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      background: '#f8fafc',
                                      gap: '4px',
                                      transition: 'border-color 0.2s'
                                    }}
                                  >
                                    <input
                                      type="file"
                                      hidden
                                      accept="image/*"
                                      onChange={async (e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                          const tempUrl = URL.createObjectURL(file);
                                          handleAddEventImage(tempUrl);
                                          const reader = new FileReader();
                                          reader.onloadend = async () => {
                                            const publicUrl = await uploadImageToSupabase(reader.result, 'events');
                                            setNewItem(prev => {
                                              const imgs = (() => { try { const a = JSON.parse(prev.image||''); if(Array.isArray(a)) return a; } catch (_) { /* ignore */ } return prev.image ? [prev.image] : []; })();
                                              const updated = imgs.map(u => u === tempUrl ? publicUrl : u);
                                              return { ...prev, image: updated.length > 1 ? JSON.stringify(updated) : (updated[0] || null) };
                                            });
                                            e.target.value = '';
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                    <Camera size={24} color="#64748b" />
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'bold' }}>Add Image</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                            <div className="wizard-section-card">
                              <div className="section-card-header">
                                <h4>Event Description</h4>
                              </div>
                              <div className="v-form-group">
                                <label>Description *</label>
                                <textarea placeholder="Describe your event in detail..." required rows={6} value={newItem.detail || ''} onChange={(e) => setNewItem({ ...newItem, detail: e.target.value })} className="wizard-textarea" />
                              </div>
                            </div>
                            <div className="wizard-navigation-footer">
                              <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(2)}>← Back</button>
                              <button type="button" className="wizard-next-btn" onClick={() => {
                                if (eventImages.length === 0 || !newItem.detail) {
                                  toast.error("Please add banner image and description details!");
                                  return;
                                }
                                setNewItem(prev => ({ ...prev, image: JSON.stringify(eventImages) }));
                                setEventWizardStep(4);
                              }}>Next: Review</button>
                            </div>
                          </div>
                        ) : (
                          // Step 4: Review
                          <div className="single-event-wizard-step animate-fade-in">
                            <div className="wizard-stepper-bar">
                              <div className="step-item active-past"><span className="step-number">1</span><span className="step-label">Create your show</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active-past"><span className="step-number">2</span><span className="step-label">Photos & details</span></div>
                              <div className="step-divider">›</div>
                              <div className="step-item active"><span className="step-number">3</span><span className="step-label">Review</span></div>
                            </div>
                            <div className="wizard-step-header">
                              <h2 className="wizard-title">Review event details</h2>
                              <p className="wizard-subtitle">Verify the details before publishing this event live.</p>
                            </div>
                            <div className="wizard-section-card review-summary-card">
                              <div className="review-banner">
                                {(() => {
                                   let previewImg = newItem.image;
                                   if (typeof previewImg === 'string' && previewImg.startsWith('[')) {
                                     try {
                                       const parsed = JSON.parse(previewImg);
                                       if (Array.isArray(parsed) && parsed.length > 0) {
                                         previewImg = parsed[0];
                                       }
                                     } catch (_) { /* ignore */ }
                                   }
                                   return previewImg ? <img src={previewImg} alt={newItem.name} /> : <div className="no-banner-placeholder">No Banner Provided</div>;
                                 })()}
                                <span className="review-status-badge">UPCOMING</span>
                              </div>
                              <div className="review-content">
                                <h3 className="review-title">{newItem.name || 'Untitled Event'}</h3>
                                <div className="review-meta-row">
                                  <span className="review-category-tag">{newItem.category || 'Category'}</span>
                                  <span className="review-visibility-tag">{newItem.visibility || 'public'}</span>
                                </div>
                                <div className="review-info-grid">
                                  <div className="review-info-item">
                                    <strong>📅 Date & Time</strong>
                                    <span>{newItem.event_date ? new Date(newItem.event_date).toLocaleString() : 'Not Set'}</span>
                                  </div>
                                  <div className="review-info-item">
                                    <strong>📍 Venue</strong>
                                    <span>{newItem.is_online ? 'Online Virtual Event' : (newItem.venue_name || 'Not Set')}</span>
                                  </div>
                                </div>
                                <div className="review-description-section">
                                  <strong>Description</strong>
                                  <p>{newItem.detail || 'No description provided.'}</p>
                                </div>
                                <div className="review-tickets-section">
                                  <strong>Ticket Tiers ({newItem.ticket_tiers?.length || 0})</strong>
                                  <div className="review-tiers-list">
                                    {(newItem.ticket_tiers || []).map((t, idx) => {
                                      const capacity = (newItem.schedule_slots && newItem.schedule_slots.length > 1)
                                        ? newItem.schedule_slots.reduce((sum, slot) => sum + (t.slot_capacities?.[slot.id] !== undefined ? (parseInt(t.slot_capacities[slot.id]) || 0) : (parseInt(t.total_seats) || 100)), 0)
                                        : (t.total_seats || 100);
                                      return (
                                        <div className="review-tier-item" key={t.id || idx}>
                                          <div className="tier-left">
                                            <strong>{t.tier_name || 'General Admission'}</strong>
                                            <span>Capacity: {capacity} seats</span>
                                          </div>
                                          <span className="tier-price-tag">₹{t.price}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="wizard-navigation-footer">
                              <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(3)}>← Back</button>
                              <button type="submit" className="wizard-publish-btn" disabled={isSaving}>
                                {isSaving ? 'Publishing...' : 'Publish Event'}
                              </button>
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                ) : businessType === 'sports' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto', flex: 1, padding: '2.5rem 3rem' }}>
                  <div className="v-form-row-2col">
                    <div className="v-form-group">
                      <label>Venue Name *</label>
                      <input required type="text" className="v-input" placeholder="e.g. Apex Sports Arena" value={newItem.name || ''} onChange={e => setNewItem({ ...newItem, name: e.target.value })} style={{ outline: 'none' }} />
                    </div>
                    <div className="v-form-group">
                      <label>Venue Address *</label>
                      <input required type="text" className="v-input" placeholder="Full physical address..." value={newItem.detail || ''} onChange={e => setNewItem({ ...newItem, detail: e.target.value })} style={{ outline: 'none' }} />
                    </div>
                  </div>
                  <div className="v-form-row-2col">
                    <div className="v-form-group">
                      <label>Base Price per Hour (₹) *</label>
                      <input required type="number" className="v-input" placeholder="e.g. 400" value={newItem.price || ''} onChange={e => setNewItem({ ...newItem, price: e.target.value })} style={{ outline: 'none' }} />
                    </div>
                  </div>

                  <div className="v-form-group">
                    <label style={{ marginBottom: '12px', display: 'block' }}>Select Sports Offered *</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {[
                        { id: 'box_cricket', label: 'Box Cricket' },
                        { id: 'turf', label: 'Football Turf' },
                        { id: 'badminton', label: 'Badminton' },
                        { id: 'tennis', label: 'Tennis' },
                        { id: 'pickleball', label: 'Pickleball' },
                        { id: 'padel', label: 'Padel' },
                        { id: 'table_tennis', label: 'Table Tennis' },
                        { id: 'snooker', label: 'Snooker' }
                      ].map(sport => {
                        const isChecked = newItem.sports?.includes(sport.id);
                        return (
                          <button
                            key={sport.id}
                            type="button"
                            onClick={() => {
                              const nextSports = isChecked ? [] : [sport.id];
                              const nextSlots = (newItem.slots || []).filter(s => s.sport === sport.id);
                              setNewItem({ ...newItem, sports: nextSports, slots: nextSlots });
                            }}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '20px',
                              border: isChecked ? '2px solid var(--v-primary)' : '1px solid #cbd5e1',
                              background: isChecked ? 'var(--v-primary-soft)' : 'white',
                              color: isChecked ? 'var(--v-primary)' : '#475569',
                              fontWeight: 800,
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            {sport.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slots Generator / Manager */}
                  {newItem.sports && newItem.sports.length > 0 && (
                    <div className="v-form-group" style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontWeight: 900, color: '#0f172a' }}>📅 Manage Time Slots</h4>
                      
                      {/* Generator Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', alignItems: 'end', marginBottom: '1.5rem', background: 'white', padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: 800 }}>Date</span>
                          <input type="date" id="gen-date" className="v-input" defaultValue={new Date().toISOString().split('T')[0]} style={{ outline: 'none' }} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: 800 }}>Start Time</span>
                          <input type="time" id="gen-start" className="v-input" defaultValue="06:00" style={{ outline: 'none' }} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: 800 }}>End Time</span>
                          <input type="time" id="gen-end" className="v-input" defaultValue="22:00" style={{ outline: 'none' }} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: 800 }}>Price per Hour</span>
                          <input type="number" id="gen-price" className="v-input" defaultValue="400" style={{ outline: 'none' }} />
                        </div>
                        <button
                          type="button"
                          className="v-btn-primary"
                          style={{ height: '42px', padding: '0 12px', justifyContent: 'center', whiteSpace: 'nowrap', outline: 'none' }}
                          onClick={() => {
                            const date = document.getElementById('gen-date').value;
                            const sport = newItem.sports[0];
                            const start = document.getElementById('gen-start').value;
                            const end = document.getElementById('gen-end').value;
                            const price = parseFloat(document.getElementById('gen-price').value) || 400;

                            if (!sport) {
                              toast.error("Please select a sport first!");
                              return;
                            }

                            // Generate hourly slots
                            let startH = parseInt(start.split(':')[0]);
                            let endH = parseInt(end.split(':')[0]);
                            if (start === end || end === '00:00') {
                              startH = 0;
                              endH = 24;
                            } else if (endH < startH) {
                              endH = 24;
                            }
                            const newSlots = [...(newItem.slots || [])];

                            for (let h = startH; h < endH; h++) {
                              const sTime = `${String(h).padStart(2, '0')}:00`;
                              const eTime = `${String(h + 1).padStart(2, '0')}:00`;
                              const exists = newSlots.some(s => s.date === date && s.sport === sport && s.start_time === sTime);
                              if (!exists) {
                                newSlots.push({ date, sport, start_time: sTime, end_time: eTime, price });
                              }
                            }
                            setNewItem(prev => ({ ...prev, slots: newSlots }));
                            toast.success("Generated slots successfully!");
                          }}
                        >
                          Generate Slots
                        </button>
                      </div>

                      {/* Slots List */}
                      <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(!newItem.slots || newItem.slots.length === 0) ? (
                          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            No slots generated yet. Use the generator above to add multiple slots.
                          </div>
                        ) : (
                          newItem.slots.map((slot, index) => (
                            <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1.5fr 1fr', gap: '12px', alignItems: 'center', background: 'white', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                              <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.85rem' }}>📅 {slot.date}</span>
                              <span style={{ fontWeight: 800, color: 'var(--v-primary)', fontSize: '0.85rem' }}>
                                {slot.sport === 'box_cricket' ? 'Box Cricket' : slot.sport === 'turf' ? 'Football Turf' : slot.sport.charAt(0).toUpperCase() + slot.sport.slice(1)}
                              </span>
                              <span style={{ fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>⏰ {slot.start_time} - {slot.end_time}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 900 }}>₹</span>
                                <input
                                  type="number"
                                  className="v-input"
                                  style={{ height: '28px', padding: '2px 8px', fontSize: '0.8rem', outline: 'none' }}
                                  value={slot.price}
                                  onChange={e => {
                                    const slots = [...newItem.slots];
                                    slots[index].price = parseFloat(e.target.value) || 0;
                                    setNewItem(prev => ({ ...prev, slots }));
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', justifyContent: 'center', outline: 'none' }}
                                onClick={() => {
                                  setNewItem(prev => ({ ...prev, slots: prev.slots.filter((_, i) => i !== index) }));
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div className="v-form-group">
                    <label>Venue Images *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                      {(newItem.images || []).map((img, idx) => (
                        <div key={idx} style={{ position: 'relative', height: '90px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          <img src={img} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            style={{ position: 'absolute', top: '4px', right: '4px', background: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', cursor: 'pointer', zIndex: 10, outline: 'none' }}
                            onClick={() => {
                              setNewItem({ ...newItem, images: newItem.images.filter((_, i) => i !== idx) });
                            }}
                          >
                            <Trash2 size={12} color="#ef4444" />
                          </button>
                        </div>
                      ))}
                      {(!newItem.images || newItem.images.length < 5) && (
                        <label style={{ height: '90px', border: '2px dashed #cbd5e1', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', gap: '4px' }}>
                          <input 
                            type="file" 
                            hidden 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const tempUrl = URL.createObjectURL(file);
                                const nextImages = [...(newItem.images || []), tempUrl];
                                setNewItem({ ...newItem, images: nextImages });
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const publicUrl = await uploadImageToSupabase(reader.result, 'venues');
                                  setNewItem(prev => ({
                                    ...prev,
                                    images: (prev.images || []).map(img => img === tempUrl ? publicUrl : img)
                                  }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }} 
                          />
                          <Camera size={20} color="#94a3b8" />
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>Add Photo</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div 
                    className="v-form-actions" 
                    style={{ 
                      padding: '1.5rem 0 0 0', 
                      borderTop: '1px solid #f1f5f9', 
                      background: 'white',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '1rem'
                    }}
                  >
                    <button type="button" onClick={() => setShowForm(false)} className="v-btn-outline">Discard</button>
                    <button type="submit" className="v-btn-primary">
                      {editingId ? 'Update Venue' : 'Publish Venue'}
                    </button>
                  </div>
                </div>
              ) : businessType === 'sports' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto', flex: 1, padding: '2.5rem 3rem' }}>
                  <div className="v-form-row-2col">
                    <div className="v-form-group">
                      <label>Venue Name *</label>
                      <input required type="text" className="v-input" placeholder="e.g. Apex Sports Arena" value={newItem.name || ''} onChange={e => setNewItem({ ...newItem, name: e.target.value })} style={{ outline: 'none' }} />
                    </div>
                    <div className="v-form-group">
                      <label>Venue Address *</label>
                      <input required type="text" className="v-input" placeholder="Full physical address..." value={newItem.detail || ''} onChange={e => setNewItem({ ...newItem, detail: e.target.value })} style={{ outline: 'none' }} />
                    </div>
                  </div>

                  <div className="v-form-group">
                    <label style={{ marginBottom: '12px', display: 'block' }}>Select Sports Offered *</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {[
                        { id: 'box_cricket', label: 'Box Cricket' },
                        { id: 'turf', label: 'Football Turf' },
                        { id: 'badminton', label: 'Badminton' },
                        { id: 'tennis', label: 'Tennis' },
                        { id: 'pickleball', label: 'Pickleball' },
                        { id: 'padel', label: 'Padel' },
                        { id: 'table_tennis', label: 'Table Tennis' },
                        { id: 'snooker', label: 'Snooker' }
                      ].map(sport => {
                        const isChecked = newItem.sports?.includes(sport.id);
                        return (
                          <button
                            key={sport.id}
                            type="button"
                            onClick={() => {
                              const nextSports = isChecked ? [] : [sport.id];
                              const nextSlots = (newItem.slots || []).filter(s => s.sport === sport.id);
                              setNewItem({ ...newItem, sports: nextSports, slots: nextSlots });
                            }}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '20px',
                              border: isChecked ? '2px solid var(--v-primary)' : '1px solid #cbd5e1',
                              background: isChecked ? 'var(--v-primary-soft)' : 'white',
                              color: isChecked ? 'var(--v-primary)' : '#475569',
                              fontWeight: 800,
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            {sport.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slots Generator / Manager */}
                  {newItem.sports && newItem.sports.length > 0 && (
                    <div className="v-form-group" style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 12px 0', fontWeight: 900, color: '#0f172a' }}>📅 Manage Time Slots</h4>
                      
                      {/* Generator Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', alignItems: 'end', marginBottom: '1.5rem', background: 'white', padding: '12px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: 800 }}>Date</span>
                          <input type="date" id="gen-date" className="v-input" defaultValue={new Date().toISOString().split('T')[0]} style={{ outline: 'none' }} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: 800 }}>Start Time</span>
                          <input type="time" id="gen-start" className="v-input" defaultValue="06:00" style={{ outline: 'none' }} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: 800 }}>End Time</span>
                          <input type="time" id="gen-end" className="v-input" defaultValue="22:00" style={{ outline: 'none' }} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: 800 }}>Price per Hour</span>
                          <input type="number" id="gen-price" className="v-input" defaultValue="400" style={{ outline: 'none' }} />
                        </div>
                        <button
                          type="button"
                          className="v-btn-primary"
                          style={{ height: '42px', padding: '0 12px', justifyContent: 'center', whiteSpace: 'nowrap', outline: 'none' }}
                          onClick={() => {
                            const date = document.getElementById('gen-date').value;
                            const sport = newItem.sports[0];
                            const start = document.getElementById('gen-start').value;
                            const end = document.getElementById('gen-end').value;
                            const price = parseFloat(document.getElementById('gen-price').value) || 400;

                            if (!sport) {
                              toast.error("Please select a sport first!");
                              return;
                            }

                            // Generate hourly slots
                            const startH = parseInt(start.split(':')[0]);
                            const endH = parseInt(end.split(':')[0]);
                            const newSlots = [...(newItem.slots || [])];

                            for (let h = startH; h < endH; h++) {
                              const sTime = `sq${String(h).padStart(2, '0')}:00`;
                              const eTime = `sq${String(h + 1).padStart(2, '0')}:00`;
                              const exists = newSlots.some(s => s.date === date && s.sport === sport && s.start_time === sTime);
                              if (!exists) {
                                newSlots.push({ date, sport, start_time: sTime, end_time: eTime, price });
                              }
                            }
                            setNewItem(prev => ({ ...prev, slots: newSlots }));
                            toast.success("Generated slots successfully!");
                          }}
                        >
                          Generate Slots
                        </button>
                      </div>

                      {/* Slots List */}
                      <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(!newItem.slots || newItem.slots.length === 0) ? (
                          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                            No slots generated yet. Use the generator above to add multiple slots.
                          </div>
                        ) : (
                          newItem.slots.map((slot, index) => (
                            <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1.5fr 1fr', gap: '12px', alignItems: 'center', background: 'white', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                              <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.85rem' }}>📅 {slot.date}</span>
                              <span style={{ fontWeight: 800, color: 'var(--v-primary)', fontSize: '0.85rem' }}>
                                {slot.sport === 'box_cricket' ? 'Box Cricket' : slot.sport === 'turf' ? 'Football Turf' : slot.sport.charAt(0).toUpperCase() + slot.sport.slice(1)}
                              </span>
                              <span style={{ fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>⏰ {slot.start_time} - {slot.end_time}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 900 }}>₹</span>
                                <input
                                  type="number"
                                  className="v-input"
                                  style={{ height: '28px', padding: '2px 8px', fontSize: '0.8rem', outline: 'none' }}
                                  value={slot.price}
                                  onChange={e => {
                                    const slots = [...newItem.slots];
                                    slots[index].price = parseFloat(e.target.value) || 0;
                                    setNewItem(prev => ({ ...prev, slots }));
                                  }}
                                />
                              </div>
                              <button
                                type="button"
                                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', justifyContent: 'center', outline: 'none' }}
                                onClick={() => {
                                  setNewItem(prev => ({ ...prev, slots: prev.slots.filter((_, i) => i !== index) }));
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  <div className="v-form-group">
                    <label>Venue Images *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                      {(newItem.images || []).map((img, idx) => (
                        <div key={idx} style={{ position: 'relative', height: '90px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          <img src={img} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            style={{ position: 'absolute', top: '4px', right: '4px', background: 'white', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', cursor: 'pointer', zIndex: 10, outline: 'none' }}
                            onClick={() => {
                              setNewItem({ ...newItem, images: newItem.images.filter((_, i) => i !== idx) });
                            }}
                          >
                            <Trash2 size={12} color="#ef4444" />
                          </button>
                        </div>
                      ))}
                      {(!newItem.images || newItem.images.length < 5) && (
                        <label style={{ height: '90px', border: '2px dashed #cbd5e1', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', gap: '4px' }}>
                          <input 
                            type="file" 
                            hidden 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const tempUrl = URL.createObjectURL(file);
                                const nextImages = [...(newItem.images || []), tempUrl];
                                setNewItem({ ...newItem, images: nextImages });
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const publicUrl = await uploadImageToSupabase(reader.result, 'venues');
                                  setNewItem(prev => ({
                                    ...prev,
                                    images: (prev.images || []).map(img => img === tempUrl ? publicUrl : img)
                                  }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }} 
                          />
                          <Camera size={20} color="#94a3b8" />
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b' }}>Add Photo</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div 
                    className="v-form-actions" 
                    style={{ 
                      padding: '1.5rem 0 0 0', 
                      borderTop: '1px solid #f1f5f9', 
                      background: 'white',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '1rem'
                    }}
                  >
                    <button type="button" onClick={() => setShowForm(false)} className="v-btn-outline">Discard</button>
                    <button type="submit" className="v-btn-primary">
                      {editingId ? 'Update Venue' : 'Publish Venue'}
                    </button>
                  </div>
                </div>
              ) : (
                  // STANDARD PRODUCT/SERVICE FORM FIELDS
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto', flex: 1, padding: '2.5rem 3rem' }}>
                      <div className="v-form-row-2col">
                        <div className="v-form-group">
                          <label>Title of the {businessType === 'shop' ? 'Product' : 'Service'}</label>
                          <input required type="text" className="v-input" placeholder="E.g. Full Home Sanitize" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                        </div>
                        <div className="v-form-group">
                          <label>Base Price (₹)</label>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 900, color: '#94a3b8' }}>₹</span>
                            <input 
                              required 
                              type="number" 
                              className="v-input" 
                              style={{ paddingLeft: '36px' }} 
                              placeholder="0.00" 
                              value={newItem.price} 
                              onChange={e => setNewItem({ ...newItem, price: e.target.value })} 
                            />
                          </div>
                        </div>
                      </div>

                      {businessType === 'service' && (
                        <div className="v-form-group">
                          <label>Service Category</label>
                          <select required className="v-input" value={newItem.category_id || '77777777-7777-7777-7777-777777777777'} onChange={e => setNewItem({ ...newItem, category_id: e.target.value })}>
                            <option value="77777777-7777-7777-7777-555555555555">Cleaning</option>
                            <option value="77777777-7777-7777-7777-111111111111">Electrical</option>
                            <option value="77777777-7777-7777-7777-222222222222">AC & Appliance</option>
                            <option value="77777777-7777-7777-7777-333333333333">Carpentry</option>
                            <option value="77777777-7777-7777-7777-444444444444">Painting</option>
                            <option value="77777777-7777-7777-7777-777777777777">Plumbing</option>
                          </select>
                        </div>
                      )}

                      {businessType === 'shop' && (
                        <>
                          <div className="v-form-row-2col">
                            <div className="v-form-group">
                              <label>Barcode Type</label>
                              <select className="v-input" value={newItem.barcode_type} onChange={e => setNewItem({ ...newItem, barcode_type: e.target.value })}>
                                <option value="EAN-13">EAN-13</option>
                                <option value="UPCA-2">UPCA-2</option>
                                <option value="UPC-A">UPC-A</option>
                                <option value="EAN-8">EAN-8</option>
                              </select>
                            </div>
                            <div className="v-form-group">
                              <label>Barcode Number</label>
                              <input type="text" maxLength={20} className="v-input" placeholder="E.g. 8901234567890" value={newItem.barcode} onChange={e => setNewItem({ ...newItem, barcode: e.target.value.replace(/\D/g, '') })} />
                            </div>
                          </div>
                          <div className="v-form-row-2col" style={{ marginTop: '-1rem' }}>
                            <div className="v-form-group">
                              <label>Stock Quantity</label>
                              <input required type="number" className="v-input" placeholder="E.g. 50" value={newItem.stock_quantity} onChange={e => setNewItem({ ...newItem, stock_quantity: e.target.value })} />
                            </div>
                          </div>
                        </>
                      )}

                      <div className="v-form-group">
                        <label>Description & Unique Selling Points</label>
                        <textarea className="v-input" style={{ minHeight: '120px', resize: 'vertical' }} placeholder="What makes this special? List features, warranty, or delivery times..." value={newItem.detail} onChange={e => setNewItem({ ...newItem, detail: e.target.value })} />
                      </div>

                      {businessType === 'shop' && (
                        <div className="v-form-group">
                          <label>Visual Presentation</label>
                          <div
                            className="v-input v-upload-zone"
                            onClick={(e) => {
                              if (e.target.id !== 'inventory-upload') {
                                document.getElementById('inventory-upload').click();
                              }
                            }}
                          >
                            <input id="inventory-upload" type="file" hidden accept="image/*" onClick={(e) => e.stopPropagation()} onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const tempUrl = URL.createObjectURL(file);
                                setNewItem(prev => ({ ...prev, image: tempUrl }));
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const publicUrl = await uploadImageToSupabase(reader.result, 'inventory');
                                  setNewItem(prev => ({ ...prev, image: prev.image === tempUrl ? publicUrl : prev.image }));
                                  e.target.value = '';
                                };
                                reader.readAsDataURL(file);
                              } else {
                                e.target.value = '';
                              }
                            }} />
                            {newItem.image ? (
                              <div style={{ position: 'relative', width: '220px', height: '150px', margin: '0 auto' }}>
                                <img src={newItem.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
                                <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setNewItem(prev => ({ ...prev, image: null })); }}><Trash2 size={16} color="#ef4444" /></div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <Camera size={40} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                                <p style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>Click to upload cover photo</p>
                                <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>High-res photos increase conversion by 40%</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div 
                      className="v-form-actions" 
                      style={{ 
                        padding: '1.5rem 3rem 2.5rem 3rem', 
                        borderTop: '1px solid #f1f5f9', 
                        background: 'white',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '1rem'
                      }}
                    >
                      <button type="button" onClick={() => setShowForm(false)} className="v-btn-outline">Discard</button>
                      <button type="submit" className="v-btn-primary">
                        {editingId ? 'Update Listing' : (businessType === 'shop' ? 'Publish to Store' : 'Publish Service')}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="v-grid-auto">
        {items.map((item, idx) => {
          const getFallbackByName = (name = '') => {
            const norm = name.toLowerCase();
            if (norm.includes('ac') || norm.includes('appliance') || norm.includes('fridge') || norm.includes('washing')) {
              return '/ac_repair.png';
            }
            if (norm.includes('clean') || norm.includes('sanitize') || norm.includes('maid') || norm.includes('wash')) {
              return '/cleaning.png';
            }
            if (norm.includes('plumb') || norm.includes('leak') || norm.includes('pipe') || norm.includes('tap')) {
              return '/plumbing.png';
            }
            if (norm.includes('electr') || norm.includes('wire') || norm.includes('fan') || norm.includes('switch')) {
              return '/electrician.png';
            }
            if (norm.includes('carpenter') || norm.includes('wood') || norm.includes('door') || norm.includes('furniture')) {
              return '/carpentry.png';
            }
            if (norm.includes('paint') || norm.includes('wall') || norm.includes('waterproof')) {
              return '/expert_services.png';
            }
            return '/essentials.png';
          };

          const getCleanImage = (imgSrc, name = '') => {
            if (!imgSrc || typeof imgSrc !== 'string') return businessType === 'event' ? 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80' : getFallbackByName(name);
            let clean = imgSrc.trim();
            if (clean.startsWith('[')) {
              try {
                const parsed = JSON.parse(clean);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  clean = parsed[0].trim();
                } else {
                  clean = '';
                }
              } catch (_) { /* ignore */ }
            }
            if (clean && (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:') || clean.startsWith('/') || clean.startsWith('blob:'))) {
              return clean;
            }
            return businessType === 'event' ? 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80' : getFallbackByName(name);
          };

          const cleanImage = getCleanImage(item.image, item.name);

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.04, duration: 0.3, ease: "easeOut" }}
              className="v-data-card"
            >
              <div className="v-card-image-wrap">
                <img 
                  src={cleanImage} 
                  alt={item.name} 
                  className="v-card-img"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.target.onerror = null; e.target.src = businessType === 'event' ? 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80' : getFallbackByName(item.name); }} 
                />
                <div className="v-card-overlay" />

                <div className="v-card-actions">
                  {!item.is_admin_organized && (
                    <button onClick={() => handleDelete(item.id)} className="v-action-btn delete"><Trash2 size={16} /></button>
                  )}
                </div>

                <div style={{ position: 'absolute', bottom: '16px', left: '16px' }}>
                  {(() => {
                    const isClosed = businessType === 'event' && (
                      item.status === 'CLOSED' || 
                      (item.booking_end && new Date(item.booking_end) < new Date()) || 
                      (item.event_date && new Date(item.event_date) < new Date())
                    );
                    return (
                      <span className={`v-badge-premium ${
                        businessType === 'shop'
                          ? (item.stock_quantity <= 0 ? 'v-badge-error' : 'v-badge-info')
                          : businessType === 'event'
                            ? (item.status === 'PENDING_APPROVAL' ? '' : item.status === 'REJECTED' ? '' : isClosed ? '' : 'v-badge-warning')
                            : 'v-badge-success'
                      }`} style={
                        businessType === 'event' && item.status === 'PENDING_APPROVAL'
                          ? { background: '#f59e0b', color: '#fff' }
                          : businessType === 'event' && item.status === 'REJECTED'
                          ? { background: '#ef4444', color: '#fff' }
                          : isClosed
                          ? { background: '#6b7280', color: '#fff' }
                          : {}
                      }>
                        {businessType === 'shop'
                          ? (item.stock_quantity <= 0 ? 'Out of Stock' : 'In Stock')
                          : businessType === 'event'
                            ? (item.status === 'PENDING_APPROVAL'
                                ? '⏳ Pending Approval'
                                : item.status === 'REJECTED'
                                ? '❌ Rejected'
                                : isClosed
                                ? '🚫 Event Closed'
                                : 'Active Event')
                            : businessType === 'sports'
                              ? 'Active Venue'
                              : businessType === 'sports'
                              ? 'Active Venue'
                              : 'Active Service'}
                      </span>
                    );
                  })()}
                </div>
                {/* Multi-show badge on the image overlay */}
                {businessType === 'event' && item.showCount > 1 && (
                  <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                    <span style={{
                      background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                      color: '#fff',
                      borderRadius: '20px',
                      padding: '3px 10px',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      letterSpacing: '0.02em',
                      boxShadow: '0 2px 8px rgba(124,58,237,0.35)'
                    }}>🎭 {item.showCount} Shows</span>
                  </div>
                )}
              </div>

              <div className="v-card-content">
                <h4 className="v-card-title">
                  {item.name}
                  {item.is_admin_organized && (
                    <span style={{ marginLeft: '8px', background: '#3b82f6', color: '#fff', borderRadius: '6px', padding: '2px 8px', fontSize: '0.62rem', verticalAlign: 'middle', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', display: 'inline-block' }}>
                      🛡️ Admin Organized
                    </span>
                  )}
                </h4>
                {businessType === 'event' && item.showCount > 1 && (
                  <p style={{ margin: '0 0 4px', fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed' }}>
                    {item.showCount} scheduled shows
                  </p>
                )}
                <p className="v-card-detail">{item.detail || (businessType === 'event' ? item.category || 'Upcoming event' : 'High quality listing with professional support.')}</p>
                 {businessType === 'event' && item.showsList && item.showsList.length > 1 ? (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '8px 0', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                     {item.showsList.map((show, idx) => {
                       let showDateStr = 'Unknown Date';
                       if (show.event_date) {
                         try {
                           const formattedStr = typeof show.event_date === 'string' ? show.event_date.replace(' ', 'T') : show.event_date;
                           const d = new Date(formattedStr);
                           if (!isNaN(d.getTime())) {
                             showDateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                           }
                         } catch (e) {
                           console.warn('Error formatting show date:', e);
                         }
                       }
                       const pct = show.total_seats > 0 ? (show.available_seats / show.total_seats) * 100 : 0;
                       return (
                         <div key={show.id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#475569' }}>
                             <span style={{ fontWeight: 600 }}>📅 {showDateStr}</span>
                              <span style={{
                                fontWeight: 700,
                                color: show.available_seats === 0 ? '#ef4444'
                                  : show.available_seats / show.total_seats < 0.2 ? '#f59e0b'
                                  : '#22c55e'
                              }}>
                                 {show.available_seats === 0 ? 'Sold Out' : `${show.available_seats}/${show.total_seats} left`}
                              </span>
                            </div>
                            {show.total_seats > 0 && (
                              <div style={{
                                width: '100%', height: '4px', borderRadius: '10px',
                                background: '#e2e8f0', overflow: 'hidden'
                              }}>
                                <div style={{
                                  height: '100%', borderRadius: '10px',
                                  width: `${Math.max(0, Math.min(100, pct))}%`,
                                  background: show.available_seats === 0 ? '#ef4444'
                                    : show.available_seats / show.total_seats < 0.2 ? '#f59e0b'
                                    : '#22c55e',
                                  transition: 'width 0.4s ease'
                                }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      {businessType === 'event' && item.event_date && (
                        <p style={{ margin: '4px 0 6px 0', fontSize: '0.75rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          <span>📅 {(() => {
                            try {
                              const formattedStr = typeof item.event_date === 'string' ? item.event_date.replace(' ', 'T') : item.event_date;
                              const d = new Date(formattedStr);
                              if (!isNaN(d.getTime())) {
                                return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                              }
                            } catch (e) { /* Invalid date format — fall through to 'Unknown Date' */ }
                            return 'Unknown Date';
                          })()}</span>
                          {item.venue_name && <span>📍 {item.venue_name}</span>}
                        </p>
                      )}
                      {businessType === 'event' && item.total_seats > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          <div style={{
                            flex: 1, height: '5px', borderRadius: '10px',
                            background: '#e2e8f0', overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%', borderRadius: '10px',
                              width: `${Math.max(0, Math.min(100, (item.available_seats / item.total_seats) * 100))}%`,
                              background: item.available_seats === 0 ? '#ef4444'
                                : item.available_seats / item.total_seats < 0.2 ? '#f59e0b'
                                : '#22c55e',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                          <span style={{
                            fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                            color: item.available_seats === 0 ? '#ef4444'
                              : item.available_seats / item.total_seats < 0.2 ? '#f59e0b'
                              : '#22c55e'
                          }}>
                            {item.available_seats === 0 ? 'Sold Out' : `${item.available_seats} seats left`}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                <div className="v-card-footer">
                  <div className="v-price-tag">
                    {businessType === 'event' && <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginRight: '2px' }}>from</span>}
                    <span className="v-price-currency">₹</span>
                    <span className="v-price-amount">{item.price}</span>
                  </div>
                  {item.is_admin_organized ? (
                    <button disabled style={{ background: '#cbd5e1', color: '#64748b', cursor: 'not-allowed', boxShadow: 'none' }} className="v-card-edit-btn">
                      Admin Event
                    </button>
                  ) : (
                    <button onClick={() => handleEditClick(item)} className="v-card-edit-btn">
                      {businessType === 'event' ? 'Edit Event' : 'Edit Listing'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
        onConfirm={() => {
          if (confirmDialog.onConfirm) confirmDialog.onConfirm();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

// Google Maps Order Tracking for Vendor Dashboard
function VendorOrderTrackingMap({ order, riderCoords, businessType }) {
  const mapRef = React.useRef(null);
  const googleMapInstance = React.useRef(null);
  const activeMarkers = React.useRef([]);
  const activePolylines = React.useRef([]);
  const isGoogleLoaded = useGoogleMaps();
  const [osrmRoutePoints, setOsrmRoutePoints] = React.useState([]);
  const [storeLatLng, setStoreLatLng] = React.useState(null);
  const [customerLatLng, setCustomerLatLng] = React.useState(null);

  // Geocode helper
  const geocodeAddress = async (address) => {
    if (!address) return null;
    const lower = address.toLowerCase().replace(/[.,]/g, '');
    for (const [key, coords] of Object.entries(AHMEDABAD_AREA_COORDS)) {
      if (lower.includes(key)) return coords;
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Ahmedabad, Gujarat, India')}&limit=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Passwalaa-App/1.0' } });
      if (res.ok) {
        const data = await res.json();
        if (data?.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      }
    } catch (err) { console.warn('Geocoding error:', err); }
    return null;
  };

  // Resolve store and customer positions
  React.useEffect(() => {
    let active = true;
    const resolve = async () => {
      let storePos = order.stores?.lat && order.stores?.lng
        ? [parseFloat(order.stores.lat), parseFloat(order.stores.lng)]
        : (await geocodeAddress(order.stores?.address || 'Ahmedabad') || [23.0305, 72.5075]);
      let custPos = order.addresses?.lat && order.addresses?.lng
        ? [parseFloat(order.addresses.lat), parseFloat(order.addresses.lng)]
        : (await geocodeAddress(order.addresses?.address_line_1 || 'Ahmedabad') || [23.0393, 72.5244]);
      if (active) { setStoreLatLng(storePos); setCustomerLatLng(custPos); }
    };
    resolve();
    return () => { active = false; };
  }, [order.stores, order.addresses]);

  // Fetch OSRM route
  React.useEffect(() => {
    if (!storeLatLng || !customerLatLng) return;
    const riderLatLng = riderCoords?.lat && riderCoords?.lng
      ? [parseFloat(riderCoords.lat), parseFloat(riderCoords.lng)] : null;
    const start = riderLatLng || storeLatLng;
    const end = (order.status === 'ACCEPTED' || order.status === 'PREPARING') ? storeLatLng : customerLatLng;
    if (!start[0] || !end[0] || (start[0] === end[0] && start[1] === end[1])) return;
    getOSRMRoute(start[0], start[1], end[0], end[1])
      .then(r => setOsrmRoutePoints(r.success && r.polyline.length > 0 ? r.polyline : []))
      .catch(() => setOsrmRoutePoints([]));
  }, [order.status, riderCoords, storeLatLng, customerLatLng]);

  // Initialize Google Map
  React.useEffect(() => {
    if (!isGoogleLoaded || !mapRef.current || googleMapInstance.current) return;
    googleMapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: { lat: 23.0225, lng: 72.5714 },
      zoom: 14,
      mapTypeControl: false, streetViewControl: false, fullscreenControl: false, zoomControl: true,
      zoomControlOptions: { position: window.google?.maps?.ControlPosition?.RIGHT_TOP },
      styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
    });
    return () => {
      activeMarkers.current.forEach(m => m.setMap(null));
      activePolylines.current.forEach(p => p.setMap(null));
      googleMapInstance.current = null;
    };
  }, [isGoogleLoaded]);

  // Draw markers and routes
  React.useEffect(() => {
    if (!googleMapInstance.current || !storeLatLng || !customerLatLng) return;
    activeMarkers.current.forEach(m => m.setMap(null));
    activePolylines.current.forEach(p => p.setMap(null));
    activeMarkers.current = []; activePolylines.current = [];

    const map = googleMapInstance.current;
    const svgIcon = (color, svgPath, rounded = false) => ({
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42"><rect x="0" y="0" width="42" height="42" rx="${rounded ? 12 : 21}" fill="${color}" stroke="white" stroke-width="3"/><g transform="translate(9,9)">${svgPath}</g></svg>`
      ),
      scaledSize: new window.google.maps.Size(42, 42),
      anchor: new window.google.maps.Point(21, 21)
    });
    const createMarker = (pos, title, iconObj) => new window.google.maps.Marker({ position: pos, map, title: title || '', icon: iconObj });

    const drawPoly = (pts, color, weight = 6, dashed = false) => {
      if (!pts || pts.length < 2) return;
      const path = pts.map(p => Array.isArray(p) ? { lat: p[0], lng: p[1] } : p);
      const opts = { path, geodesic: true, strokeColor: color, strokeOpacity: dashed ? 0.0 : 0.9, strokeWeight: weight, map };
      if (dashed) opts.icons = [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, strokeColor: color, scale: 3 }, offset: '0', repeat: '15px' }];
      activePolylines.current.push(new window.google.maps.Polyline(opts));
    };

    const storePt = { lat: storeLatLng[0], lng: storeLatLng[1] };
    const custPt = { lat: customerLatLng[0], lng: customerLatLng[1] };
    const riderPt = riderCoords?.lat && riderCoords?.lng
      ? { lat: parseFloat(riderCoords.lat), lng: parseFloat(riderCoords.lng) } : null;

    // Store marker (orange)
    activeMarkers.current.push(createMarker(storePt, businessType === 'service' ? 'Your Service Hub' : 'Your Store',
      svgIcon('#f97316', '<path d="m1 4 3-3h14l3 3v2H1V4z" fill="none" stroke="white" stroke-width="1.8"/><rect x="1" y="6" width="22" height="14" rx="1" fill="none" stroke="white" stroke-width="1.8"/><path d="M9 20v-4h6v4" fill="none" stroke="white" stroke-width="1.8"/>', true)
    ));

    // Customer marker (blue)
    activeMarkers.current.push(createMarker(custPt, `Customer: ${order.addresses?.society || 'Delivery Location'}`,
      svgIcon('#3b82f6', '<path d="m1 6 11-5 11 5v13a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6z" fill="none" stroke="white" stroke-width="1.8"/><polyline points="6 24 6 12 12 12 12 24" stroke="white" stroke-width="1.8" fill="none"/>')
    ));

    // Rider marker (green)
    if (riderPt) {
      activeMarkers.current.push(createMarker(riderPt, businessType === 'service' ? 'Assigned Expert' : 'Assigned Rider',
        svgIcon('#10b981', businessType === 'service'
          ? '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="none" stroke="white" stroke-width="1.8"/>'
          : '<polygon points="3 9 20 2 13 19 11 11 3 9" fill="none" stroke="white" stroke-width="1.8"/>'
        )
      ));
    }

    // Route polylines
    const leg1Color = '#f97316', leg2Color = '#3b82f6';
    if (order.status === 'ACCEPTED' || order.status === 'PREPARING') {
      if (osrmRoutePoints.length > 0) drawPoly(osrmRoutePoints, leg1Color);
      else if (riderPt) drawPoly([riderPt, storePt], leg1Color);
      drawPoly([storePt, custPt], leg2Color, 5, true);
    } else {
      if (riderPt) drawPoly([storePt, riderPt], '#94a3b8', 3, true);
      if (osrmRoutePoints.length > 0) drawPoly(osrmRoutePoints, leg2Color);
      else drawPoly([riderPt || storePt, custPt], leg2Color);
    }

    // Fit bounds
    try {
      const bounds = new window.google.maps.LatLngBounds();
      [storePt, custPt, ...(riderPt ? [riderPt] : []), ...osrmRoutePoints.map(p => ({ lat: p[0], lng: p[1] }))]
        .filter(p => !isNaN(p.lat || p[0])).forEach(p => bounds.extend(p.lat != null ? p : { lat: p[0], lng: p[1] }));
      if (!bounds.isEmpty()) setTimeout(() => { if (googleMapInstance.current) googleMapInstance.current.fitBounds(bounds); }, 150);
    } catch (e) { console.warn('Map bounds error:', e); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.status, riderCoords, osrmRoutePoints, storeLatLng, customerLatLng, businessType]);

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }} />
  );
}

// Map Wrapper Component to manage isolated Supabase state per active order
function VendorOrderMapWrapper({ order, businessType }) {
  const [riderCoords, setRiderCoords] = React.useState(null);


  React.useEffect(() => {
    if (!order) {
      setRiderCoords(null);
      return;
    }

    let activeChannel = null;
    let isMounted = true;

    const setupRiderTracking = async () => {
      let targetRiderId = order.rider_id;

      // If rider_id is not directly on the order, try to fetch it from delivery_tracking
      if (!targetRiderId) {
        try {
          const { data: dtData } = await supabase
            .from('delivery_tracking')
            .select('rider_id')
            .eq('order_id', order.id)
            .maybeSingle();
          if (dtData && dtData.rider_id) {
            targetRiderId = dtData.rider_id;
          }
        } catch (err) {
          console.warn("Error fetching rider_id from delivery_tracking:", err);
        }
      }

      if (!targetRiderId) {
        if (isMounted) setRiderCoords(null);
        return;
      }

      // Fetch Initial Location
      try {
        const { data } = await supabase
          .from('rider_locations')
          .select('lat, lng, updated_at')
          .eq('rider_id', targetRiderId)
          .maybeSingle();

        if (data && isMounted) {
          setRiderCoords({ lat: parseFloat(data.lat), lng: parseFloat(data.lng) });
        }
      } catch (err) {
        console.warn("Error getting initial rider position:", err);
      }

      // Listen to real-time coordinate updates
      if (isMounted) {
        activeChannel = supabase
          .channel(`vendor-rider-tracking-${order.id}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'rider_locations',
            filter: `rider_id=eq.${targetRiderId}`
          }, (payload) => {
            if (!isMounted) return;
            if (payload.eventType === 'DELETE') {
              setRiderCoords(null);
            } else if (payload.new && payload.new.lat && payload.new.lng) {
              setRiderCoords({ lat: parseFloat(payload.new.lat), lng: parseFloat(payload.new.lng) });
            }
          })
          .subscribe();
      }
    };

    setupRiderTracking();

    return () => {
      isMounted = false;
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, [order]);

  return (
    <div style={{ position: 'relative', height: '260px', borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2e8f0', marginTop: '0.75rem', zIndex: 1 }}>
      <VendorOrderTrackingMap order={order} riderCoords={riderCoords} businessType={businessType} />

      {/* Floating Info Overlay */}
      <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'white', padding: '6px 12px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: riderCoords ? '#22c55e' : '#94a3b8', animation: riderCoords ? 'pulse 2s infinite' : 'none' }}></div>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>
          {businessType === 'service'
            ? (['ACCEPTED', 'PREPARING', 'SHIPPED', 'DISPATCHED'].includes(order.status) ? 'Service in progress' : order.status === 'DELIVERED' ? 'Service completed' : 'Waiting for confirmation')
            : ((riderCoords || ['ACCEPTED', 'PREPARING', 'DISPATCHED', 'SHIPPED'].includes(order.status)) ? 'Rider / Order In Progress' : (order.rider_id ? 'Rider Assigned' : 'Waiting for Rider Assignment'))
          }
        </span>
      </div>
    </div>
  );
}

export const VendorOrders = ({ storeId, businessType, vendorData, _setPortalActiveTab }) => {
  const [activeTab, setActiveTab] = React.useState('active');
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [qrScannerOpen, setQrScannerOpen] = React.useState({ open: false, booking: null });
  const [checkinLoading, setCheckinLoading] = React.useState(false);
  const [checkinResult, setCheckinResult] = React.useState(null);
  const [confirmDialog, setConfirmDialog] = React.useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger'
  });

  const downloadVendorSalesReport = () => {
    if (!orders || orders.length === 0) {
      toast.error("No sales records found to export.");
      return;
    }
    const toastId = toast.loading("Generating sales report...");

    // Helper: escape CSV cell
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'N/A';
    const inr = (n) => Number(n || 0).toFixed(2);

    try {
      let header = [];
      let rows = [];

      if (businessType === 'event') {
        // EVENT TICKETS — full detail with invoice, tier, GST breakdown, QR hash
        header = ['Booking ID', 'Invoice No.', 'Booked On', 'Customer Name', 'Customer Phone', 'Event Name', 'Ticket Tier', 'Qty', 'Base Amount (INR)', 'CGST 9% (INR)', 'SGST 9% (INR)', 'Total Amount (INR)', 'QR / Entry Pass', 'Status'];
        rows = orders.map(o => {
          const itemName = o.order_items?.[0]?.products?.name || o.event_title || 'Event Ticket';
          return [
            esc(o.id), esc(o.invoice_number || 'N/A'), esc(fmt(o.created_at)),
            esc(o.users?.full_name || 'Customer'), esc(o.users?.phone || 'N/A'),
            esc(o.event_title || itemName),
            esc(o.tier_name || 'General'),
            o.ticket_count || 1,
            inr(o.subtotal || o.base_amount),
            inr(o.cgst_amount),
            inr(o.sgst_amount),
            inr(o.total_amount),
            esc(o.qr_code_hash || 'N/A'),
            esc(o.status || 'CONFIRMED')
          ].join(',');
        });

      } else if (businessType === 'service') {
        // HOME SERVICES — scheduled date, service name, address
        header = ['Booking ID', 'Booked On', 'Scheduled Date & Time', 'Customer Name', 'Customer Phone', 'Service Name', 'Service Address', 'Amount (INR)', 'Status'];
        rows = orders.map(o => {
          const addr = o.addresses ? `${o.addresses.society || o.addresses.address_line_1 || ''}, ${o.addresses.city || 'Ahmedabad'}` : 'N/A';
          const svcName = o.order_items?.[0]?.products?.name || 'Service';
          return [
            esc(o.id), esc(fmt(o.created_at)), esc(fmt(o.scheduled_at)),
            esc(o.users?.full_name || 'Customer'), esc(o.users?.phone || 'N/A'),
            esc(svcName), esc(addr),
            inr(o.total_amount), esc(o.status || 'PENDING')
          ].join(',');
        });

      } else {
        // SHOP ORDERS — items, subtotal, tax, total
        header = ['Order ID', 'Date & Time', 'Customer Name', 'Customer Phone', 'Delivery Address', 'Items Ordered', 'Subtotal (INR)', 'Tax (INR)', 'Total Amount (INR)', 'Status'];
        rows = orders.map(o => {
          const items = o.order_items?.map(i => `${i.products?.name || 'Item'} x${i.quantity}`).join(' | ') || 'N/A';
          const addr = o.addresses ? `${o.addresses.society || o.addresses.address_line_1 || ''}, ${o.addresses.city || ''}` : 'N/A';
          const subtotalVal = Number(o.subtotal || 0);
          const totalVal = Number(o.total_amount || 0);
          const tax = (totalVal - subtotalVal).toFixed(2);
          return [
            esc(o.id), esc(fmt(o.created_at)),
            esc(o.users?.full_name || 'Customer'), esc(o.users?.phone || 'N/A'),
            esc(addr), esc(items),
            inr(subtotalVal), tax, inr(totalVal),
            esc(o.status || 'PENDING')
          ].join(',');
        });
      }

      const grandTotal = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
      const typeLabel = businessType === 'event' ? 'EVENT TICKETS' : businessType === 'service' ? 'HOME SERVICES' : 'SHOP ORDERS';
      const today = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });

      const totalColIdx = header.length - 2; // column before Status
      const totalPad = ','.repeat(totalColIdx);
      const csvContent = [
        `PASSWALA — ${typeLabel} SALES REPORT`,
        `Generated: ${today}`,
        `Total Revenue: INR ${inr(grandTotal)}`,
        '',
        header.join(','),
        ...rows,
        `TOTAL${totalPad}${inr(grandTotal)},`
      ].join('\n');

      // UTF-8 BOM so Excel auto-detects encoding
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `vendor_${businessType}_sales_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.dismiss(toastId);
      toast.success("Sales report downloaded — open in Excel!");
    } catch (e) {
      toast.dismiss(toastId);
      console.error(e);
      toast.error(`Failed to export report: ${e.message}`);
    }
  };

  const fetchOrders = React.useCallback(async (isInitial = false) => {
    if (!storeId) {
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      if (isInitial) setLoading(true);

      if (businessType === 'event') {
        const userId = vendorData?.user_id || storeId;
        const { data, error } = await supabase
          .from('event_bookings')
          .select(`
            *,
            users(full_name, phone),
            events(title, created_by)
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          const userBookings = data.filter(b => b.events?.created_by === userId);
          const mappedBookings = userBookings.map(b => ({
            id: b.id,
            created_at: b.created_at,
            status: b.status,
            total_amount: b.total_amount,
            subtotal: b.base_amount,
            qr_code_hash: b.qr_code_hash,
            ticket_count: b.ticket_count,
            event_title: b.events?.title || 'Event Ticket',
            users: b.users,
            addresses: {
              address_line_1: 'Digital E-Ticket',
              society: 'Digital Pass'
            },
            order_items: [{
              quantity: b.ticket_count,
              products: {
                name: `${b.events?.title || 'Event Ticket'} (x${b.ticket_count} Tickets)`
              }
            }]
          }));
          setOrders(mappedBookings);
        } else {
          setOrders([]);
        }
      } else if (businessType === 'service') {
        const { data, error } = await supabase
          .from('service_bookings')
          .select(`
            *,
            users(full_name, phone),
            addresses(*),
            services(title)
          `)
          .eq('provider_id', storeId)
          .order('created_at', { ascending: false })
          .limit(30);

        if (!error && data) {
          data.forEach(booking => {
            if (!booking.addresses) {
              booking.addresses = {
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
              if (!booking.addresses.society || booking.addresses.society.toLowerCase() === 'ahmedabad') {
                if (booking.addresses.address_line_1 && booking.addresses.address_line_1 !== 'Geo-location Pending') {
                  const parts = booking.addresses.address_line_1.split(',').map(p => p.trim());
                  const lastPart = parts[parts.length - 1] || '';
                  if (lastPart.toLowerCase() === 'ahmedabad') {
                    booking.addresses.society = parts[parts.length - 2] || parts[0] || 'Thaltej';
                  } else {
                    booking.addresses.society = lastPart || 'Thaltej';
                  }
                } else {
                  booking.addresses.address_line_1 = 'Thaltej, Ahmedabad';
                  booking.addresses.society = 'Thaltej';
                }
              }
              if (!booking.addresses.lat || !booking.addresses.lng) {
                booking.addresses.lat = 23.0753;
                booking.addresses.lng = 72.5244;
              }
            }

            booking.subtotal = booking.total_amount;
            booking.order_items = [{
              quantity: 1,
              products: {
                name: booking.services?.title || 'Service Booking'
              }
            }];
          });
        } else if (!error) {
          setOrders([]);
        }
      } else if (businessType === 'sports') {
        const BASE_URL = window.location.protocol === 'https:'
          ? ''
          : `http://${window.location.hostname}:3004`;

        const venuesRes = await fetch(`${BASE_URL}/api/sports/vendor-venues?owner_id=${storeId}`);
        if (venuesRes.ok) {
          const venuesData = await venuesRes.json();
          const venues = venuesData.venues || [];

          if (venues.length > 0) {
            let allBookings = [];
            for (const venue of venues) {
              const bookingsRes = await fetch(`${BASE_URL}/api/sports/vendor-bookings?venue_id=${venue.id}`);
              if (bookingsRes.ok) {
                const bookingsData = await bookingsRes.json();
                if (bookingsData.success && bookingsData.bookings) {
                  allBookings.push(...bookingsData.bookings.map(b => ({ ...b, sports_venues: venue })));
                }
              }
            }

            allBookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            const mappedBookings = allBookings.map(b => ({
              id: b.id,
              created_at: b.created_at,
              status: b.status,
              total_amount: b.total_amount,
              subtotal: b.base_amount || b.total_amount,
              qr_code_hash: b.qr_code,
              ticket_count: 1,
              event_title: b.sports_venues?.name || 'Court Booking',
              users: {
                full_name: b.user_name || 'Player',
                phone: b.user_phone || 'N/A'
              },
              addresses: {
                address_line_1: b.sports_venues?.address || 'Court',
                society: b.sports_venues?.city || 'Ahmedabad'
              },
              order_items: [{
                quantity: 1,
                products: {
                  name: `${b.sport_type?.toUpperCase().replace('_', ' ')} Slot on ${b.slot_date ? new Date(b.slot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''} (${b.slot_time} - ${b.slot_end_time})`
                }
              }]
            }));
            setOrders(mappedBookings);
          } else {
            setOrders([]);
          }
        } else {
          setOrders([]);
        }
      } else {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            users(full_name, phone),
            addresses(*),
            stores(name, address, lat, lng),
            order_items(quantity, price_at_purchase, products(name, description))
          `)
          .eq('store_id', storeId)
          .order('created_at', { ascending: false })
          .limit(30);

        if (!error && data) {
          // Filter out service orders for shop vendors, and shop orders for service vendors
          const isServiceVendor = businessType === 'service';
          const filteredData = data.filter(order => {
            const hasServiceItem = order.order_items?.some(oi => 
              oi.products?.description === 'Service item auto-registered' || (!oi.products?.name && oi.product_id)
            );
            return isServiceVendor ? hasServiceItem : !hasServiceItem;
          });

          // Collect all service product_ids where products is null
          const potentialServiceIds = [];
          filteredData.forEach(order => {
            order.order_items?.forEach(oi => {
              if (!oi.products?.name && oi.product_id) {
                potentialServiceIds.push(oi.product_id);
              }
            });
          });

          if (potentialServiceIds.length > 0) {
            try {
              const { data: servicesData } = await supabase
                .from('services')
                .select('id, title')
                .in('id', potentialServiceIds);
              
              if (servicesData) {
                const serviceMap = {};
                servicesData.forEach(s => {
                  serviceMap[s.id] = s.title;
                });

                // Map it back to the data structure
                filteredData.forEach(order => {
                  order.order_items?.forEach(oi => {
                    if (!oi.products?.name && serviceMap[oi.product_id]) {
                      oi.products = {
                        ...oi.products,
                        name: serviceMap[oi.product_id]
                      };
                    }
                  });
                });
              }
            } catch (servErr) {
              console.warn("Could not load service titles for vendor:", servErr);
            }
          }

          // Normalize/parse addresses to resolve "Geo-location Pending" issues
          filteredData.forEach(order => {
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
              // Parse society dynamically from address_line_1 if not present
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
              if (!order.addresses.lat || !order.addresses.lng) {
                order.addresses.lat = 23.0753;
                order.addresses.lng = 72.5244;
              }
            }
          });

          setOrders(filteredData);
        } else if (!error) {
          setOrders([]);
        }
      }
    } catch (err) {
      console.error("Order fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [storeId, businessType, vendorData?.user_id]);

  React.useEffect(() => {
    fetchOrders(true);
    const targetTable = businessType === 'service' ? 'service_bookings' : businessType === 'sports' ? 'venue_bookings' : 'orders';
    const channel = supabase
      .channel('vendor-orders-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: targetTable }, () => {
        fetchOrders(false);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders, businessType]);

  // Offline / Online detection
  React.useEffect(() => {
    const handleOnline = () => {
      toast.success("Internet restored. Syncing orders...", { icon: '🟢' });
      fetchOrders(false);
    };
    const handleOffline = () => {
      toast.error("You are offline! Live orders paused.", { duration: 6000, icon: '🔴' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchOrders]);

  // Audio Notification Loop for New Orders
  React.useEffect(() => {
    const hasNewOrders = orders.some(o => o.status === 'PLACED' || o.status === 'PENDING');
    if (!hasNewOrders) return;

    const playNotificationSound = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // A6
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch (e) {
        // Browser might block audio until user interacts with the page
      }
    };

    playNotificationSound();
    const intervalId = setInterval(playNotificationSound, 4000);
    return () => clearInterval(intervalId);
  }, [orders]);

  const updateStatus = async (orderId, newStatus) => {
    const isService = businessType === 'service';
    // Use an instant toast rather than a loading spinner for optimistic updates
    toast.success(isService ? "Status updated!" : "Status updated!");
    const isValidUuid = (id) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    
    // --- OPTIMISTIC UI RENDER ---
    const originalOrder = orders.find(o => o.id === orderId);
    const originalStatus = originalOrder ? originalOrder.status : null;
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

    try {

      if (businessType === 'event') {
        const { error } = await supabase
          .from('event_bookings')
          .update({ status: newStatus })
          .eq('id', orderId);
        if (error) throw error;
      } else if (businessType === 'sports') {
        const { error } = await supabase
          .from('venue_bookings')
          .update({ status: newStatus.toLowerCase() })
          .eq('id', orderId);
        if (error) throw error;
      } else if (isService) {
        const { error: bookingErr } = await supabase
          .from('service_bookings')
          .update({ status: newStatus })
          .eq('id', orderId);
        if (bookingErr) throw bookingErr;

        if (originalOrder && isValidUuid(storeId)) {
          const serviceId = originalOrder.service_id;
          if (serviceId && isValidUuid(serviceId)) {
            // Find corresponding order(s) in orders table
            let { data: matchedItems } = await supabase
              .from('order_items')
              .select('order_id, orders!inner(user_id, store_id, status)')
              .eq('product_id', serviceId)
              .eq('orders.user_id', originalOrder.user_id)
              .eq('orders.store_id', storeId);

            // Fallback: If no exact store_id match is found (e.g. store_id fell back to shop during checkout), match by service and user
            if (!matchedItems || matchedItems.length === 0) {
              const { data: fallbackItems } = await supabase
                .from('order_items')
                .select('order_id, orders!inner(user_id, store_id, status)')
                .eq('product_id', serviceId)
                .eq('orders.user_id', originalOrder.user_id);
              matchedItems = fallbackItems;
            }

            if (matchedItems && matchedItems.length > 0) {
              const activeOrderIds = matchedItems
                .filter(item => item.orders && item.orders.status !== 'DELIVERED' && item.orders.status !== 'CANCELLED')
                .map(item => item.order_id);

              if (activeOrderIds.length > 0) {
                const { error: orderErr } = await supabase
                  .from('orders')
                  .update({ status: newStatus })
                  .in('id', activeOrderIds);
                if (orderErr) {
                  console.warn("Could not sync status to orders:", orderErr.message);
                }
              }
            }
          }
        }
      } else {
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
        if (error) throw error;

        // NOTE: Stock restoration is handled atomically by the database trigger
        // 'trigger_restore_stock' which fires AFTER UPDATE OF status ON orders.
        // DO NOT manually restore stock here — that would cause a double-restoration.
        // If the trigger is not deployed, run: database/create_stock_triggers.sql
      }

      // Background fetch to ensure consistency after optimistic update
      fetchOrders(false);
    } catch (err) {
      // --- OPTIMISTIC ROLLBACK ---
      if (originalStatus) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: originalStatus } : o));
      }
      toast.error("Failed to update status: " + err.message);
    }
  };

  const getStatusStyle = (status) => {
    const isService = businessType === 'service';
    const isEvent = businessType === 'event';
    const isSports = businessType === 'sports';
    const cleanStatus = String(status || '').toUpperCase();
    switch (cleanStatus) {
      case 'PENDING':
      case 'PLACED': return { bg: '#fff7ed', text: '#f97316', dot: '#f97316', label: isEvent ? 'Ticket Booked' : isSports ? 'Pending Slot' : isService ? 'New Booking' : 'New Order', icon: <Bell size={14} /> };
      case 'ACCEPTED': 
      case 'CONFIRMED': return { bg: '#e0f2fe', text: '#0ea5e9', dot: '#0ea5e9', label: isEvent ? 'Ticket Booked' : isSports ? 'Court Booked' : isService ? 'Expert Assigned' : 'Rider Accepted', icon: <CheckCircle size={14} /> };
      case 'PREPARING': return { bg: '#eff6ff', text: '#3b82f6', dot: '#3b82f6', label: isEvent ? 'Processing' : isService ? 'Expert Preparing' : 'In Progress', icon: <Clock size={14} /> };
      case 'SHIPPED': return { bg: '#faf5ff', text: '#a855f7', dot: '#a855f7', label: isEvent ? 'Dispatched' : isService ? 'Expert En Route' : 'Out for Delivery', icon: <MapPin size={14} /> };
      case 'COMPLETED':
      case 'DELIVERED': return { bg: '#f0fdf4', text: '#22c55e', dot: '#22c55e', label: isEvent ? 'Attended / Checked In' : isSports ? 'Completed' : isService ? 'Service Completed' : 'Completed', icon: <CheckCircle size={14} /> };
      default: return { bg: '#f1f5f9', text: '#64748b', dot: '#64748b', label: status, icon: <FileText size={14} /> };
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10rem 2rem' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
        <Clock size={48} color="var(--v-primary)" opacity={0.5} />
      </motion.div>
      <p style={{ marginTop: '2rem', fontWeight: 900, color: '#1e293b', fontSize: '1.25rem', letterSpacing: '-0.5px' }}>Syncing Order Station...</p>
      <p style={{ marginTop: '0.5rem', color: '#64748b', fontWeight: 600 }}>Connecting to secure fulfillment cloud</p>
    </div>
  );

  return (
    <div className="v-container animate-fade-in">
      <div className="v-hero-section">
        <div className="v-hero-info">
          <div className="v-hero-badge">
            <div className="v-hero-badge-icon" style={{ background: '#fef2f2' }}>
              <FileText size={24} color="#ef4444" />
            </div>
            <span className="v-hero-badge-text" style={{ color: '#ef4444' }}>{businessType === 'event' ? 'Ticket Booking Console' : businessType === 'sports' ? 'Venue Booking Console' : 'Fulfillment Dashboard'}</span>
          </div>
          <h1 className="v-hero-title">{businessType === 'service' ? 'Live Bookings' : businessType === 'event' ? 'Ticket Bookings' : businessType === 'sports' ? 'Court Bookings' : 'Live Orders'}</h1>
          <p className="v-hero-subtitle">{businessType === 'service' ? 'Real-time tracking and operational control for your services' : businessType === 'event' ? 'Real-time tracking and control of ticket bookings and passes' : businessType === 'sports' ? 'Real-time tracking and control of sports slot bookings' : 'Real-time tracking and operational control for your store'}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {(businessType === 'event' || businessType === 'sports') && (
            <button
              onClick={() => setQrScannerOpen({ open: true, booking: null })}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                color: 'white', border: 'none', borderRadius: '16px',
                fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem',
                boxShadow: '0 4px 20px rgba(15,23,42,0.3)',
                whiteSpace: 'nowrap', flexShrink: 0
              }}
            >
              <ScanLine size={18} /> Scan QR to Check In
            </button>
          )}
          <button
            onClick={downloadVendorSalesReport}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 24px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white', border: 'none', borderRadius: '16px',
              fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem',
              boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
              whiteSpace: 'nowrap', flexShrink: 0
            }}
          >
            <Download size={18} /> Download Sales Report (Excel)
          </button>
        </div>
      </div>

      <div className="v-tab-group" style={{ marginBottom: '3rem' }}>
        {['active', 'history'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`v-tab-btn ${activeTab === tab ? 'active' : ''}`}
            style={{ padding: '12px 32px' }}
          >
            {tab === 'active' ? (businessType === 'service' ? 'Ongoing Bookings' : businessType === 'event' ? 'Booked Tickets' : 'Ongoing Missions') : 'Past Records'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {(() => {
          const filteredList = orders.filter(o => {
            const statusUpper = (o.status || '').toUpperCase();
            return activeTab === 'active'
              ? (statusUpper !== 'DELIVERED' && statusUpper !== 'CANCELLED' && statusUpper !== 'COMPLETED')
              : (statusUpper === 'DELIVERED' || statusUpper === 'CANCELLED' || statusUpper === 'COMPLETED');
          });
          
          if (filteredList.length === 0) {
            return (
              <div style={{ padding: '8rem 2rem', textAlign: 'center', background: 'white', borderRadius: '40px', border: '2px dashed #e2e8f0' }}>
                <div style={{ width: '100px', height: '100px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto' }}>
                  {businessType === 'event' ? (
                    <Calendar size={48} color="#cbd5e1" />
                  ) : businessType === 'service' ? (
                    <Wrench size={48} color="#cbd5e1" />
                  ) : (
                    <Package size={48} color="#cbd5e1" />
                  )}
                </div>
                <h3 style={{ fontWeight: 950, color: '#1e293b', fontSize: '1.5rem', letterSpacing: '-0.5px' }}>{businessType === 'event' ? 'No Ticket Sales' : businessType === 'service' ? 'No Bookings' : 'Station Idle'}</h3>
                <p style={{ color: '#64748b', margin: '0.75rem 0 2rem 0', fontWeight: 600 }}>{businessType === 'event' ? 'No tickets have been booked for your events yet. New sales will appear here instantly.' : businessType === 'service' ? 'Your service station is ready to receive bookings. New bookings will trigger a priority alert.' : 'Your store is ready to receive missions. New orders will trigger a priority alert.'}</p>
                <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#f0fdf4', color: '#16a34a', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 900, marginBottom: '1rem' }}>
                    <div className="v-pulse-dot" style={{ background: '#16a34a' }}></div>
                    {businessType === 'event' ? 'TICKET SERVER ACTIVE' : 'OPERATIONAL'}
                  </div>
                </div>
              </div>
            );
          }

          return filteredList.map((order, i) => {
            const style = getStatusStyle(order.status);
            const isService = businessType === 'service' || businessType === 'sports';
            return (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                key={order.id}
                className="v-data-card"
                style={{ padding: '2rem', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: style.dot }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 950, color: '#0f172a', fontSize: '1.25rem', letterSpacing: '-0.5px' }}>#{isService ? 'BKG' : 'ORD'}-{order.id.substring(0, 8).toUpperCase()}</span>
                      {['PENDING', 'PLACED', 'ACCEPTED'].includes(order.status) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fef2f2', color: '#ef4444', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 900 }}>
                          <div className="v-pulse-dot" style={{ background: '#ef4444' }}></div>
                          ACTION REQUIRED
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem', fontWeight: 700 }}>
                      <Clock size={16} /> Received at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', borderRadius: '14px',
                    background: style.bg, color: style.text, fontSize: '0.85rem', fontWeight: 900, border: `1px solid ${style.dot}15`
                  }}>
                    {style.icon}
                    {style.label}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '2rem', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{businessType === 'event' ? 'Ticket Holder' : isService ? 'Customer Profile' : 'Customer Entity'}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#475569', border: '1px solid #e2e8f0' }}>
                        {(order.users?.full_name || 'U').charAt(0)}
                      </div>
                      <div>
                        <span style={{ fontWeight: 850, color: '#1e293b', display: 'block', fontSize: '1rem' }}>{order.users?.full_name || 'Verified User'}</span>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{order.users?.phone || 'Premium Member'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{businessType === 'event' ? 'Delivery Mode' : isService ? 'Service Address' : 'Destination Node'}</p>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#1e293b' }}>
                      <MapPin size={18} color="var(--v-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.4 }}>{order.addresses?.society || 'Geo-location Pending'}</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '1.5rem', marginBottom: '2rem', border: '1px solid #f1f5f9' }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase' }}>{businessType === 'event' ? 'Ticket Manifest' : isService ? 'Booked Services' : 'Inventory Manifest'}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {order.order_items?.map((item, idx) => (
                      <div key={idx} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <span style={{ color: 'var(--v-primary)' }}>{item.quantity}x</span>
                        {item.products?.name}
                      </div>
                    )) || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Parsing manifest data...</span>}
                  </div>
                </div>

                {activeTab === 'active' && ['SHIPPED', 'DISPATCHED'].includes(order.status) && (
                  <div style={{ marginBottom: '2rem' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase' }}>{isService ? 'Expert Location & Live Tracking' : 'Rider Delivery Path & Live Tracking'}</p>
                    <VendorOrderMapWrapper order={order} businessType={businessType} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                  {businessType === 'event' ? (
                    order.status === 'CONFIRMED' || order.status === 'PENDING' || order.status === 'PLACED' ? (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => updateStatus(order.id, 'COMPLETED')}
                        className="v-btn-primary"
                        style={{ flex: 1, padding: '16px', background: '#16a34a', boxShadow: '0 10px 25px rgba(22, 163, 74, 0.2)' }}
                      >
                        ✅ Check In Attendee / Redeem Pass
                      </motion.button>
                    ) : (
                      <div
                        style={{ flex: 1, padding: '16px', background: '#f0fdf4', color: '#16a34a', borderRadius: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bbf7d0', gap: '8px' }}
                      >
                        ✅ {order.status === 'COMPLETED' ? 'Checked In & Verified' : 'Cancelled / Expired'}
                      </div>
                    )
                  ) : (
                    <>
                      {businessType === 'sports' && (order.status?.toUpperCase() === 'CONFIRMED' || order.status?.toUpperCase() === 'BOOKED') && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => updateStatus(order.id, 'COMPLETED')}
                          className="v-btn-primary"
                          style={{ flex: 1, padding: '16px', background: '#16a34a', boxShadow: '0 10px 25px rgba(22, 163, 74, 0.2)' }}
                        >
                          ✅ Check In Player / Complete Slot
                        </motion.button>
                      )}
                      {businessType === 'sports' && (order.status?.toUpperCase() === 'COMPLETED') && (
                        <div
                          style={{ flex: 1, padding: '16px', background: '#f0fdf4', color: '#16a34a', borderRadius: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bbf7d0', gap: '8px' }}
                        >
                          ✅ Completed & Checked In
                        </div>
                      )}
                      {businessType !== 'sports' && ['PENDING', 'PLACED'].includes(order.status) && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => updateStatus(order.id, 'PREPARING')}
                          className="v-btn-primary"
                          style={{ flex: 1, padding: '16px' }}
                        >
                          {isService ? 'Confirm Booking' : 'Confirm Order'}
                        </motion.button>
                      )}
                      {businessType !== 'sports' && order.status === 'ACCEPTED' && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => updateStatus(order.id, 'PREPARING')}
                          className="v-btn-primary"
                          style={{ flex: 1, padding: '16px' }}
                        >
                          {isService ? 'Initiate Service' : 'Initiate Fulfillment'}
                        </motion.button>
                      )}
                      {businessType !== 'sports' && order.status === 'PREPARING' && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => updateStatus(order.id, 'SHIPPED')}
                          className="v-btn-primary"
                          style={{ flex: 1, padding: '16px', background: '#16a34a', boxShadow: '0 10px 25px rgba(22, 163, 74, 0.2)' }}
                        >
                          {isService ? 'Dispatch Expert' : 'Confirm Ready for Pickup'}
                        </motion.button>
                      )}
                      {businessType !== 'sports' && ['SHIPPED', 'DISPATCHED'].includes(order.status) && (
                        isService ? (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => updateStatus(order.id, 'DELIVERED')}
                            className="v-btn-primary"
                            style={{ flex: 1, padding: '16px', background: '#2563eb', boxShadow: '0 10px 25px rgba(37, 99, 235, 0.2)' }}
                          >
                            Confirm Service Completed
                          </motion.button>
                        ) : (
                          <div
                            style={{ flex: 1, padding: '16px', background: '#f1f5f9', color: '#64748b', borderRadius: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}
                          >
                            Out for Delivery by Rider
                          </div>
                        )
                      )}
                    </>
                  )}
                  {businessType !== 'event' && (
                    ['PENDING', 'PLACED', 'ACCEPTED', 'PREPARING', 'SHIPPED', 'DISPATCHED', 'CONFIRMED'].includes(String(order.status || '').toUpperCase()) ? (
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: isService ? 'Cancel Booking' : 'Emergency Override',
                            message: isService 
                              ? 'Are you sure you want to CANCEL this booking? This cannot be undone and the customer will be notified.'
                              : 'Are you sure you want to CANCEL this order? This cannot be undone and the customer will be notified.',
                            confirmText: isService ? 'Cancel Booking' : 'Cancel Order',
                            cancelText: 'Keep Active',
                            type: 'danger',
                            onConfirm: () => updateStatus(order.id, 'CANCELLED')
                          });
                        }}
                        className="v-btn-outline"
                        style={{ padding: '14px 32px', fontWeight: 800, color: '#ef4444', borderColor: '#fecaca', background: '#fef2f2' }}
                      >
                        {isService ? 'Cancel Booking' : 'Cancel Order'}
                      </button>
                    ) : (
                      <button className="v-btn-outline" style={{ padding: '14px 32px', fontWeight: 800 }}>
                        {isService ? 'Booking Protocol' : 'Order Protocol'}
                      </button>
                    )
                  )}
                </div>
              </motion.div>
            );
          });
        })()}
      </div>
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
        onConfirm={() => {
          if (confirmDialog.onConfirm) confirmDialog.onConfirm();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
      <QRScannerModal
        isOpen={qrScannerOpen.open}
        businessType={businessType}
        onClose={() => setQrScannerOpen({ open: false, booking: null })}
        onScan={async (scannedHash) => {
          if (businessType === 'sports') {
            try {
              setQrScannerOpen({ open: false, booking: null });
              setCheckinLoading(true);
              setCheckinResult(null);
              const BASE_URL = window.location.protocol === 'https:'
                ? ''
                : (window._API_URL || `http://${window.location.hostname}:3004`);

              const { data: { session } } = await supabase.auth.getSession();
              const token = session?.access_token || '';

              const res = await fetch(`${BASE_URL}/api/sports/checkin`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ qr_code: scannedHash.trim() })
              });
              const data = await res.json();

              if (res.ok && data.success) {
                const normalizedBooking = {
                  attendee: data.booking.user_name,
                  phone: data.booking.user_phone || 'N/A',
                  event: data.booking.sports_venues?.name || 'Sports Venue',
                  tier: data.booking.sport_type,
                  ticket_count: '1 Slot',
                  invoice: data.booking.invoice_number
                };
                setCheckinResult({ success: true, booking: normalizedBooking });
                fetchOrders();
              } else if (res.status === 400 && (data.error || '').includes('Already')) {
                const normalizedBooking = data.booking ? {
                  attendee: data.booking.user_name,
                  phone: data.booking.user_phone || 'N/A',
                  event: data.booking.sports_venues?.name || 'Sports Venue',
                  tier: data.booking.sport_type,
                  ticket_count: '1 Slot',
                  invoice: data.booking.invoice_number
                } : null;
                setCheckinResult({ success: false, alreadyUsed: true, error: data.error || 'Already checked in', booking: normalizedBooking });
              } else {
                setCheckinResult({ success: false, error: data.error || '❌ Invalid QR — Booking not found' });
              }
            } catch (err) {
              setCheckinResult({ success: false, error: '❌ Check-in failed due to network error' });
            } finally {
              setCheckinLoading(false);
            }
            return;
          }

          try {
            setQrScannerOpen({ open: false, booking: null });
            setCheckinLoading(true);
            setCheckinResult(null);
            const BASE_URL = window.location.protocol === 'https:'
              ? ''
              : (window._API_URL || `http://${window.location.hostname}:3004`);

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token || '';

            const res = await fetch(`${BASE_URL}/api/events/checkin`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify({ qr_code_hash: scannedHash.trim() })
            });
            const data = await res.json();

            if (res.ok && data.success) {
              const normalizedBooking = {
                attendee: data.booking.users?.full_name || 'Attendee',
                phone: data.booking.users?.phone || 'N/A',
                event: data.booking.events?.title || 'Event',
                tier: data.booking.event_ticket_tiers?.tier_name || 'General',
                ticket_count: data.booking.ticket_count || 1,
                invoice: data.booking.invoice_number
              };
              setCheckinResult({ success: true, booking: normalizedBooking });
              fetchOrders();
            } else if (res.status === 400 && (data.error || '').includes('already')) {
              const normalizedBooking = data.booking ? {
                attendee: data.booking.users?.full_name || 'Attendee',
                phone: data.booking.users?.phone || 'N/A',
                event: data.booking.events?.title || 'Event',
                tier: data.booking.event_ticket_tiers?.tier_name || 'General',
                ticket_count: data.booking.ticket_count || 1,
                invoice: data.booking.invoice_number
              } : null;
              setCheckinResult({ success: false, alreadyUsed: true, error: data.error || 'Already checked in', booking: normalizedBooking });
            } else {
              setCheckinResult({ success: false, error: data.error || '❌ Invalid QR — Ticket not found' });
            }
          } catch (err) {
            setCheckinResult({ success: false, error: '❌ Check-in failed due to network error' });
          } finally {
            setCheckinLoading(false);
          }
        }}
      />

      {/* Check-in Loading Overlay */}
      {checkinLoading && ReactDOM.createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999998, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '2rem 3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #16a34a', borderRadius: '50%', animation: 'checkin-spin 1s linear infinite' }} />
            <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>Verifying ticket...</p>
            <style>{`@keyframes checkin-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>,
        document.body
      )}

      {/* Check-in Result Modal */}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {checkinResult && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 999997, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(6px)' }}
              onClick={() => setCheckinResult(null)}
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                style={{ background: 'white', borderRadius: '28px', padding: '2rem', width: '100%', maxWidth: '400px', boxShadow: '0 30px 60px rgba(0,0,0,0.25)' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Result Icon */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 1rem',
                    background: checkinResult.success ? '#dcfce7' : checkinResult.alreadyUsed ? '#fef3c7' : '#fee2e2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: checkinResult.success ? '0 0 30px rgba(34,197,94,0.25)' : 'none'
                  }}>
                    <span style={{ fontSize: '2.2rem' }}>
                      {checkinResult.success ? '✅' : checkinResult.alreadyUsed ? '⚠️' : '❌'}
                    </span>
                  </div>
                  <h2 style={{ margin: '0 0 4px', fontWeight: 900, fontSize: '1.3rem', color: '#0f172a' }}>
                    {checkinResult.success ? 'Checked In!' : checkinResult.alreadyUsed ? 'Already Used' : 'Check-in Error'}
                  </h2>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                    {checkinResult.success ? 'Entry approved. Attendee may enter.' : checkinResult.error}
                  </p>
                </div>

                {/* Attendee Details Card */}
                {checkinResult.booking && (
                  <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendee</span>
                      <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '1rem' }}>{checkinResult.booking.attendee}</span>
                    </div>
                    {checkinResult.booking.phone && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Phone</span>
                        <span style={{ fontWeight: 700, color: '#475569' }}>{checkinResult.booking.phone}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Details</span>
                      <span style={{ fontWeight: 700, color: '#475569', textAlign: 'right', maxWidth: '60%' }}>{checkinResult.booking.event}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Category</span>
                      <span style={{ fontWeight: 700, color: '#475569' }}>{checkinResult.booking.tier}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Tickets</span>
                      <span style={{ fontWeight: 900, color: '#ff7622', fontSize: '1rem' }}>{checkinResult.booking.ticket_count}</span>
                    </div>
                    {checkinResult.booking.invoice && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Invoice</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#64748b', fontSize: '0.8rem' }}>{checkinResult.booking.invoice}</span>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => { setCheckinResult(null); setQrScannerOpen({ open: true, booking: null }); }}
                    style={{ flex: 1, padding: '13px', background: '#f1f5f9', border: 'none', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', color: '#475569', fontSize: '0.9rem' }}
                  >
                    Scan Next
                  </button>
                  <button
                    onClick={() => setCheckinResult(null)}
                    style={{ flex: 1, padding: '13px', background: checkinResult.success ? 'linear-gradient(135deg,#16a34a,#15803d)' : '#0f172a', border: 'none', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', color: 'white', fontSize: '0.9rem' }}
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export const VendorEarnings = ({ storeId, vendorData, businessType }) => {
  const [earnings, setEarnings] = React.useState(0);
  const [orderCount, setOrderCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchEarnings = async () => {
      if (!storeId && !vendorData?.user_id) {
        setEarnings(0); setOrderCount(0); setLoading(false); return;
      }
      try {
        if (businessType === 'event') {
          // Events revenue comes from event_bookings, linked via events.created_by = user_id
          const userId = vendorData?.user_id || storeId;
          const { data: events } = await supabase.from('events').select('id').eq('created_by', userId);
          if (events && events.length > 0) {
            const eventIds = events.map(e => e.id);
            const { data, error } = await supabase
              .from('event_bookings')
              .select('total_amount, status')
              .in('event_id', eventIds)
              .in('status', ['CONFIRMED', 'COMPLETED']);
            if (!error && data) {
              const total = data.reduce((sum, b) => sum + (b.total_amount || 0), 0);
              setEarnings(total);
              setOrderCount(data.length);
            }
          } else {
            setEarnings(0); setOrderCount(0);
          }
        } else {
          const { data, error } = await supabase.from('orders').select('total_amount, status').eq('store_id', storeId);
          if (!error && data) {
            const delivered = data.filter(o => o.status === 'DELIVERED');
            const total = delivered.reduce((sum, o) => sum + (o.total_amount || 0), 0);
            setEarnings(total);
            setOrderCount(delivered.length);
          }
        }
      } catch (err) {
        console.error("Earnings fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEarnings();
  }, [storeId, vendorData, businessType]);

  return (
    <div className="v-container animate-fade-in">
      <div className="v-hero-section">
        <div className="v-hero-info">
          <div className="v-hero-badge">
            <div className="v-hero-badge-icon" style={{ background: '#dcfce7' }}>
              <IndianRupee size={24} color="#166534" />
            </div>
            <span className="v-hero-badge-text" style={{ color: '#166534' }}>Revenue Intelligence</span>
          </div>
          <h1 className="v-hero-title">Business Earnings</h1>
          <p className="v-hero-subtitle">Comprehensive performance metrics and revenue streams</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        <motion.div
          whileHover={{ y: -8 }}
          className="v-data-card"
          style={{ padding: '2.5rem', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '56px', height: '56px', background: '#f0fdf4', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={28} color="#22c55e" />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#166534', background: '#dcfce7', padding: '6px 14px', borderRadius: '10px', letterSpacing: '0.5px' }}>SETTLED</span>
          </div>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Net Revenue</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>₹</span>
            <h2 style={{ margin: 0, fontSize: '3rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-1.5px' }}>{earnings.toLocaleString()}</h2>
          </div>
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>PROJECTED</span>
              <span style={{ fontWeight: 900, color: '#1e293b' }}>₹{(earnings * 1.2).toFixed(0)}</span>
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>GROWTH</span>
              <span style={{ fontWeight: 900, color: earnings > 0 ? '#22c55e' : '#94a3b8' }}>{earnings > 0 ? '+12.5%' : '0%'}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -8 }}
          className="v-data-card"
          style={{ padding: '2.5rem' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '56px', height: '56px', background: '#eff6ff', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={28} color="#3b82f6" />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e40af', background: '#dbeafe', padding: '6px 14px', borderRadius: '10px', letterSpacing: '0.5px' }}>VOLUME</span>
          </div>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{businessType === 'event' ? 'Total Ticket Sales' : 'Total Conversions'}</p>
          <h2 style={{ margin: 0, fontSize: '3rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-1.5px' }}>{orderCount}</h2>
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>{businessType === 'event' ? 'AVG TICKET' : 'AVG ORDER'}</span>
              <span style={{ fontWeight: 900, color: '#1e293b' }}>₹{orderCount > 0 ? (earnings / orderCount).toFixed(0) : 0}</span>
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>SUCCESS</span>
              <span style={{ fontWeight: 900, color: orderCount > 0 ? '#3b82f6' : '#94a3b8' }}>{orderCount > 0 ? '98.2%' : '0%'}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="v-data-card" style={{ padding: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', minHeight: '400px', flexDirection: 'column' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '600px', height: '240px', background: '#f8fafc', borderRadius: '32px', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 20%, rgba(249, 115, 22, 0.05) 0%, transparent 50%)' }}></div>
          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ width: '64px', height: '64px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
              <IndianRupee size={32} color="var(--v-primary)" opacity={0.4} />
            </div>
            <h3 style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.25rem' }}>{loading ? "Analytics Engine Initializing..." : "Operational Data Synchronized"}</h3>
            <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontWeight: 600, fontSize: '0.95rem' }}>Your revenue trends and payout windows are up to date.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const VendorWallet = ({ storeId }) => {
  const [balance, setBalance] = React.useState(0);
  const [transactions, setTransactions] = React.useState([]);

  React.useEffect(() => {
    const fetchTransactions = async () => {
      if (!storeId) {
        setBalance(0); setTransactions([]); return;
      }
      try {
        const { data, error } = await supabase.from('orders').select('id, total_amount, created_at, status').eq('store_id', storeId).order('created_at', { ascending: false });
        if (!error && data) {
          const delivered = data.filter(o => o.status === 'DELIVERED');
          const total = delivered.reduce((sum, o) => sum + (o.total_amount || 0), 0);
          setBalance(total);

          const txs = data.map(o => ({
            id: o.id,
            type: o.status === 'CANCELLED' ? 'debit' : 'credit',
            amount: o.total_amount || 0,
            status: o.status,
            date: new Date(o.created_at).toLocaleDateString() + ' ' + new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            label: `Order Settlement #${o.id.substring(0, 8).toUpperCase()}`
          }));
          setTransactions(txs);
        }
      } catch (err) {
        console.error("Wallet fetch error:", err);
      }
    };
    fetchTransactions();
  }, [storeId]);

  return (
    <div className="v-container animate-fade-in">
      <div className="v-hero-section">
        <div className="v-hero-info">
          <div className="v-hero-badge">
            <div className="v-hero-badge-icon" style={{ background: '#fff7ed' }}>
              <Wallet size={24} color="#f97316" />
            </div>
            <span className="v-hero-badge-text" style={{ color: '#f97316' }}>Financial Vault</span>
          </div>
          <h1 className="v-hero-title">Wallet & Payouts</h1>
          <p className="v-hero-subtitle">Manage your funds, linked accounts, and secure withdrawals</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '3rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: '40px', padding: '3rem', color: 'white',
            position: 'relative', overflow: 'hidden', boxShadow: '0 30px 60px -12px rgba(15, 23, 42, 0.3)'
          }}>
            <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: '250px', height: '250px', background: 'rgba(249, 115, 22, 0.15)', borderRadius: '50%', filter: 'blur(60px)' }}></div>
            <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '150px', height: '150px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', filter: 'blur(40px)' }}></div>

            <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '2px' }}>Withdrawable Balance</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '3rem' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'rgba(255,255,255,0.7)' }}>₹</span>
              <h2 style={{ margin: 0, fontSize: '3.5rem', fontWeight: 950, letterSpacing: '-2px' }}>{balance.toLocaleString()}</h2>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ flex: 1.5, padding: '16px', borderRadius: '18px', border: 'none', background: 'var(--v-primary)', color: 'white', fontWeight: 900, cursor: 'pointer', boxShadow: '0 12px 30px -8px rgba(249, 115, 22, 0.5)', fontSize: '1rem' }}>Initiate Payout</motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ flex: 1, padding: '16px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 800, cursor: 'pointer', backdropFilter: 'blur(12px)', fontSize: '0.9rem' }}>Details</motion.button>
            </div>
          </div>

          <div className="v-data-card" style={{ padding: '2rem', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
              <div style={{ width: '36px', height: '36px', background: '#f0fdf4', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={20} color="#16a34a" />
              </div>
              <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '1rem' }}>Primary Payout Node</span>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <p style={{ margin: 0, fontSize: '1rem', color: '#1e293b', fontWeight: 850 }}>HDFC BANK LTD</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Account Ending In: •••• 4289</p>
            </div>
            <button style={{ width: '100%', marginTop: '1.25rem', padding: '12px', borderRadius: '12px', background: 'none', border: '1px solid #e2e8f0', color: 'var(--v-primary)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Manage Bank Accounts</button>
          </div>
        </div>

        <div className="v-data-card" style={{ padding: '2.5rem', border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <h3 style={{ margin: 0, fontWeight: 950, fontSize: '1.4rem', letterSpacing: '-0.5px' }}>Transaction Ledger</h3>
            <button style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--v-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Export PDF</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {transactions.length === 0 ? (
              <div style={{ padding: '5rem 2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '24px', border: '1px dashed #e2e8f0' }}>
                <div style={{ width: '64px', height: '64px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                  <ArrowUpRight size={28} color="#cbd5e1" />
                </div>
                <p style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>No activity recorded</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Your fulfillment earnings will populate this ledger.</p>
              </div>
            ) : transactions.map((tx, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={i}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', borderRadius: '20px', background: '#f8fafc', border: '1px solid #f1f5f9', transition: 'all 0.2s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: tx.type === 'credit' ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                    {tx.type === 'credit' ? <ArrowDownRight size={22} color="#16a34a" /> : <ArrowUpRight size={22} color="#ef4444" />}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 900, color: '#1e293b', fontSize: '0.95rem' }}>{tx.label}</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>{tx.date}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontWeight: 950, color: tx.type === 'credit' ? '#16a34a' : '#ef4444', fontSize: '1.15rem', letterSpacing: '-0.5px' }}>
                    {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                  </p>
                  <span style={{ fontSize: '0.7rem', fontWeight: 900, color: tx.status === 'DELIVERED' ? '#16a34a' : '#64748b', background: tx.status === 'DELIVERED' ? '#dcfce7' : '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>{tx.status}</span>
                </div>
              </motion.div>
            ))}
          </div>
          {transactions.length > 5 && (
            <button style={{ width: '100%', marginTop: '2rem', background: 'white', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '16px', fontWeight: 900, color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}>Load Extensive History</button>
          )}
        </div>
      </div>
    </div>
  );
};

export const VendorReviews = ({ storeId, businessType }) => {
  const [reviews, setReviews] = React.useState([]);

  React.useEffect(() => {
    const fetchReviews = async () => {
      if (!storeId) { setReviews([]); return; }
      try {
        const BASE_URL = window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`;
        const res = await fetch(`${BASE_URL}/api/ratings/vendor/${storeId}?businessType=${businessType}`);
        const data = await res.json();
        if (data.success && data.reviews) {
          setReviews(data.reviews);
        }
      } catch (err) {
        console.error("Reviews error:", err);
      }
    };
    fetchReviews();
  }, [storeId, businessType]);

  return (
    <div className="v-container animate-fade-in">
      <div className="v-hero-section">
        <div className="v-hero-info">
          <div className="v-hero-badge">
            <div className="v-hero-badge-icon" style={{ background: '#fffbeb' }}>
              <Star size={20} color="#f59e0b" fill="#f59e0b" />
            </div>
            <span className="v-hero-badge-text" style={{ color: '#f59e0b' }}>
              {businessType === 'shop' ? 'Store Reputation' : 'Service Reputation'}
            </span>
          </div>
          <h1 className="v-hero-title">Customer Feedback</h1>
          <p className="v-hero-subtitle">Monitor your ratings and build trust with your neighborhood</p>
        </div>

        <div style={{ textAlign: 'right', background: 'white', padding: '1.5rem 2.5rem', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)' }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Partner Score</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '3rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-1px' }}>4.9</span>
            <span style={{ fontSize: '1.25rem', color: '#94a3b8', fontWeight: 800 }}>/5</span>
          </div>
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' }}>
            {[1, 2, 3, 4, 5].map(s => <Star key={s} size={20} color="#f59e0b" fill={s <= 4 ? "#f59e0b" : s === 5 ? "rgba(245, 158, 11, 0.4)" : "transparent"} />)}
          </div>
        </div>
      </div>

      <div className="v-grid-auto">
        {reviews.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', background: 'white', padding: '6rem 2rem', borderRadius: '40px', textAlign: 'center', border: '2px dashed #e2e8f0' }}>
            <div style={{ width: '80px', height: '80px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto' }}>
              <Star size={40} color="#cbd5e1" />
            </div>
            <h3 style={{ fontWeight: 950, color: '#1e293b', fontSize: '1.5rem' }}>Awaiting Feedback</h3>
            <p style={{ color: '#64748b', fontWeight: 600, maxWidth: '400px', margin: '0.5rem auto' }}>Once you complete your first few orders, your verified customer reviews will appear here.</p>
          </div>
        ) : reviews.map((rev, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12 }}
            key={i}
            className="v-data-card"
            style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid #f1f5f9' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 950, color: '#475569', fontSize: '1.25rem', border: '2px solid white', boxShadow: '0 8px 20px -6px rgba(0,0,0,0.1)' }}>
                  {rev.avatar}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 900, color: '#0f172a', fontSize: '1.1rem' }}>{rev.user}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} color="#f59e0b" fill={s <= rev.rating ? "#f59e0b" : "transparent"} />)}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 800, background: '#f0fdf4', padding: '2px 8px', borderRadius: '6px' }}>VERIFIED ORDER</span>
                  </div>
                </div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '1.05rem', color: '#334155', lineHeight: 1.7, fontWeight: 600, fontStyle: 'italic' }}>
              "{rev.comment}"
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700 }}>{rev.date}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export const VendorNotifications = ({ storeId, businessType }) => {
  const [notifications, setNotifications] = React.useState([]);

  const fetchNotifs = React.useCallback(async () => {
    if (!storeId) { setNotifications([]); return; }
    try {
      const { data, error } = await supabase.from('orders').select('id, status, created_at, users(full_name)').eq('store_id', storeId).order('created_at', { ascending: false }).limit(8);
      if (!error && data) {
        const isService = businessType === 'service';
        const list = data.map(o => ({
          title: o.status === 'PLACED' 
            ? (isService ? 'Critical: New Booking Received!' : 'Critical: New Order Received!')
            : o.status === 'DELIVERED' 
              ? (isService ? 'Mission Success: Service Completed' : 'Mission Success: Order Completed') 
              : (isService ? `Update: Booking #${o.id.substring(0, 8).toUpperCase()} Status Shift` : `Update: Order #${o.id.substring(0, 8).toUpperCase()} Status Shift`),
          desc: isService
            ? `Booking #${o.id.substring(0, 8).toUpperCase()} from ${o.users?.full_name || 'Verified Customer'}. Action may be required.`
            : `Order #${o.id.substring(0, 8).toUpperCase()} from ${o.users?.full_name || 'Verified Customer'}. Action may be required.`,
          time: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
          unread: o.status === 'PLACED' || o.status === 'PREPARING',
          type: o.status === 'PLACED' ? 'urgent' : 'update'
        }));
        setNotifications(list);
      }
    } catch (err) {
      console.error("Notifs error:", err);
    }
  }, [storeId, businessType]);

  React.useEffect(() => {
    fetchNotifs();

    const playNotificationBeep = () => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const playBeep = (freq, duration, delay) => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
          gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + delay);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);
          osc.start(audioCtx.currentTime + delay);
          osc.stop(audioCtx.currentTime + delay + duration);
        };
        playBeep(880, 0.15, 0);
        playBeep(1100, 0.2, 0.2);
      } catch (err) {
        console.warn("AudioContext beep failed:", err);
      }
    };

    const channel = supabase
      .channel(`vendor-notifs-realtime-${storeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `store_id=eq.${storeId}`
      }, (payload) => {
        fetchNotifs();
        if (payload.eventType === 'INSERT') {
          const isService = businessType === 'service';
          toast.success(isService ? "New Booking Received!" : "New Order Received!", { icon: '🔔' });
          playNotificationBeep();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, businessType, fetchNotifs]);

  return (
    <div className="v-container animate-fade-in">
      <div className="v-hero-section">
        <div className="v-hero-info">
          <div className="v-hero-badge">
            <div className="v-hero-badge-icon" style={{ background: '#fffbeb' }}>
              <Bell size={24} color="#d97706" />
            </div>
            <span className="v-hero-badge-text" style={{ color: '#d97706' }}>Communication Hub</span>
          </div>
          <h1 className="v-hero-title">{businessType === 'service' ? 'Service Notifications' : 'Partner Notifications'}</h1>
          <p className="v-hero-subtitle">{businessType === 'service' ? 'Stay synchronized with service bookings and operational alerts' : 'Stay synchronized with store activities and operational alerts'}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {notifications.length === 0 ? (
          <div style={{ background: 'white', padding: '8rem 2rem', borderRadius: '40px', textAlign: 'center', border: '2px dashed #e2e8f0' }}>
            <Bell size={64} color="#cbd5e1" style={{ margin: '0 auto 2rem auto', opacity: 0.5 }} />
            <h3 style={{ fontWeight: 950, color: '#1e293b', fontSize: '1.5rem' }}>All Caught Up</h3>
            <p style={{ color: '#64748b', margin: '0.75rem 0', fontWeight: 600 }}>Your inbox is clean. New operational updates will appear here.</p>
          </div>
        ) : notifications.map((notif, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="v-data-card"
            style={{
              padding: '2rem 2.5rem', border: '1px solid #f1f5f9', display: 'flex', gap: '2rem',
              background: notif.unread ? 'linear-gradient(to right, #fffbeb, #ffffff)' : 'white',
              position: 'relative', alignItems: 'center'
            }}
          >
            {notif.unread && <div style={{ position: 'absolute', top: '2rem', right: '2.5rem', width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}></div>}

            <div style={{ width: '64px', height: '64px', borderRadius: '22px', background: notif.type === 'urgent' ? '#fef3c7' : '#f1f5f9', color: notif.type === 'urgent' ? '#d97706' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(0,0,0,0.05)' }}>
              <Bell size={28} />
            </div>

            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 6px 0', fontWeight: 900, color: '#0f172a', fontSize: '1.15rem', letterSpacing: '-0.3px' }}>{notif.title}</h4>
              <p style={{ margin: '0 0 10px 0', color: '#475569', fontSize: '1rem', lineHeight: 1.6, fontWeight: 600 }}>{notif.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={14} color="#94a3b8" />
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 800 }}>Received at {notif.time}</span>
              </div>
            </div>

            <button style={{ background: 'none', border: 'none', color: '#94a3b8', fontWeight: 800, cursor: 'pointer', padding: '10px' }}>
              <Trash2 size={18} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export const VendorSupport = () => {
  // const [showChat, setShowChat] = React.useState(false);
  // const [msg, setMsg] = React.useState('');
  // const [chatHistory, setChatHistory] = React.useState([
  //   { sender: 'expert', text: 'Namaste! I am your dedicated Passwala Success Agent. I can help with payouts, inventory, or operational growth. How can I assist you today?', time: 'Just now' }
  // ]);
  const [showArticles, setShowArticles] = React.useState(false);

  // const handleSend = (e) => {
  //   e.preventDefault();
  //   if (!msg.trim()) return;
  //   const userMsg = { sender: 'vendor', text: msg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
  //   const botReply = { sender: 'expert', text: 'Thank you for the update. I have flagged your account for priority review by our regional operations manager. Expect a resolution within 15-20 minutes.', time: 'Just now' };
  //   setChatHistory([...chatHistory, userMsg, botReply]);
  //   setMsg('');
  // };

  return (
    <div className="v-container animate-fade-in">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '5rem' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ width: '100px', height: '100px', background: '#fff1f2', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2.5rem auto', boxShadow: '0 20px 40px -10px rgba(225, 29, 72, 0.2)' }}
        >
          <HelpCircle size={48} color="#e11d48" />
        </motion.div>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 950, letterSpacing: '-2px', margin: '0 0 1rem 0', color: '#0f172a' }}>Success Center</h1>
        <p style={{ fontSize: '1.25rem', color: '#64748b', maxWidth: '600px', margin: '0 auto', fontWeight: 600, lineHeight: 1.6 }}>Our mission is to help your store thrive. Get instant access to expert advice and operational guides.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', marginBottom: '4rem' }}>
        <motion.div
          whileHover={{ y: -10 }}
          className="v-data-card"
          style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #f1f5f9' }}
        >
          <div>
            <div style={{ width: '72px', height: '72px', background: '#f0f9ff', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto', boxShadow: '0 10px 20px -5px rgba(14, 165, 233, 0.2)' }}>
              <FileText size={32} color="#0ea5e9" />
            </div>
            <h3 style={{ fontWeight: 950, fontSize: '1.5rem', margin: '0 0 1rem 0', color: '#0f172a' }}>Growth Playbook</h3>
            <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.6, marginBottom: '2.5rem', fontWeight: 600 }}>Master our proprietary inventory algorithms and increase your neighborhood visibility by 2.5x.</p>
          </div>
          <button className="v-btn-outline" style={{ width: '100%', padding: '18px', fontSize: '1rem', fontWeight: 900 }} onClick={() => setShowArticles(!showArticles)}>
            {showArticles ? "Collapse Manual" : "Read Growth Guide"}
          </button>
        </motion.div>

        <motion.div
          whileHover={{ y: -5 }}
          className="v-data-card"
          style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #e2e8f0', position: 'relative' }}
        >
          <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#fff7ed', color: '#f97316', padding: '6px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800 }}>
            Coming Soon
          </div>
          <div>
            <div style={{ width: '72px', height: '72px', background: '#f8fafc', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto', boxShadow: '0 10px 20px -5px rgba(148, 163, 184, 0.2)' }}>
              <CheckCircle size={32} color="#94a3b8" />
            </div>
            <h3 style={{ fontWeight: 950, fontSize: '1.5rem', margin: '0 0 1rem 0', color: '#0f172a' }}>Priority Concierge</h3>
            <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.6, marginBottom: '2.5rem', fontWeight: 600 }}>Direct bypass to technical operations. Verified partners receive support in under 60 seconds.</p>
          </div>
          <button className="v-btn-outline" style={{ width: '100%', padding: '18px', fontSize: '1rem', cursor: 'not-allowed', color: '#94a3b8', borderColor: '#cbd5e1' }} disabled>
            Coming Soon
          </button>
        </motion.div>
      </div>

      <AnimatePresence>
        {showArticles && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} style={{ marginBottom: '4rem', background: 'white', padding: '3.5rem', borderRadius: '40px', border: '1px solid #f1f5f9', boxShadow: '0 20px 50px -10px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontWeight: 950, color: '#0f172a', fontSize: '1.75rem', marginBottom: '2rem', letterSpacing: '-0.8px' }}>Store Optimization Manual</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
              <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#1e293b', fontWeight: 900, fontSize: '1.1rem' }}>1. Precision Inventory</h4>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: '#475569', fontWeight: 600 }}>Sync stock levels at 8 AM daily. High-accuracy stores are prioritized in neighborhood search results.</p>
              </div>
              <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#1e293b', fontWeight: 900, fontSize: '1.1rem' }}>2. The 7-Minute SLA</h4>
                <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: '#475569', fontWeight: 600 }}>Pack and confirm readiness within 420 seconds. This metrics affects your weekly performance bonus.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* <AnimatePresence>
        {false && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} style={{ marginBottom: '4rem', background: 'white', padding: '3.5rem', borderRadius: '40px', border: '1px solid var(--v-primary)', boxShadow: '0 40px 100px -20px rgba(249, 115, 22, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Star size={32} color="var(--v-primary)" fill="var(--v-primary)" />
                  </div>
                  <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '50%', background: '#22c55e', border: '3px solid white' }}></div>
                </div>
                <div>
                  <h3 style={{ fontWeight: 950, margin: 0, color: '#0f172a', fontSize: '1.5rem' }}>Partner Support Portal</h3>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#22c55e', fontWeight: 800 }}>LIVE ENCRYPTED SESSION</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', fontWeight: 800 }}>WAIT TIME</p>
                <p style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 900 }}>&lt; 1 Minute</p>
              </div>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem', padding: '0 1rem' }}>
              {chatHistory.map((ch, idx) => (
                <div key={idx} style={{ alignSelf: ch.sender === 'vendor' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                  <div style={{
                    background: ch.sender === 'vendor' ? 'var(--v-primary)' : '#f8fafc',
                    color: ch.sender === 'vendor' ? 'white' : '#1e293b',
                    padding: '1.5rem 2rem',
                    borderRadius: ch.sender === 'vendor' ? '28px 28px 4px 28px' : '28px 28px 28px 4px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                    border: ch.sender === 'vendor' ? 'none' : '1px solid #f1f5f9'
                  }}>
                    <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.6, fontWeight: 600 }}>{ch.text}</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginTop: '8px', textAlign: ch.sender === 'vendor' ? 'right' : 'left', textTransform: 'uppercase' }}>{ch.sender === 'vendor' ? 'You' : 'Agent'} • {ch.time}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSend} style={{ display: 'flex', gap: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
              <input type="text" placeholder="Detail your operational query..." value={msg} onChange={e => setMsg(e.target.value)} style={{ flex: 1, padding: '1.25rem 2rem', borderRadius: '18px', border: 'none', background: 'white', outline: 'none', fontSize: '1.1rem', fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }} />
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" style={{ padding: '1.25rem 3rem', borderRadius: '18px', border: 'none', background: '#0f172a', color: 'white', fontWeight: 950, cursor: 'pointer', fontSize: '1.1rem', letterSpacing: '0.5px' }}>Transmit</motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence> */ }

      <div style={{ marginTop: '5rem', padding: '2.5rem', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4rem', flexWrap: 'wrap', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px rgba(34, 197, 94, 0.4)' }}></div>
          <span style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>Network Status: <span style={{ color: '#22c55e' }}>OPTIMAL</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px rgba(34, 197, 94, 0.4)' }}></div>
          <span style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>Response SLA: <span style={{ color: '#22c55e' }}>&lt; 5 MIN</span></span>
        </div>
      </div>
    </div>
  );
};
