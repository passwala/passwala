'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVendor, BusinessType } from '@/lib/vendor-context';
import { supabase } from '@/lib/supabase-client';
import { formatAadhar } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { 
  Trophy, 
  Ticket, 
  Store, 
  Wrench, 
  Car, 
  ArrowRight, 
  CheckCircle2, 
  MapPin, 
  Building2, 
  User, 
  ShieldCheck, 
  Loader2 
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { vendor, refreshVendor, setBusinessType } = useVendor();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState(vendor?.name || '');
  const [aadharNo, setAadharNo] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setSelectedBusinessType] = useState<BusinessType>('sports');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Ahmedabad');

  const businessTypes: { id: BusinessType; title: string; desc: string; icon: any; popular?: boolean }[] = [
    {
      id: 'sports',
      title: 'Sports Venue / Turf',
      desc: 'Box cricket, football turfs, badminton & tennis courts with hourly slot booking.',
      icon: Trophy,
      popular: true
    },
    {
      id: 'event',
      title: 'Event Organizer',
      desc: 'Music concerts, comedy shows, workshops, exhibitions & festival passes.',
      icon: Ticket,
      popular: true
    },
    {
      id: 'shop',
      title: 'Local Retail & Grocery',
      desc: 'Neighborhood convenience stores, supermarkets, essentials with delivery dispatch.',
      icon: Store
    },
    {
      id: 'service',
      title: 'Home & Expert Services',
      desc: 'AC technicians, cleaning, plumbing, electricians, car detailing & repairs.',
      icon: Wrench
    },
    {
      id: 'rental',
      title: 'Equipments & Rentals',
      desc: 'Party speakers, camera gears, sports kits, wedding decor & vehicles.',
      icon: Car
    }
  ];

  const handleCompleteOnboarding = async () => {
    if (!businessName.trim()) {
      toast.error('Please enter your business or venue name');
      return;
    }
    if (!address.trim()) {
      toast.error('Please enter your area or address (e.g. Paldi, Sindhu Bhavan)');
      return;
    }

    setLoading(true);
    try {
      const phone = vendor?.phone || localStorage.getItem('vPhone') || '9999999999';

      // 1. Update users table with full name
      if (vendor?.id) {
        try {
          await supabase
            .from('users')
            .update({ name: fullName, full_name: fullName, role: 'VENDOR' })
            .eq('phone', phone);
        } catch {
          // non-blocking
        }
      }

      // 2. Create store in stores table
      const { data: storeData, error: storeErr } = await supabase
        .from('stores')
        .insert({
          owner_id: vendor?.id || null,
          business_name: businessName,
          name: businessName,
          business_type: businessType,
          address: address,
          city: city || 'Ahmedabad',
          phone: phone,
          status: 'approved',
          is_active: true,
        })
        .select()
        .single();

      if (storeErr) {
        console.warn('Store insertion warning:', storeErr.message);
      }

      // 3. If sports, create default entry in sports_venues
      if (businessType === 'sports') {
        try {
          await supabase
            .from('sports_venues')
            .insert({
              name: businessName,
              address: address,
              city: city || 'Ahmedabad',
              owner_phone: phone,
              owner_id: storeData?.id || vendor?.id,
              owner_name: fullName,
              sport_types: ['box_cricket'],
              price_per_hour: { box_cricket: 400 },
              status: 'approved',
              slot_duration_mins: 60,
            });
        } catch (err: any) {
          console.warn('Sports venue insertion warning:', err);
        }
      }

      // Save local status
      setBusinessType(businessType);
      localStorage.setItem('vProfileCompleted', 'true');
      localStorage.setItem('vBusinessName', businessName);
      localStorage.setItem('vAddress', address);
      localStorage.setItem('vCity', city);

      await refreshVendor();
      toast.success('Partner profile setup successfully!');
      router.replace('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Setup error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center selection:bg-orange-500 selection:text-white">
      <div className="max-w-2xl mx-auto w-full">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-center gap-2.5">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${step >= 1 ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              1
            </span>
            <span className={`text-xs font-bold ${step >= 1 ? 'text-slate-900' : 'text-slate-500'}`}>Partner KYC</span>
          </div>
          <div className={`flex-1 h-0.5 mx-3 sm:mx-4 ${step >= 2 ? 'bg-orange-600' : 'bg-slate-200'}`} />
          <div className="flex items-center gap-2.5">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${step >= 2 ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              2
            </span>
            <span className={`text-xs font-bold ${step >= 2 ? 'text-slate-900' : 'text-slate-500'}`}>Business Details</span>
          </div>
          <div className={`flex-1 h-0.5 mx-3 sm:mx-4 ${step >= 3 ? 'bg-orange-600' : 'bg-slate-200'}`} />
          <div className="flex items-center gap-2.5">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${step >= 3 ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              3
            </span>
            <span className={`text-xs font-bold ${step >= 3 ? 'text-slate-900' : 'text-slate-500'}`}>Console Type</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/50">
          {/* STEP 1: Owner Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Owner & KYC Verification</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Enter your official identity details for payouts and RBI merchant compliance.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Full Name (As per Aadhar / PAN)
                  </label>
                  <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 px-4 py-3.5 transition-all">
                    <User className="w-4 h-4 text-slate-400 mr-3" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Karan Patel"
                      className="bg-transparent flex-1 text-sm text-slate-900 font-semibold placeholder:text-slate-400 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Aadhar Card Number (12 Digits)
                  </label>
                  <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 px-4 py-3.5 transition-all">
                    <ShieldCheck className="w-4 h-4 text-slate-400 mr-3" />
                    <input
                      type="text"
                      maxLength={14}
                      value={aadharNo}
                      onChange={(e) => setAadharNo(formatAadhar(e.target.value))}
                      placeholder="XXXX XXXX XXXX"
                      className="bg-transparent flex-1 text-sm text-slate-900 font-mono font-bold placeholder:text-slate-400 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">Used only for identity verification and payout fraud prevention.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!fullName.trim()) {
                    toast.error('Please enter your full name');
                    return;
                  }
                  setStep(2);
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/20 transition-all cursor-pointer"
              >
                <span>Continue to Business Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: Business Details */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Business & Venue Location</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Tell your customers what your business is called and where it is located.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Business / Turf / Event Company Name *
                  </label>
                  <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 px-4 py-3.5 transition-all">
                    <Building2 className="w-4 h-4 text-slate-400 mr-3" />
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Apex Box Cricket & Arena"
                      className="bg-transparent flex-1 text-sm text-slate-900 font-semibold placeholder:text-slate-400 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Area / Locality / Address *
                  </label>
                  <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 px-4 py-3.5 transition-all">
                    <MapPin className="w-4 h-4 text-slate-400 mr-3" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Paldi, Sindhu Bhavan Road, Bodakdev..."
                      className="bg-transparent flex-1 text-sm text-slate-900 font-semibold placeholder:text-slate-400 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    This area name is shown directly to customers on sports cards and event listings.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 px-4 py-3.5 text-sm text-slate-900 font-semibold outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-sm transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!businessName.trim()) {
                      toast.error('Please enter business name');
                      return;
                    }
                    if (!address.trim()) {
                      toast.error('Please enter your area name / address');
                      return;
                    }
                    setStep(3);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/20 transition-all cursor-pointer"
                >
                  <span>Select Business Console</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Business Type / Console Selection */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Select Primary Console</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Choose your business type. You can easily add more consoles later.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {businessTypes.map((bt) => {
                  const Icon = bt.icon;
                  const isSelected = businessType === bt.id;
                  return (
                    <div
                      key={bt.id}
                      onClick={() => setSelectedBusinessType(bt.id)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
                        isSelected 
                          ? 'border-orange-500 bg-orange-50/70 text-slate-900 shadow-xs' 
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className={`p-3 rounded-xl shrink-0 ${isSelected ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900">{bt.title}</h4>
                          {bt.popular && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{bt.desc}</p>
                      </div>
                      <div className="mt-1">
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-orange-600" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-sm transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCompleteOnboarding}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete Setup & Launch Dashboard'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
