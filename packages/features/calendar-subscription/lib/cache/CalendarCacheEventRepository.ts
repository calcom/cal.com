import type { ICalendarCacheEventRepository } from "@calcom/features/calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";
import type { PrismaClient } from "@calcom/prisma";
import type { CalendarCacheEvent } from "@calcom/prisma/client";

export class CalendarCacheEventRepository implements ICalendarCacheEventRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findAllBySelectedCalendarIdsBetween(
    selectedCalendarId: string[],
    start: Date,
    end: Date
  ): Promise<Pick<CalendarCacheEvent, "start" | "end" | "timeZone">[]> {
    return this.prismaClient.calendarCacheEvent.findMany({
      where: {
        selectedCalendarId: {
          in: selectedCalendarId,
        },
        AND: [{ start: { lt: end } }, { end: { gt: start } }],
      },
      select: {
        start: true,
        end: true,
        timeZone: true,
      },
    });
  }

  async upsertMany(events: CalendarCacheEvent[]) {
    if (events.length === 0) {
      return;
    }
    // lack of upsertMany in prisma
    return Promise.allSettled(
      events.map((event) => {
        return this.prismaClient.calendarCacheEvent.upsert({
          where: {
            selectedCalendarId_externalId: {
              externalId: event.externalId,
              selectedCalendarId: event.selectedCalendarId,
            },
          },
          update: {
            start: event.start,
            end: event.end,
            summary: event.summary,
            description: event.description,
            location: event.location,
            isAllDay: event.isAllDay,
            timeZone: event.timeZone,
          },
          create: event,
        });
      })
    );
  }

  async deleteMany(events: Pick<CalendarCacheEvent, "externalId" | "selectedCalendarId">[]) {
    // Only delete events with externalId and selectedCalendarId
    const conditions = events.filter((c) => c.externalId && c.selectedCalendarId);
    if (conditions.length === 0) {
      return;
    }

    return this.prismaClient.calendarCacheEvent.deleteMany({
      where: {
        OR: conditions,
      },
    });
  }

  async deleteAllBySelectedCalendarId(selectedCalendarId: string) {
    if (!selectedCalendarId) {
      return;
    }

    return this.prismaClient.calendarCacheEvent.deleteMany({
      where: {
        selectedCalendarId,
      },
    });
  }

  async deleteStale() {
    return this.prismaClient.calendarCacheEvent.deleteMany({
      where: {
        end: { lte: new Date() },
      },
    });
  }
}
