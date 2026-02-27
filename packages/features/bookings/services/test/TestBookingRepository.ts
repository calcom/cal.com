import type { PrismaClient } from "@calcom/prisma";

/**
 * Test-only repository for Booking cleanup.
 * Used in integration tests to delete bookings and their attendees.
 * Booking creation uses BookingRepository.createBookingForManagedEventReassignment().
 */
export class TestBookingRepository {
  constructor(private prismaClient: PrismaClient) {}

  async deleteMany(ids: number[]) {
    if (ids.length === 0) return;
    await this.prismaClient.attendee.deleteMany({ where: { bookingId: { in: ids } } });
    await this.prismaClient.booking.deleteMany({ where: { id: { in: ids } } });
  }
}
