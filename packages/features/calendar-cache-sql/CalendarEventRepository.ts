import type { Prisma } from "@prisma/client";
import { captureException } from "@sentry/nextjs";

import type { PrismaClient } from "@calcom/prisma";

import type { ICalendarEventRepository } from "./CalendarEventRepository.interface";

export class CalendarEventRepository implements ICalendarEventRepository {
  constructor(private prismaClient: PrismaClient) {}

  async upsertEvent(
    data: Prisma.CalendarEventCreateInput,
    subscriptionId: string,
    tx?: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">
  ) {
    try {
      const client = tx || this.prismaClient;
      return await client.calendarEvent.upsert({
        where: {
          calendarSubscriptionId_googleEventId: {
            calendarSubscriptionId: subscriptionId,
            googleEventId: data.googleEventId,
          },
        },
        create: {
          ...data,
          calendarSubscription: { connect: { id: subscriptionId } },
          etag: data.etag || "",
        },
        update: {
          ...data,
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async getEventsForAvailability(calendarSubscriptionId: string, start: Date, end: Date) {
    try {
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
        },
        orderBy: { start: "asc" },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async getEventsForAvailabilityBatch(subscriptionIds: string[], start: Date, end: Date) {
    try {
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
        },
        orderBy: { start: "asc" },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async deleteEvent(calendarSubscriptionId: string, googleEventId: string) {
    try {
      await this.prismaClient.calendarEvent.delete({
        where: {
          calendarSubscriptionId_googleEventId: {
            calendarSubscriptionId,
            googleEventId,
          },
        },
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async bulkUpsertEvents(events: Prisma.CalendarEventCreateInput[], subscriptionId: string) {
    try {
      if (events.length === 0) return;

      return await this.prismaClient.$transaction(async (tx) => {
        const operations = events.map((event) => this.upsertEvent(event, subscriptionId, tx));
        await Promise.all(operations);
      });
    } catch (err) {
      captureException(err);
      throw err;
    }
  }

  async cleanupOldEvents() {
    try {
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
    } catch (err) {
      captureException(err);
      throw err;
    }
  }
}
