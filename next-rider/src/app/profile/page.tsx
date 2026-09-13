'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  UserCircle,
  Bike,
  ShieldCheck,
  Star,
  FileText,
  Phone,
  LogOut,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  Headphones
} from 'lucide-react';
import { useRider } from '../../lib/rider-context';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const { rider, logout } = useRider();
  const [showSosModal, setShowSosModal] = useState(false);

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out of Passwala Rider?')) {
      logout();
      toast.success('Logged out successfully');
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 p-0.5 shadow-md shadow-orange-500/20 shrink-0">
              <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center text-orange-600">
                <Bike className="w-9 h-9" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">
                  {rider?.name || 'Passwala Partner'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  KYC Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                +91 {rider?.phone || '9876543210'} • Shift Area: Satellite, Ahmedabad
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <div>
                <span className="text-sm font-black text-slate-900 block">
                  {rider?.rating?.toFixed(2) || '4.92'}
                </span>
                <span className="text-[10px] text-slate-500">Rider Rating</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2">
              <span className="text-sm font-black text-emerald-700 block">
                {rider?.total_deliveries || 148}
              </span>
              <span className="text-[10px] text-slate-500">All-time Trips</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Details */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Bike className="w-4 h-4 text-orange-600" />
          Registered Vehicle
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <span className="text-xs text-slate-500 font-bold block mb-1">
              Vehicle Registration No.
            </span>
            <span className="text-base font-black text-slate-900 font-mono">
              {rider?.vehicle_no || 'GJ 01 AB 8842'}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <span className="text-xs text-slate-500 font-bold block mb-1">
              Vehicle Class
            </span>
            <span className="text-base font-black text-emerald-700">
              {rider?.vehicle_type || 'EV Scooter (Eco Delivery)'}
            </span>
          </div>
        </div>
      </div>

      {/* Verified KYC Documents */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            Verified Government KYC Documents
          </h3>
          <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved
          </span>
        </div>

        <div className="space-y-3">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-bold block mb-0.5">
                Driving License Number
              </span>
              <span className="text-sm font-black text-slate-900 font-mono">
                {rider?.license_no || 'GJ01 20210084920'}
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full">
              Valid until 2035
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-bold block mb-0.5">
                Aadhaar / National ID Proof
              </span>
              <span className="text-sm font-black text-slate-900 font-mono">
                •••• •••• {rider?.id_proof?.slice(-4) || '1102'}
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full">
              Identity Verified
            </span>
          </div>
        </div>
      </div>

      {/* Safety & Emergency SOS */}
      <div className="bg-red-50 border border-red-200 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <span className="text-xs font-black text-red-600 uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-4 h-4" />
              Rider Safety & Emergency Support
            </span>
            <h3 className="text-base font-black text-slate-900">
              24x7 Passwala Rider Emergency Hotline
            </h3>
            <p className="text-xs text-slate-600 mt-1 max-w-lg">
              In case of accident, roadside breakdown, or emergency, tap Emergency SOS to dispatch support and contact authorities immediately.
            </p>
          </div>

          <button
            onClick={() => setShowSosModal(true)}
            className="py-3 px-5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider transition shadow-md shadow-red-600/20 shrink-0 cursor-pointer"
          >
            Emergency SOS
          </button>
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-white border border-slate-200 rounded-3xl p-3 space-y-1 shadow-xs">
        <Link
          href="/login"
          className="w-full py-3.5 px-4 rounded-2xl hover:bg-slate-50 text-slate-800 text-sm font-bold flex items-center justify-between transition"
        >
          <div className="flex items-center gap-3">
            <UserCircle className="w-5 h-5 text-orange-600" />
            <span>Switch / Login with another mobile number</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          href="/onboarding"
          className="w-full py-3.5 px-4 rounded-2xl hover:bg-slate-50 text-slate-800 text-sm font-bold flex items-center justify-between transition"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>Update Vehicle & KYC Documents</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>

        <button
          onClick={handleLogout}
          className="w-full py-3.5 px-4 rounded-2xl hover:bg-red-50 text-red-600 text-sm font-bold flex items-center justify-between transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5 text-red-600" />
            <span>Log Out of Rider Portal</span>
          </div>
          <ChevronRight className="w-4 h-4 text-red-300" />
        </button>
      </div>

      {/* SOS Modal */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white border-2 border-red-500 rounded-3xl p-6 shadow-2xl text-slate-900 relative text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-1">
              Trigger Emergency Alert?
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              This will immediately send your current GPS coordinates to Ahmedabad Passwala Control Room and initiate a call to 112 emergency services.
            </p>

            <div className="space-y-3">
              <a
                href="tel:112"
                className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-red-600/20 transition block"
              >
                <Phone className="w-4 h-4" />
                Call Police & Ambulance (112)
              </a>

              <a
                href="tel:+919876500000"
                className="w-full py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-sm flex items-center justify-center gap-2 transition block border border-slate-200"
              >
                <Headphones className="w-4 h-4" />
                Call Passwala Control Room
              </a>

              <button
                onClick={() => setShowSosModal(false)}
                className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
              >
                Dismiss & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
