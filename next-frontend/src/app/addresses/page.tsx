'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Home, Briefcase, Building2, Plus, Trash2, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from '@/lib/language-context';

export default function AddressesPage() {
  const { user, loading: authLoading } = useAuthContext();
  const { t } = useTranslation();
  const router = useRouter();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/'); return; }

    const fetchAddresses = async () => {
      setDataLoading(true);
      try {
        let userId = user.id;

        if (!userId || userId.length !== 36) {
          const phoneClean = user.phone?.replace(/\D/g, '') || user.phoneNumber?.replace(/\D/g, '');
          const orList = [];
          if (user.uid) orList.push(`uid.eq.${user.uid}`);
          if (user.email) orList.push(`email.eq.${user.email}`);
          if (phoneClean) orList.push(`phone.eq.${phoneClean}`, `phone.eq.+91${phoneClean}`);
          
          if (orList.length > 0) {
            const { data } = await supabase.from('users').select('id').or(orList.join(',')).maybeSingle();
            if (data) userId = data.id;
          }
        }

        if (!userId) { setDataLoading(false); return; }

        const { data } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', userId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });
        
        if (data) setAddresses(data);
      } catch (err) {
        console.error(err);
      } finally {
        setDataLoading(false);
      }
    };

    fetchAddresses();
  }, [user, authLoading, router]);

  const deleteAddress = async (id: string) => {
    try {
      const { error } = await supabase.from('addresses').delete().eq('id', id);
      if (error) throw error;
      setAddresses(prev => prev.filter(a => a.id !== id));
      toast.success(t('address_deleted', 'Address deleted'));
    } catch (e: any) {
      toast.error('Could not delete address');
    }
  };

  const getIcon = (label: string) => {
    switch (label) {
      case 'Home': return <Home className="h-5 w-5 text-orange-500" />;
      case 'Office': return <Briefcase className="h-5 w-5 text-indigo-500" />;
      case 'PG': return <Building2 className="h-5 w-5 text-emerald-500" />;
      default: return <MapPin className="h-5 w-5 text-amber-500" />;
    }
  };

  const getLabelText = (label: string) => {
    switch (label) {
      case 'Home': return t('addr_home', 'Home');
      case 'Office': return t('addr_office', 'Office');
      case 'PG': return t('addr_pg', 'PG');
      default: return label || t('addr_other', 'Other');
    }
  };

  if (authLoading || dataLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Toaster position="top-center" />
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur z-50 border-b p-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">{t('saved_addresses_title', 'Saved Addresses')}</h1>
      </div>

      <div className="container max-w-md mx-auto p-4 space-y-4">
        {addresses.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-3xl border border-dashed mt-8">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-lg font-bold">{t('no_saved_addresses', 'No Saved Addresses')}</h3>
            <p className="text-muted-foreground text-sm">{t('no_addresses_sub', 'Add an address for quick checkout.')}</p>
          </div>
        ) : (
          addresses.map(addr => (
            <Card key={addr.id} className={`p-4 rounded-2xl border-2 ${addr.is_default ? 'border-primary shadow-sm bg-primary/5' : 'border-transparent shadow-sm'}`}>
              <div className="flex gap-4">
                <div className="mt-1">{getIcon(addr.label)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold">{getLabelText(addr.label)}</h3>
                    {addr.is_default && <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{t('default_badge', 'DEFAULT')}</span>}
                  </div>
                  <p className="text-sm font-medium">{addr.house_no}, {addr.house_name}</p>
                  <p className="text-sm text-muted-foreground">{addr.society}, {addr.landmark}</p>
                  <p className="text-sm text-muted-foreground">{addr.city} - {addr.pincode}</p>
                </div>
                <button onClick={() => deleteAddress(addr.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-xl h-fit">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </Card>
          ))
        )}

        <Button className="w-full h-14 rounded-2xl font-bold text-lg mt-8 shadow-sm flex gap-2">
          <Plus className="h-6 w-6" /> {t('add_new_address', 'Add New Address')}
        </Button>
      </div>
    </div>
  );
}
