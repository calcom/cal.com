import short from "short-uuid";

import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";

import type {
  IBookingIntentRepository,
  BookingIntentForViewing,
  BookingIntentAttendee,
} from "./BookingIntentRepository.interface";

export class PrismaBookingIntentRepository implements IBookingIntentRepository {
  constructor(private readonly prismaClient: PrismaClient = prisma) {}

  async create(data: Parameters<IBookingIntentRepository["create"]>[0]) {
    return await this.prismaClient.bookingIntent.create({
      data: {
        uid: short.uuid(),
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        status: data.status,
        organizerName: data.organizerName,
        organizerEmail: data.organizerEmail,
        attendees: data.attendees,
        responses: data.responses,
        metadata: data.metadata,
        description: data.description,
        ...(data.eventType && { eventType: data.eventType }),
        ...(data.watchlistEventAudit && { watchlistEventAudit: data.watchlistEventAudit }),
      },
    });
  }

  async getByUid(uid: string) {
    return await this.prismaClient.bookingIntent.findUnique({
      where: { uid },
    });
  }

  async getByUidForViewing(uid: string): Promise<BookingIntentForViewing | null> {
    const result = await this.prismaClient.bookingIntent.findUnique({
      where: { uid },
      select: {
        id: true,
        uid: true,
        title: true,
        startTime: true,
        endTime: true,
        location: true,
        status: true,
        description: true,
        metadata: true,
        responses: true,
        organizerName: true,
        organizerEmail: true,
        attendees: true,
        eventTypeId: true,
        eventType: {
          select: {
            eventName: true,
            slug: true,
            timeZone: true,
            schedulingType: true,
            hideOrganizerEmail: true,
          },
        },
      },
    });

    if (!result) {
      return null;
    }

    const attendees = Array.isArray(result.attendees) ? result.attendees : [];
    const typedAttendees = attendees.map((attendee) => {
      const typedAttendee = attendee as BookingIntentAttendee;
      return {
        name: typedAttendee.name || "",
        email: typedAttendee.email || "",
        timeZone: typedAttendee.timeZone || "UTC",
        phoneNumber: typedAttendee.phoneNumber || null,
      };
    });

    return {
      ...result,
      status: result.status.toString(),
      attendees: typedAttendees,
    };
  }
}
