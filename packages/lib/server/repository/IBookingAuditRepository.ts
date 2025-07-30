import type { BookingAudit, Prisma } from "@prisma/client";

export interface IBookingAuditRepository {
  /**
   * Creates a new booking audit record
   */
  create(bookingAudit: Prisma.BookingAuditCreateInput): Promise<BookingAudit>;
}
