'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useVendor } from '@/lib/vendor-context';
import { supabase } from '@/lib/supabase-client';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '@/lib/api';
import jsQR from 'jsqr';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Search,
  Ticket,
  Calendar,
  User,
  Loader2,
  Camera,
  RefreshCw,
  Flashlight,
  Volume2,
  VolumeX,
  AlertTriangle,
  Clock,
  MapPin,
  Check,
  X,
  History,
  Sparkles
} from 'lucide-react';
import { CheckIcon, ExclamationTriangleIcon, DevicePhoneMobileIcon } from '@heroicons/react/20/solid';

interface VerifiedBooking {
  id: string;
  attendee: string;
  phone?: string;
  event: string;
  event_date?: string;
  venue?: string;
  tier: string;
  ticket_count: number | string;
  invoice?: string;
  checked_in_at?: string;
}

interface ScanResult {
  status: 'SUCCESS' | 'ALREADY_USED' | 'ERROR';
  message: string;
  booking?: VerifiedBooking;
}

interface RecentScan {
  id: string;
  name: string;
  tier: string;
  time: string;
  status: 'SUCCESS' | 'ALREADY_USED';
}

export default function ScannerPage() {
  const { businessType, store, vendor } = useVendor();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');

  // Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const scanFoundRef = useRef(false);
  const cooldownRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scannedFlash, setScannedFlash] = useState(false);
  const [invalidMsg, setInvalidMsg] = useState('');

  // Verification & Form State
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [checkedInCount, setCheckedInCount] = useState(0);

  // Play Scanner Beep Audio
  const playBeep = useCallback((type: 'success' | 'error' = 'success') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz (A5)
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime); // Low buzz
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // Non-blocking audio
    }
  }, [soundEnabled]);

  // Valid QR check logic from old vendor reference
  const isValidQR = (data: string): boolean => {
    if (!data) return false;
    const d = data.trim();
    const isPureNumeric = /^\d+$/.test(d);
    return !isPureNumeric && d.length > 5;
  };

  // Check-In Ticket Verification Handler
  const handleVerify = async (ticketHash: string) => {
    const cleanHash = ticketHash.trim();
    if (!cleanHash) {
      toast.error('Please enter a ticket or QR code');
      return;
    }

    setVerifying(true);
    setResult(null);

    try {
      const BASE_URL = getApiUrl();
      const endpoint =
        businessType === 'sports'
          ? `${BASE_URL}/api/sports/checkin`
          : `${BASE_URL}/api/events/checkin`;

      const payload =
        businessType === 'sports'
          ? { qr_code: cleanHash }
          : { qr_code_hash: cleanHash };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        playBeep('success');
        toast.success('Check-in Successful! Welcome.');

        const verified: VerifiedBooking = {
          id: data.booking?.id || cleanHash,
          attendee: data.booking?.attendee || data.booking?.user_name || 'Guest Attendee',
          phone: data.booking?.phone || data.booking?.user_phone || 'N/A',
          event: data.booking?.event || data.booking?.sports_venues?.name || 'Passwala Event',
          event_date: data.booking?.event_date || data.booking?.slot_date,
          venue: data.booking?.venue || store?.business_name || 'Passwala Arena',
          tier: data.booking?.tier || data.booking?.sport_type || 'General Admission',
          ticket_count: data.booking?.ticket_count || 1,
          invoice: data.booking?.invoice || data.booking?.invoice_number || 'N/A',
          checked_in_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setResult({
          status: 'SUCCESS',
          message: 'Valid Pass Verified — Gate Entry Permitted',
          booking: verified
        });

        setCheckedInCount((c) => c + 1);
        setRecentScans((prev) => [
          {
            id: verified.id,
            name: verified.attendee,
            tier: verified.tier,
            time: 'Just now',
            status: 'SUCCESS'
          },
          ...prev.slice(0, 7)
        ]);
      } else if (res.status === 400 && (data.error || '').toLowerCase().includes('already')) {
        playBeep('error');
        toast.error('Ticket Already Scanned!');

        const prevHolder: VerifiedBooking | undefined = data.booking
          ? {
              id: cleanHash,
              attendee: data.booking.attendee || 'Unknown Holder',
              event: data.booking.event || 'Event',
              tier: data.booking.tier || 'Ticket',
              ticket_count: data.booking.ticket_count || 1,
              invoice: data.booking.invoice || 'N/A'
            }
          : undefined;

        setResult({
          status: 'ALREADY_USED',
          message: data.error || 'This ticket has already been used for entry.',
          booking: prevHolder
        });

        setRecentScans((prev) => [
          {
            id: cleanHash,
            name: prevHolder?.attendee || 'Duplicate Pass',
            tier: prevHolder?.tier || 'Pass',
            time: 'Just now',
            status: 'ALREADY_USED'
          },
          ...prev.slice(0, 7)
        ]);
      } else {
        // Fallback check directly in Supabase for UUID matches
        let directFound = false;
        try {
          const { data: dbBooking } = await supabase
            .from('event_bookings')
            .select(`
              id, status, ticket_count, invoice_number,
              events(title, venue_name, event_date),
              event_ticket_tiers(tier_name, price),
              users(full_name, phone)
            `)
            .or(`id.eq.${cleanHash},qr_code_hash.eq.${cleanHash}`)
            .maybeSingle();

          if (dbBooking) {
            const b = dbBooking as any;
            const u = Array.isArray(b.users) ? b.users[0] : b.users;
            const ev = Array.isArray(b.events) ? b.events[0] : b.events;
            const tr = Array.isArray(b.event_ticket_tiers) ? b.event_ticket_tiers[0] : b.event_ticket_tiers;

            directFound = true;
            if (b.status === 'COMPLETED') {
              playBeep('error');
              setResult({
                status: 'ALREADY_USED',
                message: 'This ticket was already used for check-in.',
                booking: {
                  id: b.id,
                  attendee: u?.full_name || 'Guest',
                  phone: u?.phone || 'N/A',
                  event: ev?.title || 'Event',
                  tier: tr?.tier_name || 'General',
                  ticket_count: b.ticket_count || 1,
                  invoice: b.invoice_number
                }
              });
            } else {
              // Update status
              await supabase
                .from('event_bookings')
                .update({ status: 'COMPLETED', checked_in: true, checked_in_at: new Date().toISOString() })
                .eq('id', b.id);

              playBeep('success');
              toast.success('Direct Pass Verified!');
              const verified: VerifiedBooking = {
                id: b.id,
                attendee: u?.full_name || 'Guest',
                phone: u?.phone || 'N/A',
                event: ev?.title || 'Event',
                tier: tr?.tier_name || 'General',
                ticket_count: b.ticket_count || 1,
                invoice: b.invoice_number
              };
              setResult({
                status: 'SUCCESS',
                message: 'Pass Verified Successfully',
                booking: verified
              });
              setCheckedInCount((c) => c + 1);
            }
          }
        } catch {}

        if (!directFound) {
          playBeep('error');
          toast.error(data.error || 'Invalid Ticket or QR code');
          setResult({
            status: 'ERROR',
            message: data.error || 'Invalid QR code. No active booking found in system.'
          });
        }
      }
    } catch (err: any) {
      console.error('Scan verify error:', err);
      toast.error('Network check-in error: ' + (err.message || 'Server offline'));
    } finally {
      setVerifying(false);
    }
  };

  // Camera Management
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    scanFoundRef.current = false;
    cooldownRef.current = false;
    setScannedFlash(false);

    // Check secure context
    const isSecure =
      typeof window !== 'undefined' &&
      (window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1');

    if (!isSecure) {
      setCameraError('Camera requires HTTPS. Please open via https:// or localhost.');
      return;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported on this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        startScanLoop();
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please allow camera permissions in browser settings.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not start camera: ' + err.message);
      }
    }
  }, [facingMode, stopCamera]);

  // Real-time Canvas Decoder Loop using jsQR (Reference from VendorSubPages.jsx line 127)
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
      // Scan ~5-6 times per second to prevent CPU lag
      if (now - lastScanTime > 180) {
        lastScanTime = now;

        // Downscale camera resolution to max 360px dimension for ultra-fast decode
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
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);

          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data) {
            const raw = code.data.trim();
            if (isValidQR(raw)) {
              scanFoundRef.current = true;
              setScannedFlash(true);
              handleVerify(raw);
              return;
            } else {
              cooldownRef.current = true;
              setInvalidMsg('Invalid code — show ticket QR');
              setTimeout(() => {
                cooldownRef.current = false;
                setInvalidMsg('');
              }, 1500);
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: !torchOn }]
        });
        setTorchOn(!torchOn);
      } catch {
        toast.error('Torch not supported on this device');
      }
    }
  };

  // Flip Camera
  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Lifecycle
  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeTab, facingMode, startCamera, stopCamera]);

  // Reset to Scan Again
  const handleScanNext = () => {
    setResult(null);
    scanFoundRef.current = false;
    cooldownRef.current = false;
    setScannedFlash(false);
    if (activeTab === 'camera') {
      startScanLoop();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Live QR Gate Check-in" />

        <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
          {/* Top Headline & Counter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gate Admission System</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900">QR Ticket Scanner</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Scan attendee QR passes for {businessType === 'sports' ? 'sports court sessions' : 'events and concerts'}.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 px-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Checked In Today</span>
                  <span className="text-xl font-black text-slate-900">{checkedInCount} Attendees</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shadow-xs"
                title={soundEnabled ? 'Mute Beeper' : 'Enable Beeper'}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-600" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/60 w-fit">
            <button
              type="button"
              onClick={() => {
                setActiveTab('camera');
                setResult(null);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="w-4 h-4 text-blue-600" />
              <span>Live Camera Scanner</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('manual');
                stopCamera();
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-4 h-4 text-blue-600" />
              <span>Manual Code Entry</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: LIVE CAMERA SCANNER VIEWPORT                      */}
          {/* ======================================================== */}
          {activeTab === 'camera' && (
            <div className="rounded-3xl bg-slate-900 text-white p-6 shadow-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-300">Live Camera Feed</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                      torchOn
                        ? 'bg-amber-400 text-slate-900 border-amber-400'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <Flashlight className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Torch</span>
                  </button>

                  <button
                    type="button"
                    onClick={flipCamera}
                    className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Flip</span>
                  </button>
                </div>
              </div>

              {/* Viewport Box (Reference from VendorSubPages.jsx lines 242-305) */}
              <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Dark radial vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.65)_100%)] pointer-events-none" />

                {/* QR Scanner Target Box with L-bracket corners & Laser Scanline */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 sm:w-56 sm:h-56 relative">
                    {/* Top Left */}
                    <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg shadow-sm" />
                    {/* Top Right */}
                    <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg shadow-sm" />
                    {/* Bottom Left */}
                    <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg shadow-sm" />
                    {/* Bottom Right */}
                    <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-emerald-500 rounded-br-lg shadow-sm" />

                    {/* Animated green laser scanline */}
                    {cameraActive && !scannedFlash && (
                      <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#22c55e] animate-scanline" />
                    )}
                  </div>
                </div>

                {/* Loading / Starting Camera */}
                {!cameraActive && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                    <span className="text-xs font-bold text-slate-300">Initializing camera sensor...</span>
                  </div>
                )}

                {/* Camera Error Message */}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
                    <AlertTriangle className="w-10 h-10 text-amber-400" />
                    <p className="text-xs font-bold text-amber-300 max-w-sm leading-relaxed">{cameraError}</p>
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer mt-2"
                    >
                      Retry Camera
                    </button>
                  </div>
                )}

                {/* Green Flash on Detected QR */}
                {scannedFlash && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-emerald-600/90 transition-all">
                    <div className="w-16 h-16 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-2xl">
                      <Check className="w-8 h-8 stroke-[3]" />
                    </div>
                    <span className="text-base font-black text-white tracking-wide">QR Detected!</span>
                  </div>
                )}

                {/* Invalid code alert banner */}
                {invalidMsg && (
                  <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none">
                    <span className="px-4 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold shadow-lg flex items-center gap-1.5">
                      <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                      <span>{invalidMsg}</span>
                    </span>
                  </div>
                )}

                {/* Alignment Prompt */}
                {cameraActive && !scannedFlash && !invalidMsg && (
                  <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none">
                    <span className="px-3.5 py-1 rounded-full bg-black/60 backdrop-blur text-[11px] font-bold text-emerald-400 tracking-wider">
                      ALIGN TICKET QR CODE WITHIN FRAME
                    </span>
                  </div>
                )}
              </div>

              {/* Instructions Tip */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
                  <DevicePhoneMobileIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Ask attendee to open: <strong className="text-white">Passwala Buyer App → My Orders → View QR Pass</strong></span>
                </p>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: MANUAL ENTRY FORM                                 */}
          {/* ======================================================== */}
          {activeTab === 'manual' && (
            <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-lg shadow-slate-200/50 space-y-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Manual Pass Verification</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter or paste attendee&apos;s ticket ID, booking UUID, or invoice number.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerify(manualCode);
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Booking ID or QR Hash *
                  </label>
                  <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 focus-within:border-blue-500 focus-within:bg-white outline-none">
                    <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="e.g. 5b2b8333... or TKT-XXXX"
                      className="bg-transparent flex-1 text-xs font-mono font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={verifying || !manualCode.trim()}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Pass...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify & Admit Guest</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* CHECK-IN RESULT MODAL / POPUP (FROM OLD VENDOR SIDE)     */}
          {/* ======================================================== */}
          {result && (
            <div className="rounded-3xl border-2 p-6 md:p-8 shadow-xl transition-all space-y-6 animate-fade-in bg-white border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                      result.status === 'SUCCESS'
                        ? 'bg-emerald-100 text-emerald-600 shadow-emerald-600/20'
                        : result.status === 'ALREADY_USED'
                        ? 'bg-amber-100 text-amber-600 shadow-amber-600/20'
                        : 'bg-red-100 text-red-600 shadow-red-600/20'
                    }`}
                  >
                    {result.status === 'SUCCESS' ? (
                      <CheckCircle2 className="w-8 h-8" />
                    ) : result.status === 'ALREADY_USED' ? (
                      <AlertTriangle className="w-8 h-8" />
                    ) : (
                      <XCircle className="w-8 h-8" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      {result.status === 'SUCCESS'
                        ? 'Admission Confirmed!'
                        : result.status === 'ALREADY_USED'
                        ? 'Pass Already Used!'
                        : 'Check-In Rejected'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{result.message}</p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    result.status === 'SUCCESS'
                      ? 'bg-emerald-100 text-emerald-700'
                      : result.status === 'ALREADY_USED'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {result.status}
                </span>
              </div>

              {/* Guest & Pass Info Card */}
              {result.booking && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Attendee Name</span>
                      <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-blue-600" />
                        <span>{result.booking.attendee}</span>
                      </div>
                      {result.booking.phone && (
                        <span className="text-slate-500 font-medium">{result.booking.phone}</span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Pass Tier & Count</span>
                      <div className="text-sm font-extrabold text-indigo-600 flex items-center gap-1.5">
                        <Ticket className="w-4 h-4" />
                        <span>{result.booking.tier}</span>
                        <span className="text-slate-400">({result.booking.ticket_count} passes)</span>
                      </div>
                      <span className="text-slate-500 font-medium">Invoice #{result.booking.invoice}</span>
                    </div>
                  </div>

                  {result.booking.event && (
                    <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Event</span>
                        <span className="font-extrabold text-slate-800">{result.booking.event}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Venue</span>
                        <span className="font-extrabold text-slate-800">{result.booking.venue || 'Passwala Arena'}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleScanNext}
                className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Next Guest / Scan Another Pass →</span>
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* RECENT CHECK-INS HISTORY LIST                            */}
          {/* ======================================================== */}
          {recentScans.length > 0 && (
            <div className="rounded-3xl bg-white border border-slate-200 p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-black text-slate-900">Recent Gate Check-ins</h3>
                </div>
                <span className="text-xs font-bold text-slate-400">{recentScans.length} logged</span>
              </div>

              <div className="divide-y divide-slate-100">
                {recentScans.map((scan, sIdx) => (
                  <div key={sIdx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          scan.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {scan.status === 'SUCCESS' ? (
                          <CheckIcon className="w-3.5 h-3.5" />
                        ) : (
                          <ExclamationTriangleIcon className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900">{scan.name}</span>
                        <span className="text-slate-400 ml-1.5">• {scan.tier}</span>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold text-slate-400">{scan.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      <style jsx>{`
        @keyframes scanline {
          0% {
            top: 4px;
          }
          50% {
            top: calc(100% - 8px);
          }
          100% {
            top: 4px;
          }
        }
        .animate-scanline {
          animation: scanline 2.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
