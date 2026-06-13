/**
 * checkBookingWindow — shared utility
 * Returns { open: boolean, reason: string|null } for a tier booking window.
 * Handles full ISO datetime strings stored in booking_open / booking_close.
 * If neither field is set, booking is always open.
 */
export function checkBookingWindow(tier) {
  const { booking_open, booking_close } = tier || {};
  if (!booking_open && !booking_close) return { open: true, reason: null };

  const now = new Date();
  const openTime  = booking_open  ? new Date(booking_open)  : null;
  const closeTime = booking_close ? new Date(booking_close) : null;

  if (openTime  && !isNaN(openTime)  && now < openTime)
    return { open: false, reason: `Opens ${openTime.toLocaleString('en-IN')}` };
  if (closeTime && !isNaN(closeTime) && now > closeTime)
    return { open: false, reason: `Closed ${closeTime.toLocaleString('en-IN')}` };

  return { open: true, reason: null };
}
