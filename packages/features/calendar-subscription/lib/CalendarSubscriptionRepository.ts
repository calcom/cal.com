import type { CalendarSubscription, PrismaClient } from "@prisma/client";

import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";

export class CalendarSubscriptionRepository implements ICalendarSubscriptionRepository {
  constructor(private prisma: PrismaClient) {}
  async upsertBySelectedCalendarId(
    selectedCalendarId: string,
    calendarSubscription: Partial<CalendarSubscription>
  ): Promise<CalendarSubscription> {
    return await this.prisma.calendarSubscription.upsert({
      where: {
        selectedCalendarId,
      },
      update: {
        ...calendarSubscription,
        updatedAt: new Date(),
      },
      create: {
        selectedCalendarId,
        ...calendarSubscription,
      },
    });
  }
  async findBySelectedCalendarId(selectedCalendarId: string): Promise<CalendarSubscription | null> {
    return await this.prisma.calendarSubscription.findUnique({
      where: {
        selectedCalendarId,
      },
    });
  }
  async deleteBySelectedCalendarId(selectedCalendarId: string): Promise<void> {
    await this.prisma.calendarSubscription.delete({
      where: {
        selectedCalendarId,
      },
    });
  }
}
