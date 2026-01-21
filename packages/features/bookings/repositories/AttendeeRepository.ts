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

  async findByBookingIdAndSeatReference({
    bookingId,
    seatReferenceUid,
  }: {
    bookingId: number;
    seatReferenceUid: string;
  }): Promise<{ email: string }[]> {
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

  async findByBookingUidAndEmails({
    bookingUid,
    emails,
  }: {
    bookingUid: string;
    emails: string[];
  }): Promise<{ id: number; email: string; noShow: boolean | null }[]> {
    return this.prismaClient.attendee.findMany({
      where: {
        booking: { uid: bookingUid },
        email: { in: emails },
      },
      select: { id: true, email: true, noShow: true },
    });
  }

  async updateNoShow({
    attendeeId,
    noShow,
  }: {
    attendeeId: number;
    noShow: boolean;
  }): Promise<{ noShow: boolean | null; email: string }> {
    return this.prismaClient.attendee.update({
      where: { id: attendeeId },
      data: { noShow },
      select: { noShow: true, email: true },
    });
  }

  async findByIdWithNoShow(id: number): Promise<{ id: number; noShow: boolean | null } | null> {
    return this.prismaClient.attendee.findUnique({
      where: { id },
      select: { id: true, noShow: true },
    });
  }

  async findByBookingId(bookingId: number): Promise<{ id: number; email: string; noShow: boolean | null }[]> {
    return this.prismaClient.attendee.findMany({
      where: { bookingId },
      select: { id: true, email: true, noShow: true },
    });
  }

  async findByBookingIdWithDetails(bookingId: number): Promise<
    {
      id: number;
      email: string;
      name: string;
      locale: string | null;
      timeZone: string;
      phoneNumber: string | null;
      bookingId: number | null;
      noShow: boolean | null;
    }[]
  > {
    return this.prismaClient.attendee.findMany({
      where: { bookingId },
      select: {
        id: true,
        email: true,
        name: true,
        locale: true,
        timeZone: true,
        phoneNumber: true,
        bookingId: true,
        noShow: true,
      },
    });
  }

  async updateManyNoShowByBookingIdAndEmails({
    bookingId,
    emails,
    noShow,
  }: {
    bookingId: number;
    emails: string[];
    noShow: boolean;
  }): Promise<{ count: number }> {
    return this.prismaClient.attendee.updateMany({
      where: {
        bookingId,
        email: { in: emails },
      },
      data: { noShow },
    });
  }

  async updateManyNoShowByBookingIdExcludingEmails({
    bookingId,
    excludeEmails,
    noShow,
  }: {
    bookingId: number;
    excludeEmails: string[];
    noShow: boolean;
  }): Promise<{ count: number }> {
    return this.prismaClient.attendee.updateMany({
      where: {
        bookingId,
        email: { notIn: excludeEmails },
      },
      data: { noShow },
    });
  }
}
