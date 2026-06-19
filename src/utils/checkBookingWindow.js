/**
 * checkBookingWindow — shared utility
 * Returns { open: boolean, reason: string|null } for a tier booking window.
 * Handles full ISO datetime strings stored in booking_open / booking_close.
 * If neither field is set, booking is always open.
 */
export function checkBookingWindow(tier, event) {
  const { booking_open, booking_close } = tier || {};
  const { booking_start, booking_end } = event || {};

  const now = new Date();

  // First check event-level booking window if event is provided
  if (booking_start) {
    const eventOpen = new Date(booking_start);
    if (!isNaN(eventOpen) && now < eventOpen) {
      return { open: false, reason: `Booking opens ${eventOpen.toLocaleString('en-IN')}` };
    }
  }
  if (booking_end) {
    const eventClose = new Date(booking_end);
    if (!isNaN(eventClose) && now > eventClose) {
      return { open: false, reason: `Booking closed ${eventClose.toLocaleString('en-IN')}` };
    }
  }

  // Then check tier-level booking window
  if (!booking_open && !booking_close) return { open: true, reason: null };

  const openTime  = booking_open  ? new Date(booking_open)  : null;
  const closeTime = booking_close ? new Date(booking_close) : null;

  if (openTime  && !isNaN(openTime)  && now < openTime)
    return { open: false, reason: `Opens ${openTime.toLocaleString('en-IN')}` };
  if (closeTime && !isNaN(closeTime) && now > closeTime)
    return { open: false, reason: `Closed ${closeTime.toLocaleString('en-IN')}` };

  return { open: true, reason: null };
}
