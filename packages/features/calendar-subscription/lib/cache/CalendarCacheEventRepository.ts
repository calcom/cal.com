import type { ICalendarCacheEventRepository } from "calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";

import type { PrismaClient } from "@calcom/prisma";
import type { CalendarCacheEvent } from "@calcom/prisma/client";

export class CalendarCacheEventRepository implements ICalendarCacheEventRepository {
  constructor(private prismaClient: PrismaClient) {}

  async createMany(events: CalendarCacheEvent[]): Promise<void> {
    await this.prismaClient.calendarCacheEvent.createMany({
      data: events,
    });
  }
}
