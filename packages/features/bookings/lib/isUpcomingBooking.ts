import { BookingStatus } from "@calcom/prisma/enums";

export const UPCOMING_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.ACCEPTED,
  BookingStatus.PENDING,
  BookingStatus.AWAITING_HOST,
];

export function isUpcomingBooking(booking: { status: string; startTime: Date }): boolean {
  return (
    UPCOMING_BOOKING_STATUSES.includes(booking.status as BookingStatus) &&
    new Date(booking.startTime) > new Date()
  );
}
