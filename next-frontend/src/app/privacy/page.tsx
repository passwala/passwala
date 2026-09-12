'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, EyeOff } from 'lucide-react';
import { useTranslation } from '@/lib/language-context';

export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 md:px-8 py-10 max-w-4xl min-h-screen">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('back', 'Back to Home')}
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {t('footer_privacy', 'Privacy Policy')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: September 2026 • We respect and protect your privacy
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <section className="p-6 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-500" />
            1. Information We Collect
          </h2>
          <p>
            When you use Passwala, we collect only essential information required to issue valid booking passes and deliver quality services:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li><strong>Account & Contact:</strong> Mobile number, email, and name provided during OTP authentication.</li>
            <li><strong>Booking Records:</strong> Tickets purchased, venues booked, and dates/times of attendance.</li>
            <li><strong>Location Data:</strong> Approximate city or geolocation (with your permission) to show nearby events and sports grounds.</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-primary" />
            2. How We Protect Your Data
          </h2>
          <p>
            We implement strict encryption protocols (AES-256 and SSL/TLS) for data at rest and in transit. Payment card and banking details are processed directly by certified RBI-compliant payment gateways (e.g., Razorpay) and are never stored on our servers.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-foreground">3. Data Sharing & Third Parties</h2>
          <p>
            Passwala never sells your personal data. Information is shared strictly with verified event organizers or venue managers solely for admission verification via QR codes.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-foreground">4. Data Deletion & Privacy Rights</h2>
          <p>
            You retain complete control over your account. You can request full data deletion or export your profile at any time by contacting our data privacy officer at <a href="mailto:privacy@passwala.com" className="text-primary underline">privacy@passwala.com</a> or submitting a request via our Help & Support center.
          </p>
        </section>
      </div>
    </div>
  );
}
