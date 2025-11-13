/**
 * Builds a booking link with query parameters
 * @param bookingUid - The unique identifier for the booking
 * @param allRemainingBookings - Whether to include all remaining bookings
 * @param email - Optional email of the attendee
 * @returns The formatted booking link with query parameters
 */
export function buildBookingLink({
  bookingUid,
  allRemainingBookings,
  email,
}: {
  bookingUid: string;
  allRemainingBookings: boolean;
  email?: string | null;
}): string {
  const urlSearchParams = new URLSearchParams({
    allRemainingBookings: allRemainingBookings.toString(),
  });
  if (email) {
    urlSearchParams.set("email", email);
  }
  return `/booking/${bookingUid}?${urlSearchParams.toString()}`;
}
