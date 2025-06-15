import { PrismaClient } from "@prisma/client";
import type { EventBusyDate } from "@calcom/types/Calendar";

export class OutlookCacheService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // Helper method to normalize a Date to midnight (local time) without mutating the original
  private normalizeDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  async getCachedAvailability(
    userId: number,
    calendarId: string,
    date: Date
  ): Promise<EventBusyDate[] | null> {
    const normalizedDate = this.normalizeDate(date);

    const cache = await this.prisma.calendarAvailabilityCache.findUnique({
      where: {
        userId_calendarId_date: {
          userId,
          calendarId,
          date: normalizedDate,
        },
      },
    });

    if (!cache) {
      return null;
    }

    // Check if cache is stale (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (cache.lastUpdated < oneHourAgo) {
      return null;
    }

    return cache.availableSlots as EventBusyDate[];
  }

  async setCachedAvailability(
    userId: number,
    calendarId: string,
    date: Date,
    availableSlots: EventBusyDate[],
    subscriptionId?: string
  ): Promise<void> {
    const normalizedDate = this.normalizeDate(date);

    await this.prisma.calendarAvailabilityCache.upsert({
      where: {
        userId_calendarId_date: {
          userId,
          calendarId,
          date: normalizedDate,
        },
      },
      update: {
        availableSlots,
        lastUpdated: new Date(),
        subscriptionId,
      },
      create: {
        userId,
        calendarId,
        date: normalizedDate,
        availableSlots,
        subscriptionId,
      },
    });
  }

  async invalidateCache(userId: number, calendarId: string, date: Date): Promise<void> {
    const normalizedDate = this.normalizeDate(date);

    await this.prisma.calendarAvailabilityCache.delete({
      where: {
        userId_calendarId_date: {
          userId,
          calendarId,
          date: normalizedDate,
        },
      },
    });
  }

  async getSubscriptionId(userId: number, calendarId: string): Promise<string | null> {
    const cache = await this.prisma.calendarAvailabilityCache.findFirst({
      where: {
        userId,
        calendarId,
      },
      select: {
        subscriptionId: true,
      },
    });

    return cache?.subscriptionId || null;
  }

  async setSubscriptionId(
    userId: number,
    calendarId: string,
    subscriptionId: string
  ): Promise<void> {
    await this.prisma.calendarAvailabilityCache.updateMany({
      where: {
        userId,
        calendarId,
      },
      data: {
        subscriptionId,
      },
    });
  }
}
