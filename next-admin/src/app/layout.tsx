import type { Metadata } from 'next';
import './globals.css';
import { AdminProvider } from '@/lib/admin-context';
import { AdminShell } from '@/components/AdminShell';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Passwala SuperAdmin | Operations & Master Control',
  description: 'Executive Operations Console for Passwala Platform',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AdminProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#1e293b',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '12px',
                padding: '10px 16px',
              },
            }}
          />
          <AdminShell>{children}</AdminShell>
        </AdminProvider>
      </body>
    </html>
  );
}
