import type { Prisma } from "@prisma/client";

import type { PrismaClient, PrismaTransaction } from "@calcom/prisma";

import type {
  ICalendarEventRepository,
  CalendarEventUpsertResult,
} from "./CalendarEventRepository.interface";

export class CalendarEventRepository implements ICalendarEventRepository {
  constructor(private prismaClient: PrismaClient) {}

  async upsertEvent(
    data: Prisma.CalendarEventCreateInput,
    subscriptionId: string,
    tx?: PrismaTransaction
  ): Promise<CalendarEventUpsertResult> {
    const client = tx || this.prismaClient;
    // Only persist scalar event fields; relation connect is handled explicitly
    const { calendarSubscription: _ignored, ...scalarFields } = data;

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
