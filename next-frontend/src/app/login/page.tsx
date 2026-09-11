'use client';

import { useEffect } from 'react';
import { useAuthContext } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { openLogin, user } = useAuthContext();
  const router = useRouter();
  
  useEffect(() => {
    if (user) { 
      router.replace('/'); 
      return; 
    }
    router.replace('/');
    setTimeout(() => openLogin(), 100);
  }, [user, router, openLogin]);

  return null;
}
