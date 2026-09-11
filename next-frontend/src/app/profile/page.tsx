'use client';

import { useAuthContext } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ShoppingBag, Ticket, Wallet, MapPin, Settings,
  HelpCircle, LogOut, ChevronRight, User, Phone, Mail
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const menuItems = [
  { icon: ShoppingBag, label: 'My Bookings & Orders', href: '/orders' },
  { icon: Wallet,      label: 'Wallet', href: '/wallet' },
  { icon: MapPin,      label: 'Saved Addresses', href: '/addresses' },
  { icon: Settings,    label: 'App Settings', href: '/settings' },
  { icon: HelpCircle,  label: 'Help & Support', href: '/help' },
];

export default function ProfilePage() {
  const { user, loading, logout, openLogin } = useAuthContext();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 space-y-6">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
          <User className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">You're not logged in</h2>
          <p className="text-muted-foreground">Login to view your profile, orders, and tickets</p>
        </div>
        <Button size="lg" className="rounded-full px-10" onClick={openLogin}>
          Login / Sign Up
        </Button>
      </div>
    );
  }

  const name = user.name || user.displayName || '';
  const phone = user.phone || user.phoneNumber || '';
  const email = user.email || '';
  const initials = name ? name.charAt(0).toUpperCase() : phone ? phone[phone.length - 1] : 'U';

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Profile Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background pt-12 pb-8 px-4 text-center">
        <Avatar className="h-24 w-24 mx-auto mb-4">
          <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {name && <h1 className="text-2xl font-bold">{name}</h1>}
        {phone && (
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground mt-1">
            <Phone className="h-4 w-4" />
            <span className="text-sm">{phone}</span>
          </div>
        )}
        {email && (
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground mt-1">
            <Mail className="h-4 w-4" />
            <span className="text-sm">{email}</span>
          </div>
        )}
        {user.role && (
          <span className="inline-block mt-2 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
            {user.role}
          </span>
        )}
      </div>

      {/* Menu */}
      <div className="container mx-auto px-4 max-w-md">
        <div className="bg-card rounded-3xl border overflow-hidden shadow-sm">
          {menuItems.map((item, idx) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors ${
                idx < menuItems.length - 1 ? 'border-b border-border/50' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-muted rounded-xl">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="font-medium">{item.label}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors font-semibold"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Passwala v1.0 &bull; Made with ❤️
        </p>
      </div>
    </div>
  );
}
