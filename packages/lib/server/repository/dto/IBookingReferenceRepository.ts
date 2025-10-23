import type { Prisma } from "@calcom/prisma/client";

/**
 * Generic interface for Booking Reference repository operations extending existing functionality
 * This interface defines additional operations needed for booking cancellation cleanup
 */
export interface IBookingReferenceRepository {
  /**
   * Update all booking references associated with a booking
   * Used during booking cancellation cleanup to soft-delete references
   */
  updateManyByBookingId(
    bookingId: number,
    data: Prisma.BookingReferenceUpdateManyMutationInput
  ): Promise<void>;
}
