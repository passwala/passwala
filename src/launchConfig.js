// ─────────────────────────────────────────────────────────────────────────────
//  🚀 PASSWALA LAUNCH CONFIG — Single source of truth
//
//  LAUNCH_MODE = true  → Only LAUNCH_FEATURES are visible (soft launch)
//  LAUNCH_MODE = false → All features visible (full launch)
//
//  Features are HIDDEN in the UI but NEVER removed from code.
//  To roll out more features: add their ID to LAUNCH_FEATURES.
//
//  Available feature IDs:
//    'events'      → Event Tickets
//    'rides'       → City Rides
//    'shopping'    → Near Shops / cart / order history
//    'community'   → Neighbors Community
//    'services'    → Local Experts / Pro Services
// ─────────────────────────────────────────────────────────────────────────────

export const LAUNCH_MODE = true;

export const LAUNCH_FEATURES = ['events', 'sports'];
// Phase 2 example: export const LAUNCH_FEATURES = ['events', 'rides'];
// Full launch:     export const LAUNCH_MODE = false;

// Derived helpers
export const isFeatureEnabled = (featureId) =>
  !LAUNCH_MODE || LAUNCH_FEATURES.includes(featureId);

// Features that show shopping-related UI (cart, order history, wallet, delivery address)
export const SHOPPING_FEATURES = ['shopping'];
export const showShoppingUI = () => SHOPPING_FEATURES.some(f => isFeatureEnabled(f));

// Returns true if the user has at least one event booking (unlocks Order History in launch mode)
export const hasEventBookings = () => {
  try { return localStorage.getItem('passwala_has_bookings') === 'true'; } catch (_) { return false; }
};
