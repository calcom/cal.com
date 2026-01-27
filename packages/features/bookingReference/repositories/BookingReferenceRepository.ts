import { prisma } from "@calcom/prisma";
import type { Prisma, PrismaClient } from "@calcom/prisma/client";
import type { PartialReference } from "@calcom/types/EventManager";

import type { IBookingReferenceRepository } from "@calcom/lib/server/repository/dto/IBookingReferenceRepository";

const bookingReferenceSelect = {
  id: true,
  type: true,
  uid: true,
  meetingId: true,
  meetingUrl: true,
  credentialId: true,
  deleted: true,
  bookingId: true,
} satisfies Prisma.BookingReferenceSelect;

const googleCalendarBackfillSelect = {
  id: true,
  uid: true,
  externalCalendarId: true,
  booking: {
    select: {
      id: true,
      uid: true,
      title: true,
      startTime: true,
      endTime: true,
      location: true,
      iCalUID: true,
      responses: true,
      metadata: true,
      userPrimaryEmail: true,
    },
  },
  credential: {
    select: {
      id: true,
      userId: true,
      key: true,
    },
  },
} satisfies Prisma.BookingReferenceSelect;

export interface BookingForBackfill {
  id: number;
  uid: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location: string | null;
  iCalUID: string | null;
  responses: Prisma.JsonValue;
  metadata: Prisma.JsonValue;
  userPrimaryEmail: string | null;
}

export interface BookingReferenceForBackfill {
  id: number;
  uid: string;
  externalCalendarId: string | null;
  booking: BookingForBackfill;
  credential: {
    id: number;
    userId: number | null;
    key: Prisma.JsonValue;
  };
}

export interface GoogleEventUpdateData {
  uid: string;
  externalCalendarId: string;
  meetingId: string | null;
  meetingUrl: string | null;
}

export class BookingReferenceRepository implements IBookingReferenceRepository {
  private prismaClient: PrismaClient;
  constructor(private deps: { prismaClient: PrismaClient }) {
    this.prismaClient = deps.prismaClient;
  }

  static async findDailyVideoReferenceByRoomName({ roomName }: { roomName: string }) {
    return prisma.bookingReference.findFirst({
      where: {
        type: "daily_video",
        uid: roomName,
        meetingId: roomName,
        bookingId: { not: null },
        deleted: null,
      },
      select: bookingReferenceSelect,
    });
  }

  /**
   * If rescheduling a booking with new references from the EventManager. Delete the previous references and replace them with new ones
   */
  static async replaceBookingReferences({
    bookingId,
    newReferencesToCreate,
  }: {
    bookingId: number;
    newReferencesToCreate: PartialReference[];
  }) {
    const newReferenceTypes = newReferencesToCreate.map((reference) => reference.type);

    await prisma.bookingReference.updateMany({
      where: {
        bookingId,
        type: {
          in: newReferenceTypes,
        },
      },
      data: {
        deleted: true,
      },
    });

    await prisma.bookingReference.createMany({
      data: newReferencesToCreate.map((reference) => {
        return { ...reference, bookingId };
      }),
    });
  }

  async updateManyByBookingId(
    bookingId: number,
    data: Prisma.BookingReferenceUpdateManyMutationInput
  ): Promise<void> {
    await this.prismaClient.bookingReference.updateMany({
      where: {
        bookingId,
      },
      data,
    });
  }

  async findUnsyncedGoogleCalendarReferencesIncludeBookingAndCredential(
    startDate: Date,
    endDate: Date
  ): Promise<BookingReferenceForBackfill[]> {
    const results = await this.prismaClient.bookingReference.findMany({
      where: {
        type: "google_calendar",
        externalCalendarId: { not: null },
        uid: "",
        credentialId: { not: null },
        booking: {
          status: "ACCEPTED",
          startTime: { gt: new Date() },
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      select: googleCalendarBackfillSelect,
    });

    return results as unknown as BookingReferenceForBackfill[];
  }

  async findUnremovedCancelledGoogleCalendarReferencesIncludeBookingAndCredential(
    startDate: Date,
    endDate: Date
  ): Promise<BookingReferenceForBackfill[]> {
    const results = await this.prismaClient.bookingReference.findMany({
      where: {
        type: "google_calendar",
        externalCalendarId: { not: null },
        uid: { not: "" },
        credentialId: { not: null },
        booking: {
          status: "CANCELLED",
          updatedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      select: googleCalendarBackfillSelect,
    });

    return results as unknown as BookingReferenceForBackfill[];
  }

  async updateWithGoogleEventData(id: number, data: GoogleEventUpdateData): Promise<void> {
    await this.prismaClient.bookingReference.update({
      where: { id },
      data: {
        uid: data.uid,
        externalCalendarId: data.externalCalendarId,
        meetingId: data.meetingId,
        meetingUrl: data.meetingUrl,
        deleted: false,
      },
    });
  }

  async markAsDeleted(id: number): Promise<void> {
    await this.prismaClient.bookingReference.update({
      where: { id },
      data: { deleted: true },
    });
  }
}
