import type { ICalendarCacheEventRepository } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";
import type { PrismaClient } from "@calcom/prisma";
import type { CalendarCacheEvent } from "@calcom/prisma/client";

export class CalendarCacheEventRepository implements ICalendarCacheEventRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findAllBySelectedCalendarIds(
    selectedCalendarId: string[],
    start: Date,
    end: Date
  ): Promise<Pick<CalendarCacheEvent, "start" | "end" | "timeZone">[]> {
    return this.prismaClient.calendarCacheEvent.findMany({
      where: {
        selectedCalendarId: {
          in: selectedCalendarId,
        },
        start: {
          gte: start,
        },
        end: {
          lte: end,
        },
      },
      select: {
        start: true,
        end: true,
        timeZone: true,
      },
    });
  }

  async upsertMany(events: CalendarCacheEvent[]): Promise<void> {
    this.prismaClient.calendarCacheEvent.createMany({ data: events });
  }

  async deleteMany(events: Pick<CalendarCacheEvent, "externalId" | "selectedCalendarId">[]): Promise<void> {
    const conditions = events.filter((c) => c.externalId && c.selectedCalendarId);
    if (conditions.length === 0) {
      return;
    }

    this.prismaClient.calendarCacheEvent.deleteMany({
      where: {
        OR: conditions,
      },
    });
  }

  async deleteAllBySelectedCalendarId(selectedCalendarId: string): Promise<void> {
    this.prismaClient.calendarCacheEvent.deleteMany({
      where: {
        selectedCalendarId,
      },
    });
  }
}
