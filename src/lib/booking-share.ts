/** Links used to hand a booking to the rider outside the app. */

/** The hub kiosk deep link for a booking — this is what the QR encodes. */
export function kioskLink(bookingCode: string) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/kiosk?code=${encodeURIComponent(bookingCode)}`;
}

/** WhatsApp share of the booking, so the rider carries the QR link in chat. */
export function whatsappBookingLink(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
