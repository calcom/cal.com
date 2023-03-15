export type BookingResponse = Awaited<
  ReturnType<typeof import("@calcom/features/bookings/lib/handleNewBooking").default>
>;
