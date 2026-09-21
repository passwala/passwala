'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PasswalaLogo } from '@/components/PasswalaLogo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Ticket, MapPin, Search, User, Loader2, Settings, Moon, Sun, 
  Sparkles, Car, HelpCircle, Calendar, Trophy 
} from 'lucide-react';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { useAuthContext } from '@/lib/auth-context';
import { useTranslation } from '@/lib/language-context';
import { useTheme } from '@/lib/theme-context';
import { cn } from '@/lib/utils';
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
  const pathname = usePathname();

  const [city, setCity] = useState('Select City');
  const [locationLoading, setLocationLoading] = useState(false);
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { 
    setMounted(true); 
  }, []);

  // Load saved city on mount
  useEffect(() => {
    const saved = localStorage.getItem('passwala_city');
    if (saved) setCity(saved);
  }, []);

  // Auto-detect location on first load if not set
  useEffect(() => {
    const saved = localStorage.getItem('passwala_city');
    if (saved) return;
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
            'Ahmedabad';
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
      },
      { timeout: 8000 }
    );
  };

  const handleSelectCity = (c: string) => {
    setCity(c);
    localStorage.setItem('passwala_city', c);
    setCitySheetOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/events?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileSearchOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Resolve Portal Links for current host
  const getVendorUrl = () => {
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('192.168.') && !window.location.hostname.includes('10.')) {
      return 'https://passwala-vendor.vercel.app';
    }
    return typeof window !== 'undefined' ? `http://${window.location.hostname}:3002` : 'http://localhost:3002';
  };

  const getRiderUrl = () => {
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('192.168.') && !window.location.hostname.includes('10.')) {
      return 'https://passwala-rider.vercel.app';
    }
    return typeof window !== 'undefined' ? `http://${window.location.hostname}:3003` : 'http://localhost:3003';
  };

  const displayName = user?.name || user?.displayName || user?.phone || user?.phoneNumber || '';
  const initials = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-xs">
      {/* ── Main Top Bar ── */}
      <div className="container flex h-16 items-center justify-between px-4 md:px-8 mx-auto gap-4">

        {/* Logo */}
        <PasswalaLogo href="/" size="sm" variant="gradient" animated />

        {/* Search — desktop */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 items-center justify-center max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('search_placeholder', 'Search events, sports, artists, venues...')}
              className="w-full h-10 rounded-full border border-border/80 bg-background/80 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-xs"
            />
          </div>
        </form>

        {/* Right actions */}
        <div className="flex items-center gap-2 md:gap-3">

          {/* City Selector */}
          <Sheet open={citySheetOpen} onOpenChange={setCitySheetOpen}>
            <SheetTrigger className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-muted/70 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              {locationLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <MapPin className="h-4 w-4 text-primary" />
              )}
              <span className="max-w-[100px] truncate" suppressHydrationWarning>
                {city === 'Select City' ? t('select_city', 'Select City') : city}
              </span>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>{t('select_your_city', 'Select Your City')}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-2">
                <button
                  onClick={detectLocation}
                  className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-primary/20 bg-primary/5 text-sm font-medium hover:bg-primary/10 text-primary transition-colors cursor-pointer"
                >
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span>{locationLoading ? t('detecting', 'Detecting location...') : t('use_my_location', 'Use my current location')}</span>
                </button>
                <div className="border-t pt-3 mt-4 space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider px-3 pb-2">Popular Cities</p>
                  {CITIES.map(c => (
                    <button
                      key={c}
                      onClick={() => handleSelectCity(c)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer",
                        city === c 
                          ? "bg-primary text-primary-foreground font-semibold" 
                          : "hover:bg-muted text-foreground"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border/70 bg-background hover:bg-muted text-xs font-semibold text-foreground transition-all outline-none cursor-pointer">
              <GlobeAltIcon className="h-3.5 w-3.5 text-primary" />
              <span suppressHydrationWarning>{languages[currentLanguage]?.code?.toUpperCase() || 'EN'}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lg p-1.5 z-50 border border-border/60">
              {Object.entries(languages).map(([code, info]) => (
                <DropdownMenuItem
                  key={code}
                  onClick={() => changeLanguage(code)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors",
                    currentLanguage === code ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                  )}
                >
                  <span>{info.nativeName}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-mono">{code}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center justify-center h-8 w-8 rounded-full border border-border/70 bg-background hover:bg-muted text-foreground transition-all outline-none cursor-pointer"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700 dark:text-slate-200" />}
          </button>

          {/* Search trigger — mobile */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden h-8 w-8"
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Auth Button / Avatar */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl p-1.5 border border-border/60">
                <div className="px-3 py-2.5 border-b border-border/50">
                  <p className="font-semibold text-sm truncate">{displayName || 'User'}</p>
                  {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                </div>
                <DropdownMenuItem onClick={() => router.push('/profile')} className="cursor-pointer py-2">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" /> {t('profile', 'Profile')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/orders')} className="cursor-pointer py-2">
                  <Ticket className="mr-2 h-4 w-4 text-muted-foreground" /> {t('orders', 'My Bookings')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer py-2">
                  <Settings className="mr-2 h-4 w-4 text-muted-foreground" /> {t('settings', 'Settings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500 cursor-pointer py-2">
                  {t('logout', 'Sign Out')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={openLogin} className="rounded-full px-5 hidden md:flex font-semibold shadow-xs">
              {t('login', 'Sign In')}
            </Button>
          )}

          {/* Mobile login trigger */}
          {!user && (
            <button 
              onClick={openLogin} 
              className="md:hidden flex items-center justify-center h-8 w-8 rounded-full border border-border/70 bg-background text-foreground"
              aria-label="Login"
            >
              <User className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile Search Expandable Bar ── */}
      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-border/40 bg-background/95">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('search_placeholder', 'Search events, sports, venues...')}
              className="w-full h-10 rounded-full border border-border/80 bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </form>
        </div>
      )}

      {/* ── Desktop Sub-Navigation Strip (BookMyShow Style) ── */}
      <div className="hidden md:block border-t border-border/40 bg-muted/20">
        <div className="container flex h-11 items-center justify-between px-4 md:px-8 mx-auto text-sm">
          
          {/* Main Category / Navigation Links */}
          <div className="flex items-center gap-8 font-medium">
            <Link 
              href="/events" 
              className={cn(
                "inline-flex items-center gap-1.5 py-1 text-sm transition-colors border-b-2",
                pathname.startsWith('/events') 
                  ? "border-primary text-primary font-semibold" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar className="w-4 h-4" />
              <span>{t('events', 'Events')}</span>
            </Link>

            <Link 
              href="/sports" 
              className={cn(
                "inline-flex items-center gap-1.5 py-1 text-sm transition-colors border-b-2",
                pathname.startsWith('/sports') 
                  ? "border-primary text-primary font-semibold" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Trophy className="w-4 h-4" />
              <span>{t('sports', 'Sports & Venues')}</span>
            </Link>

            <Link 
              href="/orders" 
              className={cn(
                "inline-flex items-center gap-1.5 py-1 text-sm transition-colors border-b-2",
                pathname.startsWith('/orders') 
                  ? "border-primary text-primary font-semibold" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Ticket className="w-4 h-4" />
              <span>{t('orders', 'My Bookings')}</span>
            </Link>

            <Link 
              href="/help" 
              className={cn(
                "inline-flex items-center gap-1.5 py-1 text-sm transition-colors border-b-2",
                pathname.startsWith('/help') 
                  ? "border-primary text-primary font-semibold" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <HelpCircle className="w-4 h-4" />
              <span>{t('help', 'Help & Support')}</span>
            </Link>
          </div>

          {/* Quick External Portal Links */}
          <div className="flex items-center gap-3 text-xs">
            <a 
              href={getVendorUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 font-semibold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>List Your Show (Vendor)</span>
            </a>
            <a 
              href={getRiderUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border/50 text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <Car className="w-3.5 h-3.5" />
              <span>Drive With Us (Rider)</span>
            </a>
          </div>

        </div>
      </div>
    </nav>
  );
}
