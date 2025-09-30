/**
 * Generic interface for Booking Reference repository operations extending existing functionality
 * This interface defines additional operations needed for booking cancellation cleanup
 */
export interface IBookingReferenceRepository {
  /**
   * Delete all booking references associated with a booking
   * Used during booking cancellation cleanup
   */
  deleteManyByBookingId(bookingId: number): Promise<void>;
}
