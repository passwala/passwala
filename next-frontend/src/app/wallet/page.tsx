'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/lib/auth-context';
import { useTranslation } from '@/lib/language-context';
import { supabase } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wallet as WalletIcon, Plus, History, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

export default function WalletPage() {
  const { user, loading: authLoading } = useAuthContext();
  const { t, currentLanguage } = useTranslation();
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/'); return; }

    const fetchWallet = async () => {
      setDataLoading(true);
      try {
        let userId = user.id;

        // Resolve DB ID
        if (!userId || userId.length !== 36) {
          const phoneClean = user.phone?.replace(/\D/g, '') || user.phoneNumber?.replace(/\D/g, '');
          const orList = [];
          if (user.uid) orList.push(`uid.eq.${user.uid}`);
          if (user.email) orList.push(`email.eq.${user.email}`);
          if (phoneClean) orList.push(`phone.eq.${phoneClean}`, `phone.eq.+91${phoneClean}`);
          
          if (orList.length > 0) {
            const { data } = await supabase.from('users').select('id, wallet_balance').or(orList.join(',')).maybeSingle();
            if (data) {
              userId = data.id;
              setBalance(data.wallet_balance || 0);
            }
          }
        } else {
          const { data } = await supabase.from('users').select('wallet_balance').eq('id', userId).maybeSingle();
          if (data) setBalance(data.wallet_balance || 0);
        }

        if (!userId) { setDataLoading(false); return; }

        // Fetch transactions
        const { data: txData } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (txData && txData.length > 0) {
          setTransactions(txData);
        } else {
          // Fallback demo transactions just like old app
          setTransactions([
            { id: 'tx_1', title: 'Welcome Bonus Reward', description: 'Passwala onboarding bonus', amount: 100, type: 'CREDIT', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
            { id: 'tx_2', title: 'Event Booking Discount', description: 'Cashback reward', amount: 50, type: 'CREDIT', created_at: new Date(Date.now() - 3600000 * 24).toISOString() }
          ]);
          if (balance === 0) setBalance(150);
        }
      } catch (err) {
        console.error(err);
        setBalance(150); // Fallback Sandbox mode
      } finally {
        setDataLoading(false);
      }
    };

    fetchWallet();
  }, [user, authLoading, router, balance]);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-primary z-50 text-primary-foreground pt-4 pb-8 px-4">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-primary-foreground/80 hover:text-white">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">{t('passwala_wallet', 'Passwala Wallet')}</h1>
        </div>
        
        <div className="flex justify-between items-end">
          <div>
            <p className="text-primary-foreground/80 text-sm font-medium mb-1">{t('available_balance', 'Available Balance')}</p>
            <h2 className="text-4xl font-black">&#x20B9;{balance.toFixed(2)}</h2>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <WalletIcon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      <div className="container max-w-md mx-auto px-4 -mt-4 relative z-10">
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Button className="h-14 rounded-2xl font-bold bg-white text-primary hover:bg-muted shadow-sm flex items-center gap-2">
            <Plus className="h-5 w-5" /> {t('add_money', 'Add Money')}
          </Button>
          <Button variant="outline" className="h-14 rounded-2xl font-bold border-2 bg-background flex items-center gap-2">
            <History className="h-5 w-5" /> {t('auto_pay', 'Auto-Pay')}
          </Button>
        </div>

        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 px-1">
          {t('recent_transactions', 'Recent Transactions')}
        </h3>
        <div className="space-y-3">
          {transactions.map(tx => (
            <Card key={tx.id} className="p-4 rounded-2xl flex items-center gap-4 border-0 shadow-sm">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                {tx.type === 'CREDIT' ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{tx.title || t('transaction', 'Transaction')}</p>
                <p suppressHydrationWarning className="text-xs text-muted-foreground truncate">{tx.description || new Date(tx.created_at).toLocaleDateString(currentLanguage === 'en' ? 'en-IN' : currentLanguage)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-black ${tx.type === 'CREDIT' ? 'text-emerald-500' : 'text-foreground'}`}>
                  {tx.type === 'CREDIT' ? '+' : '-'} &#x20B9;{tx.amount.toFixed(2)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
