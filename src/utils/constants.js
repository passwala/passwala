export const DEFAULT_LOCATION = import.meta.env.VITE_DEFAULT_LOCATION || 'India';
export const DEFAULT_COORDS = { lat: 20.5937, lng: 78.9629 }; // Geographic center of India

export const AHMEDABAD_AREA_COORDS = {
  thaltej: [23.0500, 72.5186],
  gota: [23.0805, 72.5323],
  satellite: [23.0293, 72.5137],
  paldi: [23.0113, 72.5634],
};

export const AHMEDABAD_AREAS = [
  { name: 'Thaltej', lat: 23.0500, lng: 72.5186 },
  { name: 'Gota', lat: 23.0805, lng: 72.5323 },
  { name: 'Satellite', lat: 23.0293, lng: 72.5137 },
  { name: 'Paldi', lat: 23.0113, lng: 72.5634 },
  { name: 'Bopal', lat: 23.0333, lng: 72.4667 },
  { name: 'Vastrapur', lat: 23.0350, lng: 72.5293 },
  { name: 'SG Highway', lat: 23.0762, lng: 72.5261 },
  { name: 'Navrangpura', lat: 23.0365, lng: 72.5611 },
  { name: 'Maninagar', lat: 22.9996, lng: 72.6033 },
  { name: 'Prahlad Nagar', lat: 23.0120, lng: 72.5108 }
];
