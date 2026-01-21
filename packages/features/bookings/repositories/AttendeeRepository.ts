import type { PrismaClient } from "@calcom/prisma";
import type { IAttendeeRepository } from "./IAttendeeRepository";

/**
 * Prisma-based implementation of IAttendeeRepository
 *
 * This repository provides methods for looking up attendee information.
 */
export class AttendeeRepository implements IAttendeeRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findById(id: number): Promise<{ name: string; email: string } | null> {
    const attendee = await this.prismaClient.attendee.findUnique({
      where: { id },
      select: {
        name: true,
        email: true,
      },
    });

    return attendee;
  }

  async findByBookingIdAndSeatReference(
    bookingId: number,
    seatReferenceUid: string
  ): Promise<{ email: string }[]> {
    return this.prismaClient.attendee.findMany({
      where: {
        bookingId,
        bookingSeat: {
          referenceUid: seatReferenceUid,
        },
      },
      select: { email: true },
    });
  }

  async findByBookingUidAndEmails(
    bookingUid: string,
    emails: string[]
  ): Promise<{ id: number; email: string; noShow: boolean | null }[]> {
    return this.prismaClient.attendee.findMany({
      where: {
        booking: { uid: bookingUid },
        email: { in: emails },
      },
      select: { id: true, email: true, noShow: true },
    });
  }

  async findIdAndEmailByBookingUidAndEmails(
    bookingUid: string,
    emails: string[]
  ): Promise<{ id: number; email: string }[]> {
    return this.prismaClient.attendee.findMany({
      where: {
        booking: { uid: bookingUid },
        email: { in: emails },
      },
      select: { id: true, email: true },
    });
  }

  async updateNoShow(attendeeId: number, noShow: boolean): Promise<{ noShow: boolean; email: string }> {
    return this.prismaClient.attendee.update({
      where: { id: attendeeId },
      data: { noShow },
      select: { noShow: true, email: true },
    });
  }
}
