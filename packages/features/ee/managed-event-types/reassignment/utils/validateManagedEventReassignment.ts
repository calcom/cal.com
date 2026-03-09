import { BookingStatus } from "@calcom/prisma/enums";
import { type BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";

interface ValidateReassignmentParams {
  bookingId: number;
  bookingRepository: BookingRepository;
}

interface ValidateReassignmentResult {
  booking: {
    id: number;
    status: BookingStatus;
    recurringEventId: string | null;
    startTime: Date;
    endTime: Date;
  };
}

/**
 * Validates that a booking can be reassigned
 *
 * @throws Error if booking is already cancelled
 * @throws Error if booking has already ended
 * @throws Error if booking is recurring (Phase 1 limitation)
 */
export async function validateManagedEventReassignment({
  bookingId,
  bookingRepository,
}: ValidateReassignmentParams): Promise<ValidateReassignmentResult> {
  const booking = await bookingRepository.findByIdForReassignmentValidation(bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.status === BookingStatus.CANCELLED) {
    throw new Error("Cannot reassign already cancelled booking");
  }

  if (booking.endTime && new Date() > new Date(booking.endTime)) {
    throw new Error("Cannot reassign a booking that has already ended");
  }

  if (booking.recurringEventId) {
    throw new Error("Reassignment of recurring bookings is not yet supported for managed events");
  }

  return { booking };
}
