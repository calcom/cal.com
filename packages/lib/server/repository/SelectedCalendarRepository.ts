import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export class SelectedCalendarRepository {
  constructor(private prismaClient: PrismaClient) {}
  async findFirst(args: { where: Prisma.SelectedCalendarWhereInput }) {
    return this.prismaClient.selectedCalendar.findFirst({
      where: args.where,
      select: { id: true, externalId: true, credentialId: true },
    });
  }

  async findMany(args: { where: Prisma.SelectedCalendarWhereInput }) {
    return this.prismaClient.selectedCalendar.findMany({
      where: args.where,
      select: { id: true, externalId: true, credentialId: true },
    });
  }

  async getNextBatchForSqlCache(limit = 100) {
    const nextBatch = await this.prismaClient.selectedCalendar.findMany({
      take: limit,
      where: {
        user: {
          teams: {
            some: {
              team: {
                features: {
                  some: {
                    featureId: "calendar-cache-sql-write",
                  },
                },
              },
            },
          },
        },
        integration: "google_calendar",
        eventTypeId: null,
        calendarSubscription: null, // Only get selected calendars that don't have a subscription
      },
    });
    return nextBatch;
  }
}
