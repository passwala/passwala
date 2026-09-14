'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, ChevronDown, Phone } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from '@/lib/language-context';

export default function HelpPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    { 
      id: 1, 
      q: t('faq_1_q', 'How do I book an event ticket?'), 
      a: t('faq_1_a', "Select the event from the home page, pick your ticket tier, and tap 'Book Now'. You'll get an instant E-Ticket with a QR code.") 
    },
    { 
      id: 2, 
      q: t('faq_2_q', 'Can I cancel my sports venue booking?'), 
      a: t('faq_2_a', 'Yes, cancellations are allowed up to 4 hours before the slot time. Go to My Bookings, select the sports booking, and tap Cancel.') 
    },
    { 
      id: 3, 
      q: t('faq_3_q', 'Where do I find my downloaded invoices?'), 
      a: t('faq_3_a', 'Go to My Bookings -> Event Tickets and click the Download icon next to any confirmed ticket.') 
    },
    { 
      id: 4, 
      q: t('faq_4_q', 'How does the Passwala Wallet work?'), 
      a: t('faq_4_a', 'You can load money into your Wallet for faster 1-tap checkouts. Cashbacks and refund credits are also added directly to your wallet.') 
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <Toaster position="top-center" />
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur z-50 border-b p-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">{t('help_and_support', 'Help & Support')}</h1>
      </div>

      <div className="container max-w-md mx-auto p-4 space-y-6">
        
        {/* FAQs */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-1">
            {t('top_questions', 'Top Questions')}
          </h2>
          <div className="space-y-3">
            {faqs.map(faq => (
              <Card 
                key={faq.id} 
                className={`overflow-hidden rounded-2xl border-0 shadow-sm cursor-pointer transition-all ${activeFaq === faq.id ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
              >
                <div className="p-4 flex items-center justify-between font-bold text-sm">
                  {faq.q}
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${activeFaq === faq.id ? 'rotate-180 text-primary' : ''}`} />
                </div>
                {activeFaq === faq.id && (
                  <div className="px-4 pb-4 text-sm text-muted-foreground animate-in fade-in slide-in-from-top-2">
                    {faq.a}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="pt-4">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-1">
            {t('still_need_help', 'Still need help?')}
          </h2>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full h-14 rounded-2xl justify-start px-4 border-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/50 cursor-pointer"
              onClick={() => {
                toast.success('Connecting to WhatsApp support...');
                window.open('https://wa.me/919876543210?text=Hello%20Passwala%20Support,%20I%20need%20help', '_blank');
              }}
            >
              <div className="h-8 w-8 bg-emerald-500 text-white rounded-full flex items-center justify-center mr-3 shrink-0">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-emerald-800 dark:text-emerald-200">{t('whatsapp_support', 'WhatsApp Support')}</p>
                <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80">{t('whatsapp_timing', 'Typically replies in 2 mins')}</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full h-14 rounded-2xl justify-start px-4 border-2 cursor-pointer hover:bg-muted"
              onClick={() => {
                window.location.href = 'tel:+919876543210';
              }}
            >
              <div className="h-8 w-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center mr-3 shrink-0">
                <Phone className="h-4 w-4" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold">{t('call_us', 'Call Us')}</p>
                <p className="text-[10px] text-muted-foreground">{t('call_timing', 'Mon-Sat, 9am - 8pm')}</p>
              </div>
            </Button>
          </div>
        </section>

      </div>
    </div>
  );
}
