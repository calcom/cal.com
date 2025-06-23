import type { Prisma } from "@prisma/client";

import type { IFromUser, IToUser } from "@calcom/lib/getUserAvailability";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

import { generateSlotCacheKey, expandDateRangeForCache } from "./slot-cache-key";
import type { SlotCacheKeyParams } from "./slot-cache-key";

const log = logger.getSubLogger({ prefix: ["SlotCacheRepository"] });

export interface CachedSlot {
  time: string; // ISO string in UTC
  userIds?: number[];
  away?: boolean;
  fromUser?: IFromUser;
  toUser?: IToUser;
  reason?: string;
  emoji?: string;
}

export class SlotCacheRepository {
  async getCachedSlotsForUser(params: SlotCacheKeyParams): Promise<CachedSlot[] | null> {
    const cacheKey = generateSlotCacheKey(params);
    const { expandedStart, expandedEnd } = expandDateRangeForCache(params.startDate, params.endDate);

    const cached = await prisma.slotCache.findUnique({
      where: {
        eventTypeId_userId_cacheKey: {
          eventTypeId: params.eventTypeId,
          userId: params.userId,
          cacheKey,
        },
      },
    });

    if (!cached) return null;

    if (cached.startDate > new Date(expandedStart) || cached.endDate < new Date(expandedEnd)) {
      return null;
    }

    const slots = cached.slots as unknown as CachedSlot[];
    return slots.filter((slot) => {
      const slotTime = new Date(slot.time);
      return slotTime >= new Date(params.startDate) && slotTime <= new Date(params.endDate);
    });
  }

  async getCachedSlotsForTeamEvent(
    eventTypeId: number,
    userIds: number[],
    baseParams: Omit<SlotCacheKeyParams, "userId">
  ): Promise<Map<number, CachedSlot[]> | null> {
    const userSlots = new Map<number, CachedSlot[]>();

    for (const userId of userIds) {
      const userParams = { ...baseParams, userId, eventTypeId };
      const slots = await this.getCachedSlotsForUser(userParams);
      if (!slots) return null; // If any user missing cache, return null
      userSlots.set(userId, slots);
    }

    return userSlots;
  }

  async setCachedSlotsForUser(params: SlotCacheKeyParams, slots: CachedSlot[]): Promise<void> {
    const cacheKey = generateSlotCacheKey(params);
    const { expandedStart, expandedEnd } = expandDateRangeForCache(params.startDate, params.endDate);

    await prisma.slotCache.upsert({
      where: {
        eventTypeId_userId_cacheKey: {
          eventTypeId: params.eventTypeId,
          userId: params.userId,
          cacheKey,
        },
      },
      update: {
        slots: slots as unknown as Prisma.InputJsonValue,
        startDate: new Date(expandedStart),
        endDate: new Date(expandedEnd),
      },
      create: {
        eventTypeId: params.eventTypeId,
        userId: params.userId,
        cacheKey,
        slots: slots as unknown as Prisma.InputJsonValue,
        startDate: new Date(expandedStart),
        endDate: new Date(expandedEnd),
      },
    });
  }

  async invalidateEventTypeSlots(eventTypeId: number): Promise<void> {
    await prisma.slotCache.deleteMany({
      where: { eventTypeId },
    });
  }

  async invalidateUserSlots(userId: number): Promise<void> {
    await prisma.slotCache.deleteMany({
      where: { userId },
    });
  }
}
