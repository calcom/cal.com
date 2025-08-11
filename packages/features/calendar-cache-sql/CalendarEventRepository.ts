import type { Prisma } from "@prisma/client";

import type { PrismaClient } from "@calcom/prisma";

import type {
  ICalendarEventRepository,
  CalendarEventUpsertResult,
} from "./CalendarEventRepository.interface";

export class CalendarEventRepository implements ICalendarEventRepository {
  constructor(private prismaClient: PrismaClient) {}

  async upsertEvent(
    data: Prisma.CalendarEventCreateInput,
    subscriptionId: string,
    tx?: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
  ): Promise<CalendarEventUpsertResult> {
    const client = tx || this.prismaClient;
    // Split participant relations from scalar fields so we can handle nested writes safely on update
    const { creator, organizer, attendees, calendarSubscription: _ignored, ...scalarFields } = data;

    const event = await client.calendarEvent.upsert({
      where: {
        calendarSubscriptionId_googleEventId: {
          calendarSubscriptionId: subscriptionId,
          googleEventId: data.googleEventId,
        },
      },
      create: {
        ...scalarFields,
        calendarSubscription: { connect: { id: subscriptionId } },
      },
      update: {
        ...scalarFields,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        googleEventId: true,
        etag: true,
        start: true,
        end: true,
        summary: true,
        status: true,
        updatedAt: true,
      },
    });

    // After upsert, update/replace participants according to input
    const eventId = event.id;

    // Creator
    {
      const existingCreators = await client.calendarEventParticipant.findMany({
        where: { creatorOfId: eventId },
      });
      for (const row of existingCreators) {
        await client.calendarEventParticipant.delete({ where: { id: row.id } });
      }
    }
    if (creator) {
      await client.calendarEventParticipant.create({
        data: {
          creatorOfId: eventId,
          email: creator.create?.email ?? null,
          displayName: creator.create?.displayName ?? null,
          isSelf: creator.create?.isSelf ?? false,
          isOrganizer: creator.create?.isOrganizer ?? false,
        },
      });
    }

    // Organizer
    {
      const existingOrganizers = await client.calendarEventParticipant.findMany({
        where: { organizerOfId: eventId },
      });
      for (const row of existingOrganizers) {
        await client.calendarEventParticipant.delete({ where: { id: row.id } });
      }
    }
    if (organizer) {
      await client.calendarEventParticipant.create({
        data: {
          organizerOfId: eventId,
          email: organizer.create?.email ?? null,
          displayName: organizer.create?.displayName ?? null,
          isSelf: organizer.create?.isSelf ?? false,
          isOrganizer: true,
        },
      });
    }

    // Attendees
    {
      const existingAttendees = await client.calendarEventParticipant.findMany({
        where: { attendeeOfId: eventId },
      });
      for (const row of existingAttendees) {
        await client.calendarEventParticipant.delete({ where: { id: row.id } });
      }
    }
    if (attendees?.createMany?.data?.length) {
      await client.calendarEventParticipant.createMany({
        data: attendees.createMany.data.map(
          (a: {
            email?: string | null;
            displayName?: string | null;
            responseStatus?: string | null;
            isOrganizer?: boolean;
            isSelf?: boolean;
          }) => ({
            attendeeOfId: eventId,
            email: a.email ?? null,
            displayName: a.displayName ?? null,
            responseStatus: a.responseStatus ?? null,
            isOrganizer: a.isOrganizer ?? false,
            isSelf: a.isSelf ?? false,
          })
        ),
        skipDuplicates: true,
      });
    }

    return event;
  }

  async getEventsForAvailability(calendarSubscriptionId: string, start: Date, end: Date) {
    return await this.prismaClient.calendarEvent.findMany({
      where: {
        calendarSubscriptionId,
        status: { not: "cancelled" },
        transparency: "opaque",
        end: { gt: new Date() }, // Only include events that haven't ended yet
        OR: [
          {
            start: { gte: start, lt: end },
          },
          {
            end: { gt: start, lte: end },
          },
          {
            start: { lt: start },
            end: { gt: end },
          },
        ],
      },
      select: {
        start: true,
        end: true,
        summary: true,
        calendarSubscriptionId: true,
        timeZone: true,
      },
      orderBy: { start: "asc" },
    });
  }

  async getEventsForAvailabilityBatch(subscriptionIds: string[], start: Date, end: Date) {
    return await this.prismaClient.calendarEvent.findMany({
      where: {
        calendarSubscriptionId: { in: subscriptionIds },
        status: { not: "cancelled" },
        transparency: "opaque",
        end: { gt: new Date() }, // Only include events that haven't ended yet
        OR: [
          {
            start: { gte: start, lt: end },
          },
          {
            end: { gt: start, lte: end },
          },
          {
            start: { lt: start },
            end: { gt: end },
          },
        ],
      },
      select: {
        start: true,
        end: true,
        summary: true,
        calendarSubscriptionId: true,
        timeZone: true,
      },
      orderBy: { start: "asc" },
    });
  }

  async deleteEvent(calendarSubscriptionId: string, googleEventId: string) {
    await this.prismaClient.calendarEvent.delete({
      where: {
        calendarSubscriptionId_googleEventId: {
          calendarSubscriptionId,
          googleEventId,
        },
      },
    });
  }

  async bulkUpsertEvents(events: Prisma.CalendarEventCreateInput[], subscriptionId: string) {
    if (events.length === 0) return;

    return await this.prismaClient.$transaction(async (tx) => {
      const operations = events.map((event) => this.upsertEvent(event, subscriptionId, tx));
      await Promise.all(operations);
    });
  }

  async cleanupOldEvents() {
    // Delete cancelled events that have ended more than 24 hours ago
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await this.prismaClient.calendarEvent.deleteMany({
      where: {
        OR: [
          {
            status: "cancelled",
            end: { lt: cutoffDate },
          },
          {
            end: { lt: new Date() }, // Delete any past events (regardless of status)
          },
        ],
      },
    });
  }
}
