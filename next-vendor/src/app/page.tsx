'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useVendor } from '@/lib/vendor-context';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { vendor, isOnboarded, loading } = useVendor();

  useEffect(() => {
    if (!loading) {
      if (!vendor) {
        router.replace('/login');
      } else if (!isOnboarded) {
        router.replace('/onboarding');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [vendor, isOnboarded, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white gap-3">
      <div className="w-12 h-12 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center p-2">
        <img src="/logo.png" alt="Passwala Logo" className="w-full h-full object-contain" />
      </div>
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
        <span>Loading Passwala Partner Suite...</span>
      </div>
    </div>
  );
}
