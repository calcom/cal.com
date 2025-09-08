import type { ICalendarCacheEventRepository } from "calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";

import type { PrismaClient } from "@calcom/prisma";
import type { CalendarCacheEvent } from "@calcom/prisma/client";

export class CalendarCacheEventRepository implements ICalendarCacheEventRepository {
  constructor(private prismaClient: PrismaClient) {}

  async upsertMany(events: CalendarCacheEvent[]): Promise<void> {
    await this.prismaClient.calendarCacheEvent.createMany({
      data: events,
    });
  }

  async deleteMany(events: Pick<CalendarCacheEvent, "id">[]): Promise<void> {
    const ids = events.map((e) => e.id).filter((id): id is string => !!id);
    if (ids.length === 0) {
      return;
    }
    await this.prismaClient.calendarCacheEvent.deleteMany({
      where: {
        id: { in: ids },
      },
    });
  }

  async deleteAllBySelectedCalendarId(selectedCalendarId: string): Promise<void> {
    await this.prismaClient.calendarCacheEvent.deleteMany({
      where: {
        selectedCalendarId,
      },
    });
  }
}
