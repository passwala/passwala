import type { Metadata } from 'next';
import './globals.css';
import { RiderProvider } from '../lib/rider-context';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import LocationDisclosureModal from '../components/LocationDisclosureModal';
import IncomingOrderModal from '../components/IncomingOrderModal';
import IncomingRideModal from '../components/IncomingRideModal';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Passwala Rider | Partner Delivery & Rides',
  description: 'Smart local delivery and urban passenger mobility partner platform for Ahmedabad.',
  icons: {
    icon: '/favicon.svg'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen antialiased">
        <RiderProvider>
          {/* Left Desktop Sidebar & Mobile Bottom Navigation */}
          <Navigation />

          {/* Main Content Area (Offset by 256px on Desktop) */}
          <div className="flex flex-col min-h-screen md:pl-64">
            <Header />
            <main className="flex-1 pb-24 md:pb-10 max-w-7xl w-full mx-auto p-4 sm:p-6">
              {children}
            </main>
          </div>

          <LocationDisclosureModal />
          <IncomingOrderModal />
          <IncomingRideModal />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#ffffff',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)'
              }
            }}
          />
        </RiderProvider>
      </body>
    </html>
  );
}
