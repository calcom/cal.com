import type { PrismaClient } from "@calcom/prisma";

export class AttendeeRepository {
  private prisma: PrismaClient;

  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }

  async findByBookingIdAndSeatReference(
    bookingId: number,
    seatReferenceUid: string
  ): Promise<{ email: string }[]> {
    return this.prisma.attendee.findMany({
      where: {
        bookingId,
        bookingSeat: {
          referenceUid: seatReferenceUid,
        },
      },
      select: { email: true },
    });
  }
}


