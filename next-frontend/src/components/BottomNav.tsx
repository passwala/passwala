"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, LayoutGrid, Ticket, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/language-context';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  // Hide on auth pages or similar if needed, but for now we just show it on mobile
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t pb-safe pt-2 px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around">
        <NavItem href="/" icon={Home} label={t('home')} isActive={pathname === '/'} />
        <NavItem href="/events" icon={Calendar} label={t('events')} isActive={pathname.startsWith('/events')} />
        <NavItem href="/sports" icon={LayoutGrid} label={t('sports')} isActive={pathname.startsWith('/sports')} />
        <NavItem href="/orders" icon={Ticket} label={t('orders')} isActive={pathname.startsWith('/orders')} />
        <NavItem href="/profile" icon={User} label={t('profile')} isActive={pathname.startsWith('/profile')} />
      </div>
    </div>
  );
}


function NavItem({ href, icon: Icon, label, isActive }: { href: string; icon: any; label: string; isActive: boolean }) {
  return (
    <Link 
      href={href}
      className={cn(
        "flex flex-col items-center justify-center w-16 h-12 gap-1 rounded-xl transition-colors",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
      <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
        {label}
      </span>
    </Link>
  );
}
