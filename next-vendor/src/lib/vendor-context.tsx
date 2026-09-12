'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase-client';

export type BusinessType = 'sports' | 'event' | 'shop' | 'service' | 'rental';

export interface VendorUser {
  id: string;
  user_id?: string;
  phone: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
}

export interface VendorStore {
  id: string;
  vendor_id?: string;
  business_name?: string;
  name?: string;
  business_type?: BusinessType;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  status?: string;
  is_active?: boolean;
}

interface VendorContextType {
  vendor: VendorUser | null;
  store: VendorStore | null;
  businessType: BusinessType;
  setBusinessType: (type: BusinessType) => void;
  login: (phone: string, profile?: any) => Promise<void>;
  logout: () => void;
  refreshVendor: () => Promise<void>;
  loading: boolean;
  isOnboarded: boolean;
}

const VendorContext = createContext<VendorContextType | null>(null);

export const VendorProvider = ({ children }: { children: React.ReactNode }) => {
  const [vendor, setVendor] = useState<VendorUser | null>(null);
  const [store, setStore] = useState<VendorStore | null>(null);
  const [businessType, setBusinessTypeState] = useState<BusinessType>('sports');
  const [loading, setLoading] = useState(true);

  const setBusinessType = (type: BusinessType) => {
    setBusinessTypeState(type);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vBusinessType', type);
    }
  };

  const loadVendorData = async (phone: string) => {
    try {
      const clean = phone.replace(/\D/g, '').slice(-10);
      
      // 1. Fetch user record from users table
      const { data: userRecord } = await supabase
        .from('users')
        .select('*')
        .or(`phone.eq.${clean},phone.eq.+91${clean}`)
        .maybeSingle();

      const resolvedUser: VendorUser = {
        id: userRecord?.id || 'vendor_' + clean,
        user_id: userRecord?.id,
        phone: clean,
        name: userRecord?.name || userRecord?.full_name || 'Vendor Partner',
        email: userRecord?.email,
        role: userRecord?.role || 'VENDOR',
      };
      setVendor(resolvedUser);

      // 2. Fetch store / vendor profile
      const { data: storeRecord } = await supabase
        .from('stores')
        .select('*')
        .or(`phone.eq.${clean},owner_id.eq.${resolvedUser.id}`)
        .maybeSingle();

      if (storeRecord) {
        setStore(storeRecord);
        if (storeRecord.business_type) {
          setBusinessTypeState(storeRecord.business_type as BusinessType);
        }
      } else {
        // Check sports_venues via /api/venues (or backend API)
        try {
          const res = await fetch(`/api/venues?phone=${clean}`);
          const resData = await res.json();
          const venueRecord = resData?.venues?.[0];

          if (venueRecord) {
            setStore({
              id: venueRecord.id,
              business_name: venueRecord.name,
              name: venueRecord.name,
              business_type: 'sports',
              address: venueRecord.address,
              city: venueRecord.city,
              phone: clean,
              status: venueRecord.status || 'approved'
            });
            setBusinessTypeState('sports');
          }
        } catch (venueErr) {
          console.warn('Venue lookup error:', venueErr);
        }
      }
    } catch (e) {
      console.error('Error loading vendor data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedPhone = localStorage.getItem('vPhone');
    const savedType = localStorage.getItem('vBusinessType') as BusinessType;
    if (savedType) {
      setBusinessTypeState(savedType);
    }

    if (savedPhone) {
      loadVendorData(savedPhone);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (phone: string, profile?: any) => {
    const clean = phone.replace(/\D/g, '').slice(-10);
    localStorage.setItem('vPhone', clean);
    if (profile?.name) localStorage.setItem('vName', profile.name);
    await loadVendorData(clean);
  };

  const logout = () => {
    localStorage.removeItem('vPhone');
    localStorage.removeItem('vName');
    localStorage.removeItem('vFormData');
    localStorage.removeItem('vOnboardingStep');
    setVendor(null);
    setStore(null);
  };

  const refreshVendor = async () => {
    if (vendor?.phone) {
      await loadVendorData(vendor.phone);
    }
  };

  const isOnboarded = Boolean(store?.id || (vendor && localStorage.getItem('vProfileCompleted') === 'true'));

  return (
    <VendorContext.Provider
      value={{
        vendor,
        store,
        businessType,
        setBusinessType,
        login,
        logout,
        refreshVendor,
        loading,
        isOnboarded,
      }}
    >
      {children}
    </VendorContext.Provider>
  );
};

export const useVendor = () => {
  const ctx = useContext(VendorContext);
  if (!ctx) throw new Error('useVendor must be used within a VendorProvider');
  return ctx;
};
