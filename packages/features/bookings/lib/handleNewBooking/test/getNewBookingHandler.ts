async function handler(input: any) {
  const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
  return handleNewBooking(input);
}

export function getNewBookingHandler() {
  return handler;
}
