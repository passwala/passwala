'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useVendor } from '@/lib/vendor-context';
import { toast } from 'react-hot-toast';
import { 
  Settings, 
  Store, 
  MapPin, 
  Phone, 
  Save, 
  ShieldCheck, 
  Building2 
} from 'lucide-react';

export default function SettingsPage() {
  const { vendor, store } = useVendor();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [businessName, setBusinessName] = useState(store?.business_name || store?.name || 'My Business');
  const [address, setAddress] = useState(store?.address || 'Paldi, Ahmedabad');
  const [city, setCity] = useState(store?.city || 'Ahmedabad');
  const [phone, setPhone] = useState(vendor?.phone || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('vBusinessName', businessName);
    localStorage.setItem('vAddress', address);
    localStorage.setItem('vCity', city);
    toast.success('Business settings updated successfully!');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-orange-500">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Business Settings" />

        <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6">
          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 md:p-10 shadow-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">Store & Partner Profile</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Configure your business name, area address and customer contact details.
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Business / Venue Name
                </label>
                <div className="flex items-center rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3 focus-within:border-orange-500">
                  <Building2 className="w-4 h-4 text-zinc-500 mr-3" />
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="bg-transparent flex-1 text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Area / Locality Address
                </label>
                <div className="flex items-center rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3 focus-within:border-orange-500">
                  <MapPin className="w-4 h-4 text-zinc-500 mr-3" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="bg-transparent flex-1 text-sm text-white outline-none"
                  />
                </div>
                <p className="text-[11px] text-zinc-500">Shown to buyers on venue cards and tickets.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Registered WhatsApp Number
                  </label>
                  <div className="flex items-center rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3 opacity-80">
                    <Phone className="w-4 h-4 text-zinc-500 mr-3" />
                    <input
                      type="text"
                      disabled
                      value={`+91 ${phone}`}
                      className="bg-transparent flex-1 text-sm text-zinc-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
