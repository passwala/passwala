import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { VendorProvider } from '@/lib/vendor-context';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Passwala Partner | Vendor Business Suite',
  description: 'Manage your sports venues, events, orders, and earnings on Passwala.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <VendorProvider>
          <Toaster position="top-center" reverseOrder={false} />
          {children}
        </VendorProvider>
      </body>
    </html>
  );
}
