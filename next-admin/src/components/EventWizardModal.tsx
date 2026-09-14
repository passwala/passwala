'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, Sparkles, MapPin, Calendar, Tag, ShieldCheck } from 'lucide-react';
import { adminApi } from '@/lib/api-client';
import { toast } from 'react-hot-toast';

interface TicketTier {
  name: string;
  price: number;
  total_seats: number;
}

interface EventWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  'Music Concert',
  'Standup Comedy',
  'Nightlife & Party',
  'Food & Drinks',
  'Workshop & Masterclass',
  'Business & Tech',
  'Sports & Fitness',
  'Theatre & Arts'
];

export function EventWizardModal({ isOpen, onClose, onSuccess }: EventWizardModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: CATEGORIES[0],
    venue_name: '',
    venue_lat: 23.0225,
    venue_lng: 72.5714,
    event_date: '',
    ends_at: '',
    banner_url: '',
    starting_price: 199,
    visibility: 'public',
    is_admin_organized: true,
  });

  const [tiers, setTiers] = useState<TicketTier[]>([
    { name: 'General Entry', price: 199, total_seats: 100 }
  ]);

  if (!isOpen) return null;

  const handleAddTier = () => {
    setTiers([...tiers, { name: 'VIP Pass', price: 499, total_seats: 50 }]);
  };

  const handleRemoveTier = (idx: number) => {
    if (tiers.length <= 1) {
      toast.error('Event must have at least one ticket tier');
      return;
    }
    setTiers(tiers.filter((_, i) => i !== idx));
  };

  const handleTierChange = (idx: number, field: keyof TicketTier, val: any) => {
    const updated = [...tiers];
    updated[idx] = { ...updated[idx], [field]: val };
    setTiers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.venue_name.trim() || !formData.event_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // 1. Create event
      const eventPayload = {
        ...formData,
        status: 'UPCOMING',
        starting_price: Math.min(...tiers.map(t => Number(t.price) || 0))
      };

      const eventRes = await adminApi.upsertRecord('events', eventPayload);
      const newEventId = eventRes?.data?.id;

      // 2. Insert ticket tiers if event was created
      if (newEventId && tiers.length > 0) {
        for (const tier of tiers) {
          await adminApi.upsertRecord('event_ticket_tiers', {
            event_id: newEventId,
            name: tier.name,
            price: Number(tier.price) || 0,
            total_seats: Number(tier.total_seats) || 50,
            available_seats: Number(tier.total_seats) || 50
          });
        }
      }

      toast.success('Event published successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Create Official Event</h2>
              <p className="text-xs font-semibold text-slate-500">Publish a new curated event to Passwala</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Event Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Ahmedabad Sunburn Arena 2026"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-medium text-slate-900 placeholder:text-slate-400 focus:border-purple-600 focus:outline-none"
            />
          </div>

          {/* Category & Visibility */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-bold text-slate-800 focus:border-purple-600 focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Visibility</label>
              <select
                value={formData.visibility}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-bold text-slate-800 focus:border-purple-600 focus:outline-none"
              >
                <option value="public">Public (Visible to All)</option>
                <option value="private">Private (Invite / Link Only)</option>
              </select>
            </div>
          </div>

          {/* Venue & Location */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Venue Name / Address *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. YMCA International Club, SG Highway"
                  value={formData.venue_name}
                  onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 font-medium text-slate-900 focus:border-purple-600 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Base Price (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.starting_price}
                onChange={(e) => setFormData({ ...formData, starting_price: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-bold text-slate-900 focus:border-purple-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Start Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-medium text-slate-900 focus:border-purple-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">End Date & Time</label>
              <input
                type="datetime-local"
                value={formData.ends_at}
                onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-medium text-slate-900 focus:border-purple-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Banner URL */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Banner Image URL</label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/photo-..."
              value={formData.banner_url}
              onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-medium text-slate-900 focus:border-purple-600 focus:outline-none"
            />
          </div>

          {/* Ticket Tiers */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900">Ticket Tiers</span>
              <button
                type="button"
                onClick={handleAddTier}
                className="flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1 font-bold text-purple-700 hover:bg-purple-50 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Tier</span>
              </button>
            </div>

            {tiers.map((tier, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Tier Name (e.g. VIP)"
                  value={tier.name}
                  onChange={(e) => handleTierChange(idx, 'name', e.target.value)}
                  className="flex-2 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-800 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Price (₹)"
                  value={tier.price}
                  onChange={(e) => handleTierChange(idx, 'price', Number(e.target.value))}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-800 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Seats"
                  value={tier.total_seats}
                  onChange={(e) => handleTierChange(idx, 'total_seats', Number(e.target.value))}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-800 focus:outline-none"
                />
                {tiers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTier(idx)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 font-black text-white hover:bg-purple-700 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              <span>{loading ? 'Publishing...' : 'Publish Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
