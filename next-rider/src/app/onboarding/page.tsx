'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bike,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Check
} from 'lucide-react';
import { useRider } from '../../lib/rider-context';
import { toast } from 'react-hot-toast';

export default function OnboardingPage() {
  const router = useRouter();
  const { rider, login } = useRider();

  const [name, setName] = useState(rider?.name || '');
  const [phone, setPhone] = useState(rider?.phone || '');
  const [vehicleType, setVehicleType] = useState(rider?.vehicle_type || 'EV Scooter');
  const [vehicleNo, setVehicleNo] = useState(rider?.vehicle_no || '');
  const [licenseNo, setLicenseNo] = useState(rider?.license_no || '');
  const [idProof, setIdProof] = useState(rider?.id_proof || '');
  const [submitting, setSubmitting] = useState(false);

  const vehicleOptions = [
    { id: 'EV Scooter', label: 'EV Scooter', sub: 'Zero emission • Eco delivery' },
    { id: 'Motorcycle', label: 'Motorcycle', sub: 'Petrol bike • 100cc+' },
    { id: 'Scooter', label: 'Gearless Scooter', sub: 'Activa / Jupiter / Access' },
    { id: 'Bicycle', label: 'Bicycle', sub: 'Short distance local hubs' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !vehicleNo) {
      toast.error('Please fill in all mandatory vehicle details.');
      return;
    }

    setSubmitting(true);
    try {
      await login(phone, name);
      toast.success('Partner Profile & KYC Updated Successfully!');
      router.push('/');
    } catch (err) {
      toast.error('Failed to submit onboarding profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-orange-600 block mb-1">
            Partner Registration & KYC
          </span>
          <h2 className="text-2xl font-black text-slate-900">
            Rider Vehicle & Document Verification
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ensure your details match your government ID and vehicle registration certificate.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Personal Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Full Name (As per Aadhaar/License)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikram Patel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="10-digit mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Selection */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Bike className="w-4 h-4 text-orange-600" />
              Select Vehicle Class
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {vehicleOptions.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setVehicleType(opt.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    vehicleType === opt.id
                      ? 'bg-orange-50 border-orange-500 text-slate-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold">{opt.label}</span>
                    {vehicleType === opt.id && (
                      <Check className="w-4 h-4 text-orange-600" />
                    )}
                  </div>
                  <span className="text-xs text-slate-500 block mt-1">{opt.sub}</span>
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Vehicle Registration Number (Number Plate)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. GJ 01 AB 8842"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Document Details */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Driver License & National ID
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Driving License Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GJ01 20210084920"
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value.toUpperCase())}
                  className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Aadhaar Card / PAN Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4820 9283 1102"
                  value={idProof}
                  onChange={(e) => setIdProof(e.target.value.toUpperCase())}
                  className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-mono focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm tracking-wide transition shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Submit Verification & Complete KYC</span>
          </button>
        </form>
      </div>
    </div>
  );
}
