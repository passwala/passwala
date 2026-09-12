'use client';

import { useState } from 'react';
import { useAuthContext } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Bell, Moon, Sun, Volume2, Smartphone, Shield, ArrowLeft, Globe } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTranslation } from '@/lib/language-context';

export default function SettingsPage() {
  const router = useRouter();
  const { currentLanguage, changeLanguage, t, languages } = useTranslation();
  const [darkMode, setDarkMode] = useState(false);
  const [notifs, setNotifs] = useState({ orders: true, chat: true, sound: true });

  const toggleSetting = (key: keyof typeof notifs) => {
    setNotifs(p => ({ ...p, [key]: !p[key] }));
    toast.success('Settings saved');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Toaster position="top-center" />
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur z-50 border-b p-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold">App Settings</h1>
      </div>

      <div className="container max-w-md mx-auto p-4 space-y-8 mt-4">
        
        {/* Notifications Section */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">Notifications</h2>
          <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl"><Bell className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">Order Updates</p>
                  <p className="text-xs text-muted-foreground">Alerts for your bookings</p>
                </div>
              </div>
              <button 
                onClick={() => toggleSetting('orders')}
                className={`w-12 h-6 rounded-full transition-colors relative ${notifs.orders ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${notifs.orders ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl"><Smartphone className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Stay updated on the go</p>
                </div>
              </div>
              <button 
                onClick={() => toggleSetting('chat')}
                className={`w-12 h-6 rounded-full transition-colors relative ${notifs.chat ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${notifs.chat ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl"><Volume2 className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">Sound & Haptics</p>
                  <p className="text-xs text-muted-foreground">Interactive app sounds</p>
                </div>
              </div>
              <button 
                onClick={() => toggleSetting('sound')}
                className={`w-12 h-6 rounded-full transition-colors relative ${notifs.sound ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${notifs.sound ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

          </div>
        </section>

        {/* Preferences Section */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider px-1">{t('preferences')}</h2>
          <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-500/10 text-slate-500 rounded-xl">
                  {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-semibold">{t('dark_mode')}</p>
                  <p className="text-xs text-muted-foreground">Coming soon globally</p>
                </div>
              </div>
              <button 
                onClick={() => { setDarkMode(!darkMode); toast('Theme will update in v2'); }}
                className={`w-12 h-6 rounded-full transition-colors relative ${darkMode ? 'bg-primary' : 'bg-muted-foreground/30'}`}
              >
                <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30" onClick={() => toast('Privacy settings coming soon')}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl"><Shield className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">{t('privacy_security')}</p>
                  <p className="text-xs text-muted-foreground">Manage your data</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Language Section (matching old code reference) */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Globe className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              {t('language')} / ભાષા / भाषा
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {Object.entries(languages).map(([code, lang]) => (
              <button
                key={code}
                onClick={() => {
                  changeLanguage(code);
                  toast.success(`${t('language_saved')} (${lang.nativeName})`);
                }}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left font-medium ${
                  currentLanguage === code
                    ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted text-foreground'
                }`}
              >
                <span className="text-2xl">{lang.flag}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-tight truncate">{lang.nativeName}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{lang.name}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

