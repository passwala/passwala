'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/language-context';
import { 
  ShieldCheck, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  Heart,
  Globe
} from 'lucide-react';

export function Footer() {
  const { currentLanguage, changeLanguage, t, languages } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [host, setHost] = useState('localhost');
  const [protocol, setProtocol] = useState('http:');
  const currentYear = 2026;

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setHost(window.location.hostname || 'localhost');
      setProtocol(window.location.protocol || 'http:');
    }
  }, []);

  const apps = [
    { label: t('footer_buyer_app', 'Buyer Web App'), href: '/', isExternal: false, badge: 'Live' },
    { label: t('footer_rider_app', 'Rider App'), href: `${protocol}//${host}:3003`, isExternal: true, badge: 'Port 3003' },
    { label: t('footer_vendor_portal', 'Vendor Portal'), href: `${protocol}//${host}:3002`, isExternal: true, badge: 'Port 3002' },
    { label: t('footer_admin_portal', 'Admin Portal'), href: `${protocol}//${host}:3005`, isExternal: true, badge: 'Port 3005' },
  ];

  return (
    <footer className="relative bg-[#09090b] text-zinc-300 border-t border-zinc-800/80 pt-16 pb-28 md:pb-12 mt-16 transition-colors overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/4 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-10 -translate-y-1/2 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 md:px-8 max-w-7xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-14">
          
          {/* 1. Brand Column */}
          <div className="lg:col-span-2 space-y-4 pr-0 lg:pr-6">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-700/60 p-1.5 flex items-center justify-center shadow-md">
                <img
                  src="/logo.png"
                  alt="Passwala Logo"
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black tracking-tight text-white">Passwala</span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            </div>

            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
              {t('footer_tagline', 'Your Neighborhood, Powered by AI. Frontier services in your hands.')}
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-800 transition-all"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-800 transition-all"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-800 transition-all"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-800 transition-all"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* 2. Why Passwala */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
              {t('footer_why_passwala', 'Why Passwala')}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-default">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{t('footer_values', 'Values & Mission')}</span>
              </li>
              <li className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-default">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{t('footer_safety', 'Safety & Security')}</span>
              </li>
              <li className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-default">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{t('footer_deployment', 'Instant Delivery')}</span>
              </li>
              <li className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-default">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{t('footer_trust', 'Trust & Verification')}</span>
              </li>
            </ul>
          </div>

          {/* 3. Our Apps Ecosystem */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
              {t('footer_our_apps', 'Our Apps')}
            </h4>
            <ul className="space-y-2.5 text-sm">
              {apps.map((app, idx) => (
                <li key={idx}>
                  {app.isExternal ? (
                    <a
                      href={app.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between text-zinc-400 hover:text-white transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        {app.label}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 group-hover:text-zinc-300">
                        {app.badge}
                      </span>
                    </a>
                  ) : (
                    <Link
                      href={app.href}
                      className="group flex items-center justify-between text-zinc-400 hover:text-white transition-colors"
                    >
                      <span>{app.label}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                        {app.badge}
                      </span>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* 4. Support & Navigation */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
              {t('footer_support', 'Support')}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/help" className="text-zinc-400 hover:text-white transition-colors">
                  {t('footer_help_center', 'Help Center')}
                </Link>
              </li>
              <li>
                <Link href="/help#faq" className="text-zinc-400 hover:text-white transition-colors">
                  {t('footer_faq', 'FAQs & Guides')}
                </Link>
              </li>
              <li>
                <Link href="/events" className="text-zinc-400 hover:text-white transition-colors">
                  {t('events', 'Events')}
                </Link>
              </li>
              <li>
                <Link href="/sports" className="text-zinc-400 hover:text-white transition-colors">
                  {t('sports', 'Sports Venues')}
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-zinc-400 hover:text-white transition-colors">
                  {t('footer_contact_us', 'Contact Us')}
                </Link>
              </li>
            </ul>
          </div>

          {/* 5. Legal & Policies */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
              {t('footer_legal', 'Legal')}
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/terms" className="text-zinc-400 hover:text-white transition-colors">
                  {t('footer_terms', 'Terms of Service')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-zinc-400 hover:text-white transition-colors">
                  {t('footer_privacy', 'Privacy Policy')}
                </Link>
              </li>
              <li>
                <Link href="/help#safety" className="text-zinc-400 hover:text-white transition-colors">
                  {t('footer_data_safety', 'Data Safety & Deletion')}
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-zinc-400 hover:text-white transition-colors">
                  {t('footer_policies', 'All Policies')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p className="flex items-center gap-1.5 text-center md:text-left">
            <span>&copy; {currentYear} Passwala.</span>
            <span>{t('footer_all_rights', 'All rights reserved.')}</span>
            <span className="hidden sm:inline text-zinc-600">|</span>
            <span className="hidden sm:inline-flex items-center gap-1">
              Built with <Heart className="w-3 h-3 text-red-500 fill-red-500" /> in Ahmedabad.
            </span>
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {/* System Status */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-medium text-zinc-400">
                {t('footer_status', 'All Systems Operational')}
              </span>
            </div>

            {/* Quick Language Badges */}
            {mounted && (
              <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                <Globe className="w-3.5 h-3.5 text-zinc-400 ml-1 mr-0.5" />
                {Object.values(languages).map((l) => (
                  <button
                    key={l.code}
                    onClick={() => changeLanguage(l.code)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                      currentLanguage === l.code
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                    title={l.name || l.nativeName}
                  >
                    {l.code.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
