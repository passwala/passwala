/**
 * Passwala Rider Utilities
 */

export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'https:' && !window.location.hostname.includes('localhost')) {
      return 'https://passwala.onrender.com';
    }
    return `http://${window.location.hostname}:3004`;
  }
  if (process.env.NODE_ENV === 'production') {
    return 'https://passwala.onrender.com';
  }
  return 'http://127.0.0.1:3004';
}

export function getStraightLineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export function playNotificationPing(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn('AudioContext alert chime could not play:', e);
  }
}

export const AHMEDABAD_COORDS: Record<string, [number, number]> = {
  'satellite': [23.0304, 72.5178],
  'bodakdev': [23.0396, 72.5126],
  'vastrapur': [23.0350, 72.5293],
  'prahlad nagar': [23.0122, 72.5085],
  'navrangpura': [23.0365, 72.5611],
  'thaltej': [23.0538, 72.5080],
  'sola': [23.0782, 72.5255],
  'bopal': [23.0338, 72.4633],
  'south bopal': [23.0183, 72.4645],
  'maninagar': [22.9978, 72.6033],
  'paldi': [23.0135, 72.5627],
  'ahmedabad': [23.0225, 72.5714]
};

export function getAreaCoordinates(address?: string): { lat: number; lng: number } {
  if (!address) return { lat: 23.0225, lng: 72.5714 };
  const lower = address.toLowerCase();
  for (const [area, coords] of Object.entries(AHMEDABAD_COORDS)) {
    if (lower.includes(area)) {
      return { lat: coords[0], lng: coords[1] };
    }
  }
  return { lat: 23.0304, lng: 72.5178 }; // Default to Satellite
}
