'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Ticket, MapPin, Search, User, Loader2, Globe, Settings, Moon, Sun } from 'lucide-react';
import { useAuthContext } from '@/lib/auth-context';
import { useTranslation } from '@/lib/language-context';
import { useTheme } from '@/lib/theme-context';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const CITIES = ['Ahmedabad', 'Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Surat', 'Jaipur', 'Hyderabad'];

export function Navbar() {
  const { user, logout, openLogin } = useAuthContext();
  const { currentLanguage, changeLanguage, t, languages } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const router = useRouter();
  const [city, setCity] = useState('Select City');
  const [locationLoading, setLocationLoading] = useState(false);
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Load saved city on mount
  useEffect(() => {
    const saved = localStorage.getItem('passwala_city');
    if (saved) setCity(saved);
  }, []);

  // Auto-detect location on first load
  useEffect(() => {
    const saved = localStorage.getItem('passwala_city');
    if (saved) return; // already set
    detectLocation();
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const detectedCity =
            data.address?.city ||
            data.address?.town ||
            data.address?.county ||
            data.address?.state_district ||
            'Your City';
          setCity(detectedCity);
          localStorage.setItem('passwala_city', detectedCity);
        } catch {
          setCity('Ahmedabad');
          localStorage.setItem('passwala_city', 'Ahmedabad');
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
        // Permission denied - just leave as is
      },
      { timeout: 8000 }
    );
  };

  const handleSelectCity = (c: string) => {
    setCity(c);
    localStorage.setItem('passwala_city', c);
    setCitySheetOpen(false);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const displayName = user?.name || user?.displayName || user?.phone || user?.phoneNumber || '';
  const initials = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8 mx-auto">

        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 shrink-0">
          <Ticket className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold tracking-tight">Passwala</span>
        </Link>

        {/* Search — desktop */}
        <div className="hidden md:flex flex-1 items-center justify-center max-w-sm mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder={t('search_placeholder')}
              className="w-full h-10 rounded-full border bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">

          {/* City Selector — client only to avoid hydration mismatch */}
          {mounted && (
          <Sheet open={citySheetOpen} onOpenChange={setCitySheetOpen}>
            <SheetTrigger className="hidden md:flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {locationLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                <span className="max-w-[100px] truncate">{city === 'Select City' ? t('select_city') : city}</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>{t('select_your_city')}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-2">
                <button
                  onClick={detectLocation}
                  className="w-full flex items-center gap-2 p-3 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
                >
                  <MapPin className="h-4 w-4 text-primary" />
                  {locationLoading ? t('detecting') : t('use_my_location')}
                </button>
                <div className="border-t pt-3 mt-3">
                  {CITIES.map(c => (
                    <button
                      key={c}
                      onClick={() => handleSelectCity(c)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        city === c ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
          )}

          {/* Language Selector */}
          {mounted && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-all outline-none">
                <Globe className="h-3.5 w-3.5 text-primary" />
                <span>{languages[currentLanguage]?.flag || '🌐'} {languages[currentLanguage]?.code?.toUpperCase() || 'EN'}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 rounded-2xl shadow-xl p-1.5 z-50">
                {Object.entries(languages).map(([code, info]) => (
                  <DropdownMenuItem
                    key={code}
                    onClick={() => changeLanguage(code)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                      currentLanguage === code ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{info.flag}</span>
                      <span>{info.nativeName}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase">{code}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={toggleDarkMode}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="flex items-center justify-center h-8 w-8 rounded-full border bg-background hover:bg-muted text-foreground transition-all outline-none cursor-pointer"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
            </button>
          )}

          {/* Search — mobile */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Search className="h-5 w-5" />
          </Button>

          {/* Auth */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <Avatar className="h-9 w-9 cursor-pointer">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-3 py-2 border-b">
                  <p className="font-semibold text-sm">{displayName || 'User'}</p>
                  {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                </div>
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <User className="mr-2 h-4 w-4" /> {t('profile')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/orders')}>
                  <Ticket className="mr-2 h-4 w-4" /> {t('orders')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" /> {t('settings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
                  {t('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={openLogin} className="rounded-full px-5 hidden md:flex">
              {t('login')}
            </Button>
          )}

          {/* Mobile login */}
          {!user && (
            <button onClick={openLogin} className="md:hidden">
              <User className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

