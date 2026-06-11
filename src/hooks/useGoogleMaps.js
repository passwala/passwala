import { useState, useEffect } from 'react';

let isScriptLoading = false;
let isScriptLoaded = false;
let callbacks = [];

export function useGoogleMaps() {
  const [loaded, setLoaded] = useState(isScriptLoaded || typeof window !== 'undefined' && !!window.google && !!window.google.maps);

  useEffect(() => {
    if (isScriptLoaded || (typeof window !== 'undefined' && !!window.google && !!window.google.maps)) {
      setLoaded(true);
      return;
    }

    const handleLoad = () => {
      setLoaded(true);
    };

    callbacks.push(handleLoad);

    if (!isScriptLoading) {
      isScriptLoading = true;
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        isScriptLoading = false;
        isScriptLoaded = true;
        callbacks.forEach((cb) => cb());
        callbacks = [];
      };
      script.onerror = () => {
        console.error('Failed to load Google Maps script.');
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
