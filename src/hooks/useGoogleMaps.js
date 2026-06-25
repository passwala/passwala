import { useState, useEffect } from 'react';

let isScriptLoading = false;
let isScriptLoaded = false;
let callbacks = [];

export function useGoogleMaps() {
  const [loaded, setLoaded] = useState(
    isScriptLoaded || (typeof window !== 'undefined' && !!window.google?.maps?.Map)
  );

  useEffect(() => {
    // Skip if already loaded
    if (isScriptLoaded || (typeof window !== 'undefined' && !!window.google?.maps?.Map)) {
      if (!loaded) { setTimeout(() => setLoaded(true), 0); }
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

    // Skip silently when key is missing/placeholder — prevents InvalidKeyMapError spam
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE' || apiKey.includes('YOUR_')) {
      console.warn('[Maps] VITE_GOOGLE_MAPS_API_KEY not set — map features disabled.');
      return;
    }

    const handleLoad = () => setLoaded(true);
    callbacks.push(handleLoad);

    if (!isScriptLoading) {
      isScriptLoading = true;
      const script = document.createElement('script');
      // loading=async eliminates the "loaded without loading=async" warning
      // &map_ids=default enables AdvancedMarkerElement support
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker&loading=async&map_ids=default`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        // Wait for the asynchronous loader to fully populate the maps namespaces
        const checkMapConstructor = setInterval(() => {
          if (window.google?.maps?.Map) {
            clearInterval(checkMapConstructor);
            isScriptLoading = false;
            isScriptLoaded = true;
            callbacks.forEach((cb) => cb());
            callbacks = [];
          }
        }, 50);
      };
      script.onerror = () => {
        console.error('[Maps] Failed to load Google Maps script.');
        isScriptLoading = false;
      };
      document.head.appendChild(script);
    }

    return () => {
      callbacks = callbacks.filter((cb) => cb !== handleLoad);
    };
  }, []);

  return loaded;
}
