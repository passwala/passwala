/**
 * Passwala API URL Resolver
 * Resolves the backend API URL dynamically based on environment.
 */
export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
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
