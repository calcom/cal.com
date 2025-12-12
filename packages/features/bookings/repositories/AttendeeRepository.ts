import type { PrismaClient } from "@calcom/prisma";

export class AttendeeRepository {
  constructor(private readonly prisma: PrismaClient) { }

  async findByBookingAndEmail(params: {
    bookingId: number;
    email: string;
  }): Promise<{ id: number } | null> {
    return this.prisma.attendee.findFirst({
      where: {
        bookingId: params.bookingId,
        email: params.email,
      },
      select: { id: true },
    });
  }
}
