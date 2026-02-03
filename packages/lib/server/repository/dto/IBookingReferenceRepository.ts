import type { Prisma } from "@calcom/prisma/client";

/**
 * Interface for Booking Reference repository operations
 */
export interface IBookingReferenceRepository {
  // ... Add existing methods as well here
  /**
   * Update all booking references associated with a booking
   * Used during booking cancellation cleanup to soft-delete references
   */
  updateManyByBookingId(
    bookingId: number,
    data: Prisma.BookingReferenceUpdateManyMutationInput
  ): Promise<void>;
}
