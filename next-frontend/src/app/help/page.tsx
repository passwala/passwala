'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, ChevronDown, Phone, Mail } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const FAQS = [
  { 
    id: 1, 
    q: "How do I book an event ticket?", 
    a: "Select the event from the home page, pick your ticket tier, and tap 'Book Now'. You'll get an instant E-Ticket with a QR code." 
  },
  { 
    id: 2, 
    q: "Can I cancel my sports venue booking?", 
    a: "Yes, cancellations are allowed up to 4 hours before the slot time. Go to My Bookings, select the sports booking, and tap Cancel." 
  },
  { 
    id: 3, 
    q: "Where do I find my downloaded invoices?", 
    a: "Go to My Bookings -> Event Tickets and click the Download icon next to any confirmed ticket." 
  },
  { 
    id: 4, 
    q: "How does the Passwala Wallet work?", 
    a: "You can load money into your Wallet for faster 1-tap checkouts. Cashbacks and refund credits are also added directly to your wallet." 
  }
];

export default function HelpPage() {
  const router = useRouter();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Toaster position="top-center" />
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur z-50 border-b p-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">Help & Support</h1>
      </div>

      <div className="container max-w-md mx-auto p-4 space-y-6">
        
        {/* FAQs */}
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-1">Top Questions</h2>
          <div className="space-y-3">
            {FAQS.map(faq => (
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
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-1">Still need help?</h2>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full h-14 rounded-2xl justify-start px-4 border-2 border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
              onClick={() => toast('Opening WhatsApp...', { icon: '💬' })}
            >
              <div className="h-8 w-8 bg-emerald-500 text-white rounded-full flex items-center justify-center mr-3 shrink-0">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold text-emerald-700">WhatsApp Support</p>
                <p className="text-[10px] text-emerald-600/80">Typically replies in 2 mins</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full h-14 rounded-2xl justify-start px-4 border-2"
              onClick={() => toast('Calling Support...')}
            >
              <div className="h-8 w-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center mr-3 shrink-0">
                <Phone className="h-4 w-4" />
              </div>
              <div className="text-left flex-1">
                <p className="font-bold">Call Us</p>
                <p className="text-[10px] text-muted-foreground">Mon-Sat, 9am - 8pm</p>
              </div>
            </Button>
          </div>
        </section>

      </div>
    </div>
  );
}
