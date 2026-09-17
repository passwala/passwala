"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, CalendarDaysIcon, Squares2X2Icon, TicketIcon, UserIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/language-context';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  // Hide on auth pages or similar if needed, but for now we just show it on mobile
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/50 pb-safe pt-1.5 px-2 shadow-sm">
      <div className="flex items-center justify-around">
        <NavItem href="/" icon={HomeIcon} label={t('home')} isActive={pathname === '/'} />
        <NavItem href="/events" icon={CalendarDaysIcon} label={t('events')} isActive={pathname.startsWith('/events')} />
        <NavItem href="/sports" icon={Squares2X2Icon} label={t('sports')} isActive={pathname.startsWith('/sports')} />
        <NavItem href="/orders" icon={TicketIcon} label={t('orders')} isActive={pathname.startsWith('/orders')} />
        <NavItem href="/profile" icon={UserIcon} label={t('profile')} isActive={pathname.startsWith('/profile')} />
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
