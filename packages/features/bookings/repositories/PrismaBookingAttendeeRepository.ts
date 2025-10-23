import type { PrismaClient } from "@calcom/prisma/client";

import type { IBookingAttendeeRepository } from "../lib/dto/IBookingAttendeeRepository";

export class PrismaBookingAttendeeRepository implements IBookingAttendeeRepository {
  constructor(private prismaClient: PrismaClient) {}

  async deleteManyByBookingId(bookingId: number): Promise<void> {
    await this.prismaClient.attendee.deleteMany({
      where: {
        bookingId,
      },
    });
  }
}
