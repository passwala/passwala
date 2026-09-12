'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, FileText, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '@/lib/language-context';

export default function TermsPage() {
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
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {t('footer_terms', 'Terms of Service')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: September 2026 • Effective immediately
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <section className="p-6 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-foreground">1. Introduction & Acceptance</h2>
          <p>
            Welcome to Passwala (&quot;Platform&quot;, &quot;we&quot;, &quot;our&quot;, &quot;us&quot;). By accessing, browsing, or using our web applications, portals, and mobile experiences, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-foreground">2. Services & Bookings</h2>
          <p>
            Passwala provides a hyper-local marketplace platform connecting users with local events, sports turf bookings, mobility rides, and community vendor experiences.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li><strong>Event Tickets:</strong> All ticket bookings are confirmed upon successful payment verification. E-tickets are verifiable via cryptographic QR codes.</li>
            <li><strong>Sports Venues:</strong> Slot bookings are subject to venue operating hours and court rules. Please arrive 10 minutes prior to slot start time.</li>
            <li><strong>Pricing & Taxes:</strong> Displayed prices include breakdown of applicable taxes (GST) and nominal platform processing fees.</li>
          </ul>
        </section>

        <section className="p-6 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-foreground">3. User Conduct & Security</h2>
          <p>
            You agree to provide accurate phone and contact details during verification. Duplicating, scalping, or fraudulently altering generated tickets or QR passes will result in immediate permanent suspension and legal reporting.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-foreground">4. Cancellations & Refunds</h2>
          <p>
            Event organizer cancellation policies vary per event and are noted on checkout. In the event of organizer cancellation, 100% ticket base value will be promptly refunded to your original payment method or Passwala Wallet.
          </p>
        </section>

        <section className="p-6 rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-foreground">5. Contact Information</h2>
          <p>
            If you have questions regarding these terms, please reach out via our Help Center or contact our support team at <a href="mailto:support@passwala.com" className="text-primary underline">support@passwala.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
