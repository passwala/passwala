/**
 * Passwala API URL Resolver
 * Dynamically resolves the backend API URL across local development,
 * local Wi-Fi / network IPs (e.g. 192.168.x.x), and production deployments.
 */
export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. Production HTTPS (e.g. *.vercel.app or custom domain)
    if (window.location.protocol === 'https:' && !window.location.hostname.includes('localhost')) {
      if (
        process.env.NEXT_PUBLIC_API_URL &&
        !process.env.NEXT_PUBLIC_API_URL.includes('localhost') &&
        !process.env.NEXT_PUBLIC_API_URL.includes('127.0.0.1')
      ) {
        return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
      }
      return 'https://passwala.onrender.com';
    }

    // 2. Local network / localhost: dynamically use the browser's hostname on port 3004
    // This allows mobile devices on the same Wi-Fi (e.g. 192.168.120.184:3001) to reach the API!
    return `http://${window.location.hostname}:3004`;
  }

  // Server-Side (SSR)
  if (
    process.env.NEXT_PUBLIC_API_URL &&
    !process.env.NEXT_PUBLIC_API_URL.includes('localhost') &&
    !process.env.NEXT_PUBLIC_API_URL.includes('127.0.0.1')
  ) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }

  if (process.env.NODE_ENV === 'production') {
    return 'https://passwala.onrender.com';
  }

  return 'http://127.0.0.1:3004';
}
