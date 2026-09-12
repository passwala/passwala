import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/language-context";
import BottomNav from "@/components/BottomNav";
import { LoginModal } from "@/components/LoginModal";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Passwala | Book Events, Sports, and Rides",
  description: "Your ultimate platform for discovering events and booking tickets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          <AuthProvider>
            <Navbar />
            <LoginModal />
            <main className="min-h-screen bg-background pb-16 md:pb-0">
              {children}
            </main>
            <BottomNav />
            <div id="recaptcha-container"></div>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
