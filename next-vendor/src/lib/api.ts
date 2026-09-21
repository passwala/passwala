/**
  * Passwala Vendor API URL Resolver
  * Dynamically resolves the backend API URL across local development,
  * local Wi-Fi / network IPs (e.g. 192.168.x.x), and production deployments.
  */
export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
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
    return `http://${window.location.hostname}:3004`;
  }

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
