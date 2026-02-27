import type { PrismaClient } from "@calcom/prisma";
import type { BookingStatus } from "@calcom/prisma/enums";

/**
 * Test-only repository for Booking creation and cleanup.
 * Used in integration tests where no generic production BookingRepository.create() exists.
 */
export class TestBookingRepository {
  constructor(private prismaClient: PrismaClient) {}

  async create(data: {
    uid: string;
    userId: number;
    eventTypeId: number;
    title: string;
    startTime: Date;
    endTime: Date;
    status: BookingStatus;
    attendees?: { email: string; name: string; timeZone: string }[];
  }) {
    const { attendees, ...bookingData } = data;
    return this.prismaClient.booking.create({
      data: {
        ...bookingData,
        ...(attendees && {
          attendees: {
            create: attendees,
          },
        }),
      },
      select: { id: true, uid: true },
    });
  }

  async deleteMany(ids: number[]) {
    if (ids.length === 0) return;
    await this.prismaClient.attendee.deleteMany({ where: { bookingId: { in: ids } } });
    await this.prismaClient.booking.deleteMany({ where: { id: { in: ids } } });
  }
}
