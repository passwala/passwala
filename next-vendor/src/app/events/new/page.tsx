'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVendor } from '@/lib/vendor-context';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase-client';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Ticket,
  Calendar,
  MapPin,
  IndianRupee,
  Loader2,
  Clock,
  Layers,
  Sparkles,
  Check,
  Plus,
  Trash2,
  Globe,
  Lock,
  Eye,
  CalendarDays,
  Image as ImageIcon,
  CheckCircle2,
  Info,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

type ShowType = 'single' | 'multiple' | 'tour';

interface ScheduleSlot {
  id: string;
  date: string;
  starts: string;
  ends: string;
  venue_name: string;
  city?: string;
}

interface TicketTier {
  id: string;
  tier_name: string;
  price: string | number;
  total_seats: string | number;
  slot_capacities?: Record<string, string>;
}

const CATEGORIES = [
  'Music & Concerts',
  'Comedy & Theatre',
  'Workshops & Classes',
  'Parties & Nightlife',
  'Festivals & Fairs',
  'Sports & Fitness',
  'Corporate & Business',
  'Other Events'
];

const PRESET_BANNERS = [
  { label: 'Concert & Music', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80' },
  { label: 'Comedy & Theatre', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80' },
  { label: 'Workshop & Class', url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80' },
  { label: 'Festival & Fair', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80' }
];

export default function NewEventPage() {
  const router = useRouter();
  const { vendor, store } = useVendor();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Wizard Navigation
  const [showType, setShowType] = useState<ShowType>('single');
  const [step, setStep] = useState<number>(1); // 1 = type selection, 2+ = wizard steps

  // Basic Info
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Music & Concerts');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [isOnline, setIsOnline] = useState(false);

  // Single Show Details
  const [singleDate, setSingleDate] = useState('');
  const [singleStarts, setSingleStarts] = useState('19:00');
  const [singleEnds, setSingleEnds] = useState('22:00');
  const [bookingStart, setBookingStart] = useState('');
  const [bookingEnd, setBookingEnd] = useState('');
  const [venueName, setVenueName] = useState(store?.business_name || '');
  const [city, setCity] = useState(store?.city || 'Ahmedabad');

  // Metadata Details
  const [language, setLanguage] = useState('Hindi / English');
  const [duration, setDuration] = useState('2h 30m');
  const [ageRestriction, setAgeRestriction] = useState('All Ages');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState(PRESET_BANNERS[0].url);

  // Multiple Shows / Tour Slots
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([
    {
      id: 'slot_1',
      date: '',
      starts: '19:00',
      ends: '22:00',
      venue_name: store?.business_name || 'Passwala Arena, Satellite',
      city: store?.city || 'Ahmedabad'
    },
    {
      id: 'slot_2',
      date: '',
      starts: '19:00',
      ends: '22:00',
      venue_name: store?.business_name || 'Passwala Arena, Satellite',
      city: store?.city || 'Ahmedabad'
    }
  ]);

  // Ticket Tiers
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([
    { id: 'tier_1', tier_name: 'General Admission', price: '299', total_seats: '100' },
    { id: 'tier_2', tier_name: 'VIP Front Row', price: '799', total_seats: '30' }
  ]);

  // Slot Handlers
  const handleAddSlot = () => {
    const newId = `slot_${Date.now()}`;
    setScheduleSlots([
      ...scheduleSlots,
      {
        id: newId,
        date: '',
        starts: '19:00',
        ends: '22:00',
        venue_name: venueName || 'Passwala Arena',
        city: city || 'Ahmedabad'
      }
    ]);
  };

  const handleRemoveSlot = (id: string) => {
    if (scheduleSlots.length <= 1) {
      toast.error('At least one show date is required');
      return;
    }
    setScheduleSlots(scheduleSlots.filter((s) => s.id !== id));
  };

  const handleUpdateSlot = (index: number, field: keyof ScheduleSlot, value: string) => {
    const updated = [...scheduleSlots];
    updated[index] = { ...updated[index], [field]: value };
    setScheduleSlots(updated);
  };

  // Tier Handlers
  const handleAddTier = (name = 'Custom Pass', price = '499', seats = '50') => {
    const newId = `tier_${Date.now()}`;
    setTicketTiers([
      ...ticketTiers,
      { id: newId, tier_name: name, price, total_seats: seats }
    ]);
  };

  const handleRemoveTier = (id: string) => {
    if (ticketTiers.length <= 1) {
      toast.error('At least one ticket tier is required');
      return;
    }
    setTicketTiers(ticketTiers.filter((t) => t.id !== id));
  };

  const handleUpdateTier = (index: number, field: keyof TicketTier, value: any) => {
    const updated = [...ticketTiers];
    updated[index] = { ...updated[index], [field]: value };
    setTicketTiers(updated);
  };

  const handleUpdateSlotCapacity = (tierIndex: number, slotId: string, cap: string) => {
    const updated = [...ticketTiers];
    const slotCaps = { ...(updated[tierIndex].slot_capacities || {}) };
    slotCaps[slotId] = cap;
    updated[tierIndex].slot_capacities = slotCaps;
    setTicketTiers(updated);
  };

  // Step Validation
  const validateCurrentStep = (): boolean => {
    if (showType === 'single') {
      if (step === 2) {
        if (!title.trim()) {
          toast.error('Please enter an event name');
          return false;
        }
        if (!singleDate) {
          toast.error('Please choose an event date');
          return false;
        }
        if (!isOnline && !venueName.trim()) {
          toast.error('Please enter a venue location');
          return false;
        }
      } else if (step === 3) {
        if (ticketTiers.length === 0 || ticketTiers.some((t) => !t.tier_name.trim())) {
          toast.error('Please provide at least one complete ticket tier');
          return false;
        }
      }
    } else {
      // Multiple or Tour
      if (step === 2) {
        if (!title.trim()) {
          toast.error('Please enter an event name');
          return false;
        }
      } else if (step === 3) {
        const invalidSlot = scheduleSlots.some((s) => !s.date || (!isOnline && !s.venue_name));
        if (invalidSlot) {
          toast.error('Please fill in date and venue for every scheduled show');
          return false;
        }
      } else if (step === 4) {
        if (ticketTiers.length === 0 || ticketTiers.some((t) => !t.tier_name.trim())) {
          toast.error('Please define at least one valid ticket tier');
          return false;
        }
      }
    }
    return true;
  };

  const maxSteps = showType === 'single' ? 5 : 6;

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setStep((prev) => Math.min(prev + 1, maxSteps));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // Final Submission
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter event title');
      return;
    }

    setLoading(true);
    try {
      const creatorId = vendor?.id || vendor?.user_id;

      if (showType === 'single') {
        // Build single show payload
        const eventStartIso = singleDate ? new Date(`${singleDate}T${singleStarts}:00`).toISOString() : new Date().toISOString();
        const eventEndIso = singleDate ? new Date(`${singleDate}T${singleEnds}:00`).toISOString() : null;

        const { data: eventData, error: eventErr } = await supabase
          .from('events')
          .insert([
            {
              title,
              description: description || `Join us for ${title} live in ${city}!`,
              category,
              venue_name: isOnline ? 'Online Virtual Venue' : (venueName || 'Passwala Arena'),
              venue_lat: 23.0225,
              venue_lng: 72.5714,
              event_date: eventStartIso,
              ends_at: eventEndIso,
              banner_url: JSON.stringify([bannerUrl || PRESET_BANNERS[0].url]),
              status: 'UPCOMING',
              approval_status: 'PENDING',
              created_by: creatorId,
              booking_start: bookingStart ? new Date(bookingStart).toISOString() : null,
              booking_end: bookingEnd ? new Date(bookingEnd).toISOString() : null,
              show_type: 'single',
              visibility,
              is_online: isOnline,
              duration: duration || null,
              age_restriction: ageRestriction || null,
              language: language || null
            }
          ])
          .select()
          .single();

        if (eventErr) throw eventErr;

        // Insert Ticket Tiers
        if (eventData?.id) {
          const tiersPayload = ticketTiers.map((t) => ({
            event_id: eventData.id,
            tier_name: t.tier_name || 'General Admission',
            price: parseFloat(String(t.price)) || 0,
            total_seats: parseInt(String(t.total_seats)) || 100,
            available_seats: parseInt(String(t.total_seats)) || 100,
            booking_open: bookingStart ? new Date(bookingStart).toISOString() : null,
            booking_close: bookingEnd ? new Date(bookingEnd).toISOString() : null
          }));

          const { error: tierErr } = await supabase.from('event_ticket_tiers').insert(tiersPayload);
          if (tierErr) console.warn('Non-blocking tier insert warning:', tierErr);
        }

        toast.success('🎉 Single show event published successfully!');
      } else {
        // Multiple Shows or Tour: Publish sibling records for each show slot
        let publishedCount = 0;
        for (const slot of scheduleSlots) {
          const eventStartIso = new Date(`${slot.date}T${slot.starts || '19:00'}:00`).toISOString();
          const eventEndIso = new Date(`${slot.date}T${slot.ends || '22:00'}:00`).toISOString();

          const { data: slotEvt, error: slotErr } = await supabase
            .from('events')
            .insert([
              {
                title,
                description: description || `Experience ${title} live!`,
                category,
                venue_name: isOnline ? 'Online Virtual Venue' : (slot.venue_name || venueName || 'Passwala Arena'),
                venue_lat: 23.0225,
                venue_lng: 72.5714,
                event_date: eventStartIso,
                ends_at: eventEndIso,
                banner_url: JSON.stringify([bannerUrl || PRESET_BANNERS[0].url]),
                status: 'UPCOMING',
                approval_status: 'PENDING',
                created_by: creatorId,
                booking_start: bookingStart ? new Date(bookingStart).toISOString() : null,
                booking_end: bookingEnd ? new Date(bookingEnd).toISOString() : null,
                show_type: showType,
                visibility,
                is_online: isOnline,
                duration: duration || null,
                age_restriction: ageRestriction || null,
                language: language || null
              }
            ])
            .select()
            .single();

          if (slotErr) throw slotErr;

          if (slotEvt?.id) {
            const tiersPayload = ticketTiers.map((t) => {
              const cap =
                t.slot_capacities?.[slot.id] !== undefined
                  ? parseInt(t.slot_capacities[slot.id]) || 100
                  : parseInt(String(t.total_seats)) || 100;

              return {
                event_id: slotEvt.id,
                tier_name: t.tier_name || 'General Admission',
                price: parseFloat(String(t.price)) || 0,
                total_seats: cap,
                available_seats: cap,
                booking_open: bookingStart ? new Date(bookingStart).toISOString() : null,
                booking_close: bookingEnd ? new Date(bookingEnd).toISOString() : null
              };
            });

            await supabase.from('event_ticket_tiers').insert(tiersPayload);
            publishedCount++;
          }
        }

        toast.success(`🎉 Published ${publishedCount} ${showType === 'tour' ? 'tour stops' : 'shows'} successfully!`);
      }

      router.push('/events');
    } catch (err: any) {
      console.error('Publish error:', err);
      toast.error('Failed to publish event: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Publish New Event" />

        <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
          {/* Back & Breadcrumb Controls */}
          <div className="flex items-center justify-between">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Events Console</span>
            </Link>

            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200 transition-colors"
              >
                Change Event Type ({showType === 'tour' ? 'Festival/Tour' : showType === 'multiple' ? 'Multiple Shows' : 'Single Show'})
              </button>
            )}
          </div>

          {/* Stepper Header Bar */}
          {step > 1 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between overflow-x-auto gap-3 text-xs font-bold">
                {showType === 'single' ? (
                  <>
                    <div className={`flex items-center gap-2 ${step >= 2 ? 'text-orange-600' : 'text-slate-400'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'}`}>1</span>
                      <span className="whitespace-nowrap">Basics & Schedule</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    <div className={`flex items-center gap-2 ${step >= 3 ? 'text-orange-600' : 'text-slate-400'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'}`}>2</span>
                      <span className="whitespace-nowrap">Tickets & Pricing</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    <div className={`flex items-center gap-2 ${step >= 4 ? 'text-orange-600' : 'text-slate-400'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 4 ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'}`}>3</span>
                      <span className="whitespace-nowrap">Photos & Details</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    <div className={`flex items-center gap-2 ${step >= 5 ? 'text-orange-600' : 'text-slate-400'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 5 ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'}`}>4</span>
                      <span className="whitespace-nowrap">Review & Publish</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-600' : 'text-slate-400'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>1</span>
                      <span className="whitespace-nowrap">Basics</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    <div className={`flex items-center gap-2 ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>2</span>
                      <span className="whitespace-nowrap">Shows Schedule</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    <div className={`flex items-center gap-2 ${step >= 4 ? 'text-indigo-600' : 'text-slate-400'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 4 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>3</span>
                      <span className="whitespace-nowrap">Tickets & Capacity</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    <div className={`flex items-center gap-2 ${step >= 5 ? 'text-indigo-600' : 'text-slate-400'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 5 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>4</span>
                      <span className="whitespace-nowrap">Photos & Details</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                    <div className={`flex items-center gap-2 ${step >= 6 ? 'text-indigo-600' : 'text-slate-400'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 6 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>5</span>
                      <span className="whitespace-nowrap">Review & Publish</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 1: EVENT TYPE SELECTION (SINGLE, MULTIPLE, TOUR)    */}
          {/* ======================================================== */}
          {step === 1 && (
            <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-10 shadow-lg shadow-slate-200/50 space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Choose Setup Model</span>
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Select Event Setup Type</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Choose the structure for your upcoming event. You can customize dates, venues, tiers, and capacities in the next steps.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. SINGLE SHOW CARD */}
                <div
                  onClick={() => setShowType('single')}
                  className={`relative p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left ${
                    showType === 'single'
                      ? 'border-orange-500 bg-orange-50/30 shadow-lg shadow-orange-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 uppercase tracking-wider">
                          Most Common
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            showType === 'single' ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-300'
                          }`}
                        >
                          {showType === 'single' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900">Single show</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        One date, one venue and one show time. Perfect for concerts, comedy nights, parties and workshops.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-orange-600">Takes about 2 minutes</span>
                    <span className="text-xs font-extrabold text-slate-400">1 Slot</span>
                  </div>
                </div>

                {/* 2. MULTIPLE SHOWS CARD */}
                <div
                  onClick={() => setShowType('multiple')}
                  className={`relative p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left ${
                    showType === 'multiple'
                      ? 'border-indigo-600 bg-indigo-50/30 shadow-lg shadow-indigo-600/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Layers className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                          Multi-Slot
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            showType === 'multiple' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                          }`}
                        >
                          {showType === 'multiple' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900">Multiple shows</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        One event across several dates or times, such as a weekend theatre run, recurring comedy club, or daily classes.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-600">Simple multi-date schedule</span>
                    <span className="text-xs font-extrabold text-slate-400">Multi Slots</span>
                  </div>
                </div>

                {/* 3. FESTIVAL OR TOUR CARD */}
                <div
                  onClick={() => setShowType('tour')}
                  className={`relative p-6 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left ${
                    showType === 'tour'
                      ? 'border-pink-500 bg-pink-50/30 shadow-lg shadow-pink-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-600 flex items-center justify-center">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-100 text-pink-700 uppercase tracking-wider">
                          Advanced
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            showType === 'tour' ? 'border-pink-500 bg-pink-500 text-white' : 'border-slate-300'
                          }`}
                        >
                          {showType === 'tour' && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-slate-900">Festival or tour</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Multiple venues, multi-day festivals, music tours, or season passes with separate city stops and stage lineups.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-pink-600">Multi-city & multi-day passes</span>
                    <span className="text-xs font-extrabold text-slate-400">Tour / Fest</span>
                  </div>
                </div>
              </div>

              {/* Selection summary & Continue */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
                <div className="text-xs text-slate-500">
                  Selected Setup:{' '}
                  <strong className="text-slate-900 font-bold">
                    {showType === 'tour' ? '🎪 Festival or Tour' : showType === 'multiple' ? '🎭 Multiple Shows' : '🎫 Single Show'}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm text-white shadow-md transition-all cursor-pointer ${
                    showType === 'tour'
                      ? 'bg-pink-600 hover:bg-pink-700 shadow-pink-600/20'
                      : showType === 'multiple'
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                      : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20'
                  }`}
                >
                  Continue with {showType === 'tour' ? 'Festival / Tour' : showType === 'multiple' ? 'Multiple Shows' : 'Single Show'} →
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: BASICS (SINGLE SHOW OR MULTIPLE SHOWS)           */}
          {/* ======================================================== */}
          {step === 2 && (
            <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-10 shadow-lg shadow-slate-200/50 space-y-8">
              <div>
                <span className="text-xs font-extrabold tracking-wider uppercase text-orange-600">Step 1 of {maxSteps - 1}</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  {showType === 'single' ? 'Create Single Show' : showType === 'multiple' ? 'Multiple Shows: Basics' : 'Festival/Tour: Overview'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Provide the core name, category, and visibility configuration for your event.
                </p>
              </div>

              <div className="space-y-6">
                {/* Event Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Event Title / Headline *
                  </label>
                  <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
                    <Ticket className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={
                        showType === 'tour'
                          ? 'e.g. Arijit Singh India Tour 2026'
                          : showType === 'multiple'
                          ? 'e.g. Friday Night Standup Comedy Run'
                          : 'e.g. An Evening with Prateek Kuhad Live'
                      }
                      className="bg-transparent flex-1 text-sm text-slate-900 font-semibold placeholder:text-slate-400 outline-none"
                    />
                  </div>
                </div>

                {/* Visibility Cards */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Event Visibility</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      onClick={() => setVisibility('public')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                        visibility === 'public'
                          ? 'border-orange-500 bg-orange-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Globe className={`w-5 h-5 ${visibility === 'public' ? 'text-orange-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-sm font-bold text-slate-900">Public</div>
                        <div className="text-[11px] text-slate-500">Listed publicly on Passwala customer app & search</div>
                      </div>
                    </div>

                    <div
                      onClick={() => setVisibility('private')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                        visibility === 'private'
                          ? 'border-orange-500 bg-orange-50/40 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Lock className={`w-5 h-5 ${visibility === 'private' ? 'text-orange-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-sm font-bold text-slate-900">Private / Invite Only</div>
                        <div className="text-[11px] text-slate-500">Accessible only to guests with private pass URL</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Virtual Event Checkbox */}
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    id="is_online"
                    checked={isOnline}
                    onChange={(e) => setIsOnline(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="is_online" className="text-xs text-slate-700 font-semibold cursor-pointer">
                    <strong>Virtual / Online Event</strong>
                    <span className="block text-slate-400 font-normal mt-0.5">
                      Streamed online via video conferencing instead of a physical venue.
                    </span>
                  </label>
                </div>

                {/* Category & Single Show Date (If Single) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 text-sm text-slate-900 font-semibold focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 outline-none cursor-pointer transition-all"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {showType === 'single' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Event Date *</label>
                      <input
                        type="date"
                        required
                        value={singleDate}
                        onChange={(e) => setSingleDate(e.target.value)}
                        className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 text-sm text-slate-900 font-semibold focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 outline-none transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* Single Show Timings & Venue */}
                {showType === 'single' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Starts At *</label>
                        <input
                          type="time"
                          value={singleStarts}
                          onChange={(e) => setSingleStarts(e.target.value)}
                          className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3 text-sm text-slate-900 font-semibold focus:border-orange-500 focus:bg-white outline-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ends At *</label>
                        <input
                          type="time"
                          value={singleEnds}
                          onChange={(e) => setSingleEnds(e.target.value)}
                          className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3 text-sm text-slate-900 font-semibold focus:border-orange-500 focus:bg-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Venue Location *
                        </label>
                        <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 focus-within:border-orange-500 focus-within:bg-white outline-none">
                          <MapPin className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                          <input
                            type="text"
                            disabled={isOnline}
                            value={isOnline ? 'Online Virtual Venue' : venueName}
                            onChange={(e) => setVenueName(e.target.value)}
                            placeholder="e.g. Pandit Deendayal Upadhyay Auditorium"
                            className="bg-transparent flex-1 text-sm text-slate-900 font-semibold outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">City</label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Ahmedabad"
                          className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 text-sm text-slate-900 font-semibold focus:border-orange-500 focus:bg-white outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Booking Window */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Booking Opens (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={bookingStart}
                      onChange={(e) => setBookingStart(e.target.value)}
                      className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3 text-xs text-slate-900 font-semibold focus:border-orange-500 focus:bg-white outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Booking Closes (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={bookingEnd}
                      onChange={(e) => setBookingEnd(e.target.value)}
                      className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3 text-xs text-slate-900 font-semibold focus:border-orange-500 focus:bg-white outline-none"
                    />
                  </div>
                </div>

                {/* Show Details (Language, Duration, Age) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Language</label>
                    <input
                      type="text"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      placeholder="e.g. Hindi / English"
                      className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3 text-sm text-slate-900 font-semibold outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Duration</label>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g. 2h 30m"
                      className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3 text-sm text-slate-900 font-semibold outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Age Restriction</label>
                    <input
                      type="text"
                      value={ageRestriction}
                      onChange={(e) => setAgeRestriction(e.target.value)}
                      placeholder="e.g. All Ages, 18+"
                      className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3 text-sm text-slate-900 font-semibold outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-8 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/20 transition-all"
                >
                  {showType === 'single' ? 'Next: Tickets & Pricing →' : 'Next: Shows Schedule →'}
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: SCHEDULE SLOTS (MULTIPLE SHOWS & TOURS ONLY)     */}
          {/* ======================================================== */}
          {step === 3 && showType !== 'single' && (
            <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-10 shadow-lg shadow-slate-200/50 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold tracking-wider uppercase text-indigo-600">Step 2 of {maxSteps - 1}</span>
                  <h2 className="text-2xl font-black text-slate-900 mt-1">
                    {showType === 'tour' ? 'Festival & Tour Schedule' : 'Multiple Shows Schedule'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Add each date and time slot for your recurring or multi-day performances.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Show Slot</span>
                </button>
              </div>

              {/* Slot Cards List */}
              <div className="space-y-4">
                {scheduleSlots.map((slot, index) => (
                  <div
                    key={slot.id}
                    className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/50 space-y-4 relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">
                          {showType === 'tour' ? `Tour Stop #${index + 1}` : `Show Slot #${index + 1}`}
                        </h4>
                      </div>

                      {scheduleSlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(slot.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors"
                          title="Remove this slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase">Show Date *</label>
                        <input
                          type="date"
                          required
                          value={slot.date}
                          onChange={(e) => handleUpdateSlot(index, 'date', e.target.value)}
                          className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase">Starts At *</label>
                        <input
                          type="time"
                          value={slot.starts}
                          onChange={(e) => handleUpdateSlot(index, 'starts', e.target.value)}
                          className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase">Ends At *</label>
                        <input
                          type="time"
                          value={slot.ends}
                          onChange={(e) => handleUpdateSlot(index, 'ends', e.target.value)}
                          className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase">
                          {showType === 'tour' ? 'City / Stop' : 'Venue Name *'}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={showType === 'tour' ? 'e.g. Mumbai / Ahmedabad' : 'e.g. Auditorium Hall A'}
                          value={slot.venue_name}
                          onChange={(e) => handleUpdateSlot(index, 'venue_name', e.target.value)}
                          className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/40 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add another show date/time slot</span>
                </button>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all"
                >
                  Next: Tickets & Pricing →
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TICKETS & TIERS STEP (STEP 3 FOR SINGLE, STEP 4 FOR MULTI)*/}
          {/* ======================================================== */}
          {((showType === 'single' && step === 3) || (showType !== 'single' && step === 4)) && (
            <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-10 shadow-lg shadow-slate-200/50 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold tracking-wider uppercase text-orange-600">
                    Step {showType === 'single' ? '2' : '3'} of {maxSteps - 1}
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 mt-1">Ticket Tiers & Capacity</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Set up VIP, General, Early Bird, or Couple ticket categories and quantities.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddTier('VIP Access', '999', '50')}
                    className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 transition-all"
                  >
                    + Add VIP
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddTier('General Pass', '299', '100')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Tier</span>
                  </button>
                </div>
              </div>

              {/* Tiers List */}
              <div className="space-y-4">
                {ticketTiers.map((tier, index) => (
                  <div
                    key={tier.id}
                    className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/50 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase tracking-wider">
                          {Number(tier.price) === 0 ? 'Free Pass' : 'Paid Ticket'}
                        </span>
                      </div>

                      {ticketTiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTier(tier.id)}
                          className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase">Tier Name *</label>
                        <input
                          type="text"
                          required
                          value={tier.tier_name}
                          onChange={(e) => handleUpdateTier(index, 'tier_name', e.target.value)}
                          placeholder="e.g. General Admission"
                          className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase">Pass Price (₹) *</label>
                        <div className="flex items-center rounded-xl bg-white border border-slate-200 px-3 py-2">
                          <IndianRupee className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
                          <input
                            type="number"
                            min={0}
                            required
                            value={tier.price}
                            onChange={(e) => handleUpdateTier(index, 'price', e.target.value)}
                            placeholder="299"
                            className="w-full bg-transparent text-xs font-bold text-slate-900 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase">
                          {showType === 'single' ? 'Total Seats Capacity *' : 'Base Capacity / Show *'}
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={tier.total_seats}
                          onChange={(e) => handleUpdateTier(index, 'total_seats', e.target.value)}
                          placeholder="100"
                          className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    {/* Per-Show Capacity Overrides for Multiple Shows */}
                    {showType !== 'single' && scheduleSlots.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-slate-200/70 space-y-2">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                          Custom Capacity per Show Date (Optional)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {scheduleSlots.map((slot, sIdx) => {
                            const dateLabel = slot.date
                              ? new Date(slot.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                              : `Show #${sIdx + 1}`;
                            const capVal =
                              tier.slot_capacities?.[slot.id] !== undefined
                                ? tier.slot_capacities[slot.id]
                                : tier.total_seats;

                            return (
                              <div
                                key={slot.id}
                                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200"
                              >
                                <span className="text-xs text-slate-600 font-semibold truncate">{dateLabel}:</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={capVal}
                                  onChange={(e) => handleUpdateSlotCapacity(index, slot.id, e.target.value)}
                                  className="w-16 px-2 py-1 text-xs font-bold text-right border border-slate-200 rounded-lg outline-none"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => handleAddTier('General Pass', '299', '100')}
                  className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-orange-500 hover:bg-orange-50/40 text-xs font-bold text-slate-600 hover:text-orange-600 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add another ticket tier</span>
                </button>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-8 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/20 transition-all"
                >
                  Next: Photos & Details →
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PHOTOS & DETAILS STEP (STEP 4 FOR SINGLE, STEP 5 FOR MULTI)*/}
          {/* ======================================================== */}
          {((showType === 'single' && step === 4) || (showType !== 'single' && step === 5)) && (
            <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-10 shadow-lg shadow-slate-200/50 space-y-8">
              <div>
                <span className="text-xs font-extrabold tracking-wider uppercase text-orange-600">
                  Step {showType === 'single' ? '3' : '4'} of {maxSteps - 1}
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Cover Photo & Description</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Add high-resolution visuals and event guidelines to attract attendees on the customer app.
                </p>
              </div>

              <div className="space-y-6">
                {/* Banner URL & Presets */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Cover Banner Image URL *
                  </label>
                  <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3 focus-within:border-orange-500 focus-within:bg-white outline-none">
                    <ImageIcon className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="url"
                      value={bannerUrl}
                      onChange={(e) => setBannerUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="bg-transparent flex-1 text-xs font-semibold text-slate-900 outline-none"
                    />
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-400">Quick Presets:</span>
                    {PRESET_BANNERS.map((b) => (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() => setBannerUrl(b.url)}
                        className={`text-[11px] font-bold px-3 py-1 rounded-xl border transition-all ${
                          bannerUrl === b.url
                            ? 'bg-orange-50 border-orange-300 text-orange-600'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>

                  {/* Live Banner Preview */}
                  <div className="h-48 md:h-64 rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 relative shadow-inner">
                    <img src={bannerUrl} alt="Event Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
                      <div>
                        <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-orange-600 text-white uppercase tracking-wider">
                          {category}
                        </span>
                        <h3 className="text-xl font-black text-white mt-1">{title || 'Your Event Title Here'}</h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Description */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Event Overview & Guidelines
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide artist lineup, gates opening time, entry rules, age restrictions, and what attendees should bring..."
                    className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 p-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-orange-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-8 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/20 transition-all"
                >
                  Next: Final Review →
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* FINAL REVIEW & PUBLISH STEP                              */}
          {/* ======================================================== */}
          {step === maxSteps && (
            <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-10 shadow-lg shadow-slate-200/50 space-y-8">
              <div>
                <span className="text-xs font-extrabold tracking-wider uppercase text-green-600">Final Step</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Review & Publish Event</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Double check your event configuration before publishing live to the Passwala ecosystem.
                </p>
              </div>

              {/* Summary Card */}
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 space-y-6">
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  <div className="w-full sm:w-44 h-28 rounded-2xl overflow-hidden bg-slate-200 shrink-0">
                    <img src={bannerUrl} alt="Cover" className="w-full h-full object-cover" />
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-600 text-white uppercase">
                        {category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-700 uppercase">
                        {showType === 'tour' ? 'Festival / Tour' : showType === 'multiple' ? 'Multiple Shows' : 'Single Show'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-green-100 text-green-700 uppercase">
                        {visibility}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-slate-900">{title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{description || 'No description provided.'}</p>
                  </div>
                </div>

                {/* Show Details Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[10px]">Setup Model</span>
                    <span className="font-extrabold text-slate-900">
                      {showType === 'tour' ? 'Festival / Tour' : showType === 'multiple' ? 'Multiple Shows' : 'Single Show'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[10px]">Duration</span>
                    <span className="font-extrabold text-slate-900">{duration || '2h 30m'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[10px]">Language</span>
                    <span className="font-extrabold text-slate-900">{language || 'Hindi / English'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[10px]">Age Restriction</span>
                    <span className="font-extrabold text-slate-900">{ageRestriction || 'All Ages'}</span>
                  </div>
                </div>

                {/* Schedule Shows Summary */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    {showType === 'single' ? 'Scheduled Show' : `Scheduled Show Dates (${scheduleSlots.length} Shows)`}
                  </h4>

                  {showType === 'single' ? (
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-600" />
                        <span>{singleDate ? new Date(singleDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'}</span>
                        <span className="text-slate-400">({singleStarts} - {singleEnds})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{isOnline ? 'Online Event' : (venueName || 'Passwala Arena')}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {scheduleSlots.map((slot, sIdx) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-extrabold flex items-center justify-center">
                              {sIdx + 1}
                            </span>
                            <span>
                              {slot.date
                                ? new Date(slot.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                                : 'Date not set'}
                            </span>
                            <span className="text-slate-400">({slot.starts} - {slot.ends})</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{slot.venue_name || venueName || 'Passwala Arena'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ticket Tiers Summary */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Configured Ticket Tiers ({ticketTiers.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ticketTiers.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{t.tier_name}</div>
                          <div className="text-[11px] text-slate-400 font-semibold">
                            Capacity: {t.total_seats} seats / show
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-orange-600">
                            {Number(t.price) === 0 ? 'FREE' : `₹${t.price}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Final Submit / Back */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  ← Back to Details
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-10 py-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm shadow-lg shadow-orange-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Publishing to Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Publish {showType === 'tour' ? 'Festival & Tour' : showType === 'multiple' ? 'Multiple Shows' : 'Single Show'} Live
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
