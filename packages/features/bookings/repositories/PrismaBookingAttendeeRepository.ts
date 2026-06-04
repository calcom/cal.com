import type { Prisma, PrismaClient } from "@calcom/prisma/client";
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

  async deleteByIdAndUpdateBookingResponses(
    attendeeId: number,
    bookingId: number,
    updatedResponses: Prisma.InputJsonValue
  ): Promise<void> {
    await this.prismaClient.$transaction([
      this.prismaClient.attendee.delete({
        where: { id: attendeeId },
      }),
      this.prismaClient.booking.update({
        where: { id: bookingId },
        data: {
          responses: updatedResponses,
        },
      }),
    ]);
  }
}
