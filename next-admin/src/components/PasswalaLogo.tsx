'use client';

import React from 'react';
import Link from 'next/link';

export interface PasswalaLogoProps {
  /**
   * Visual theme variant
   * - 'default': Rich signature brand colors (Violet + Coral gradient)
   * - 'gradient': Vibrant multi-stop gradient for text and icon
   * - 'monochrome': Adaptive single color (slate-900 in light, white in dark)
   * - 'white': Crisp solid white for dark banners, footers, and hero overlays
   * - 'admin': Professional Operations badge palette with purple and amber accents
   */
  variant?: 'default' | 'gradient' | 'monochrome' | 'white' | 'admin';

  /**
   * Predefined sizes
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Whether to display the "Passwala" typographic wordmark alongside the emblem
   * @default true
   */
  showText?: boolean;

  /**
   * Whether to display a secondary micro-tagline beneath the wordmark
   * @default false
   */
  showTagline?: boolean;

  /**
   * Custom micro-tagline text (e.g., "TICKETS & SPORTS", "LIVE EXPERIENCES", "OPERATIONS")
   */
  tagline?: string;

  /**
   * Orientation layout: horizontal inline or vertical stacked
   * @default "horizontal"
   */
  layout?: 'horizontal' | 'vertical';

  /**
   * Enable subtle hover glow and icon micro-interaction
   * @default true
   */
  animated?: boolean;

  /**
   * Optional URL to wrap the logo in a Next.js Link
   */
  href?: string;

  /**
   * Additional custom CSS classes
   */
  className?: string;
}

const SIZE_MAP = {
  xs: { icon: 22, text: 'text-base', tagline: 'text-[9px]' },
  sm: { icon: 28, text: 'text-lg', tagline: 'text-[10px]' },
  md: { icon: 36, text: 'text-xl', tagline: 'text-[11px]' },
  lg: { icon: 44, text: 'text-2xl', tagline: 'text-xs' },
  xl: { icon: 56, text: 'text-3xl', tagline: 'text-sm' },
};

/**
 * Passwala Signature Emblem SVG
 * Conceptualized as a dynamic VIP ticket/pass fused with an energetic "P" monogram,
 * micro ticket-perforation notch, and luminous diamond star.
 */
export const PasswalaEmblem: React.FC<{
  size?: number;
  variant?: 'default' | 'gradient' | 'monochrome' | 'white' | 'admin';
  className?: string;
}> = ({ size = 36, variant = 'default', className = '' }) => {
  const isWhite = variant === 'white';
  const isMono = variant === 'monochrome';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-xs transition-transform duration-300 ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Signature Passwala Primary Gradient */}
        <linearGradient id="pw-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="45%" stopColor="#6D28D9" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>

        {/* Dynamic Energy Accent Gradient (Coral / Amber) */}
        <linearGradient id="pw-grad-accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="50%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>

        {/* Soft Golden Sparkle Gradient */}
        <linearGradient id="pw-grad-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>

        {/* Ticket Surface Specular Glow */}
        <linearGradient id="pw-specular" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Background Outer Shield / Rounded Ticket Card */}
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="24"
        fill={isWhite ? '#FFFFFF' : isMono ? 'currentColor' : 'url(#pw-grad-primary)'}
        className="transition-colors"
      />

      {/* Ticket Specular Highlight (Top Rim) */}
      {!isMono && !isWhite && (
        <rect
          x="6"
          y="6"
          width="88"
          height="44"
          rx="24"
          fill="url(#pw-specular)"
        />
      )}

      {/* Left Ticket Notch / Perforation Detail */}
      <circle
        cx="6"
        cy="50"
        r="7"
        fill={isWhite ? '#0F172A' : '#0A0A0B'}
        className="transition-colors dark:fill-[#030712]"
      />

      {/* Right Ticket Notch / Perforation Detail */}
      <circle
        cx="94"
        cy="50"
        r="7"
        fill={isWhite ? '#0F172A' : '#0A0A0B'}
        className="transition-colors dark:fill-[#030712]"
      />

      {/* Folded Vibrant Ticket Ribbon (Bottom-Right Energy Wave) */}
      {!isWhite && !isMono && (
        <path
          d="M 50 20 L 76 20 C 82 20 86 24 86 30 L 86 52 C 86 54 84 56 82 56 L 68 56 C 60 56 54 62 54 70 L 54 84 C 54 86 52 88 50 88 C 44 88 40 84 40 78 L 40 30 C 40 24 44 20 50 20 Z"
          fill="url(#pw-grad-accent)"
          opacity="0.95"
        />
      )}

      {/* Iconic Monogram "P" Body */}
      <path
        d="M 30 24 C 27.8 24 26 25.8 26 28 L 26 72 C 26 74.2 27.8 76 30 76 C 32.2 76 34 74.2 34 72 L 34 54 L 54 54 C 64 54 71 47 71 39 C 71 31 64 24 54 24 Z"
        fill={isWhite ? '#0F172A' : '#FFFFFF'}
      />

      {/* Inner Negative Counter for "P" */}
      <path
        d="M 34 32 L 52 32 C 57 32 61 35 61 39 C 61 43 57 46 52 46 L 34 46 Z"
        fill={isWhite ? '#FFFFFF' : isMono ? 'currentColor' : 'url(#pw-grad-primary)'}
      />

      {/* VIP Star / Hologram Diamond in Upper Right */}
      <path
        d="M 74 16 L 76.5 22.5 L 83 25 L 76.5 27.5 L 74 34 L 71.5 27.5 L 65 25 L 71.5 22.5 Z"
        fill={isWhite ? '#F97316' : 'url(#pw-grad-glow)'}
      />

      {/* Micro Ticket Perforation Dotted Line across Center */}
      <line
        x1="18"
        y1="50"
        x2="24"
        y2="50"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeDasharray="2 2"
        strokeOpacity="0.6"
      />
      <line
        x1="76"
        y1="50"
        x2="82"
        y2="50"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeDasharray="2 2"
        strokeOpacity="0.6"
      />
    </svg>
  );
};

export const PasswalaLogo: React.FC<PasswalaLogoProps> = ({
  variant = 'default',
  size = 'md',
  showText = true,
  showTagline = false,
  tagline = 'TICKETS & EXPERIENCES',
  layout = 'horizontal',
  animated = true,
  href,
  className = ''
}) => {
  const config = SIZE_MAP[size];

  const renderContent = () => (
    <div
      className={`inline-flex items-center gap-2.5 font-sans select-none ${
        layout === 'vertical' ? 'flex-col text-center' : 'flex-row'
      } ${animated ? 'group cursor-pointer' : ''} ${className}`}
    >
      {/* Emblem Graphic */}
      <div
        className={`relative shrink-0 flex items-center justify-center transition-transform duration-300 ${
          animated ? 'group-hover:scale-105 group-hover:rotate-1' : ''
        }`}
      >
        <PasswalaEmblem size={config.icon} variant={variant} />
      </div>

      {/* Typographic Wordmark */}
      {showText && (
        <div className={`flex flex-col leading-tight ${layout === 'vertical' ? 'items-center' : 'items-start'}`}>
          <div className="flex items-baseline tracking-tight font-black">
            {/* "Pass" styling */}
            <span
              className={
                variant === 'gradient'
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-orange-500 bg-clip-text text-transparent'
                  : variant === 'white'
                  ? 'text-white'
                  : variant === 'monochrome'
                  ? 'text-slate-900 dark:text-white'
                  : variant === 'admin'
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-purple-600 dark:text-purple-400'
              }
            >
              <span className={config.text}>Pass</span>
            </span>

            {/* "wala" styling */}
            <span
              className={
                variant === 'white'
                  ? 'text-orange-400'
                  : variant === 'monochrome'
                  ? 'text-slate-700 dark:text-slate-300'
                  : variant === 'admin'
                  ? 'text-orange-600 dark:text-orange-500'
                  : 'text-orange-500 dark:text-orange-400'
              }
            >
              <span className={config.text}>wala</span>
            </span>

            {/* Micro accent dot */}
            <span
              className={`inline-block ml-0.5 rounded-full ${
                variant === 'white'
                  ? 'bg-orange-400'
                  : 'bg-gradient-to-tr from-orange-500 to-amber-400'
              } ${
                size === 'xs'
                  ? 'h-1 w-1'
                  : size === 'sm'
                  ? 'h-1.5 w-1.5'
                  : 'h-2 w-2'
              }`}
            />
          </div>

          {/* Subtitle / Tagline */}
          {showTagline && (
            <span
              className={`font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5 ${config.tagline}`}
            >
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded-xl">
        {renderContent()}
      </Link>
    );
  }

  return renderContent();
};

export default PasswalaLogo;
