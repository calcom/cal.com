export type BookingResponse = Awaited<
  ReturnType<
    typeof import("@calcom/features/bookings/lib/service/BookingCreateService/utils/handleNewBooking").default
  >
>;
