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

    return await client.calendarEvent.upsert({
      where: {
        calendarSubscriptionId_googleEventId: {
          calendarSubscriptionId: subscriptionId,
          googleEventId: data.googleEventId,
        },
      },
      create: {
        ...scalarFields,
        calendarSubscription: { connect: { id: subscriptionId } },
        ...(creator
          ? {
              creator: {
                create: {
                  email: creator.create?.email ?? null,
                  displayName: creator.create?.displayName ?? null,
                  isSelf: creator.create?.isSelf ?? false,
                  isOrganizer: creator.create?.isOrganizer ?? false,
                },
              },
            }
          : {}),
        ...(organizer
          ? {
              organizer: {
                create: {
                  email: organizer.create?.email ?? null,
                  displayName: organizer.create?.displayName ?? null,
                  isSelf: organizer.create?.isSelf ?? false,
                  isOrganizer: true,
                },
              },
            }
          : {}),
        ...(attendees?.createMany?.data?.length
          ? {
              attendees: {
                createMany: {
                  data: attendees.createMany.data,
                  skipDuplicates: true,
                },
              },
            }
          : {}),
      },
      update: {
        ...scalarFields,
        // Ensure relations are updated without violating unique constraints
        ...(creator
          ? {
              creator: {
                upsert: {
                  update: {
                    email: creator.create?.email ?? null,
                    displayName: creator.create?.displayName ?? null,
                    isSelf: creator.create?.isSelf ?? false,
                    isOrganizer: creator.create?.isOrganizer ?? false,
                  },
                  create: {
                    email: creator.create?.email ?? null,
                    displayName: creator.create?.displayName ?? null,
                    isSelf: creator.create?.isSelf ?? false,
                    isOrganizer: creator.create?.isOrganizer ?? false,
                  },
                },
              },
            }
          : {
              // If no creator provided, remove any existing creator participant
              creator: { delete: true },
            }),
        ...(organizer
          ? {
              organizer: {
                upsert: {
                  update: {
                    email: organizer.create?.email ?? null,
                    displayName: organizer.create?.displayName ?? null,
                    isSelf: organizer.create?.isSelf ?? false,
                    isOrganizer: true,
                  },
                  create: {
                    email: organizer.create?.email ?? null,
                    displayName: organizer.create?.displayName ?? null,
                    isSelf: organizer.create?.isSelf ?? false,
                    isOrganizer: true,
                  },
                },
              },
            }
          : {
              // If no organizer provided, remove any existing organizer participant
              organizer: { delete: true },
            }),
        // Replace attendees to keep data in sync
        attendees: {
          deleteMany: {},
          ...(attendees?.createMany?.data?.length
            ? {
                createMany: {
                  data: attendees.createMany.data,
                  skipDuplicates: true,
                },
              }
            : {}),
        },
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
