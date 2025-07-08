import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["SlotCacheRepository"] });

const ONE_MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000;

export interface SlotCacheData {
  slots: Record<
    string,
    { time: string; availableCount?: number; totalHosts?: number; attendees?: number; bookingUid?: string }[]
  >;
  month: string;
  eventTypeId: number;
}

export interface StalenessScore {
  score: number;
  shouldRefresh: boolean;
}

export class SlotCacheRepository {
  async getCachedSlots(eventTypeId: number, month: string): Promise<SlotCacheData | null> {
    const key = this.generateSlotCacheKey(eventTypeId, month);

    try {
      const cached = await prisma.calendarCache.findFirst({
        where: {
          eventTypeId,
          key,
          cacheType: "slots",
          expiresAt: { gte: new Date() },
        },
      });

      if (!cached) {
        log.debug("No cached slots found", safeStringify({ eventTypeId, month }));
        return null;
      }

      log.debug("Found cached slots", safeStringify({ eventTypeId, month }));
      return cached.value as unknown as SlotCacheData;
    } catch (error) {
      log.error("Error getting cached slots", safeStringify({ error, eventTypeId, month }));
      return null;
    }
  }

  async upsertSlotCache(data: SlotCacheData): Promise<void> {
    const key = this.generateSlotCacheKey(data.eventTypeId, data.month);

    try {
      await prisma.calendarCache.upsert({
        where: {
          credentialId_key: {
            credentialId: -1,
            key,
          },
        },
        update: {
          value: data,
          expiresAt: new Date(Date.now() + ONE_MONTH_IN_MS),
          eventTypeId: data.eventTypeId,
          cacheType: "slots",
        },
        create: {
          credentialId: -1,
          key,
          value: data,
          expiresAt: new Date(Date.now() + ONE_MONTH_IN_MS),
          eventTypeId: data.eventTypeId,
          cacheType: "slots",
        },
      });

      log.debug("Upserted slot cache", safeStringify({ eventTypeId: data.eventTypeId, month: data.month }));
    } catch (error) {
      log.error(
        "Error upserting slot cache",
        safeStringify({ error, eventTypeId: data.eventTypeId, month: data.month })
      );
      throw error;
    }
  }

  calculateStalenessScore(slotData: SlotCacheData): StalenessScore {
    let totalStaleSlots = 0;
    let totalSlots = 0;

    Object.values(slotData.slots).forEach((daySlots) => {
      daySlots.forEach((slot) => {
        totalSlots++;
        if (slot.availableCount !== undefined && slot.totalHosts !== undefined) {
          const availabilityRatio = slot.totalHosts > 0 ? slot.availableCount / slot.totalHosts : 0;
          if (availabilityRatio < 0.2) {
            totalStaleSlots++;
          }
        }
      });
    });

    const score = totalSlots > 0 ? totalStaleSlots / totalSlots : 0;
    const shouldRefresh = score > 0.3;

    log.debug(
      "Calculated staleness score",
      safeStringify({
        score,
        shouldRefresh,
        totalStaleSlots,
        totalSlots,
        eventTypeId: slotData.eventTypeId,
      })
    );

    return { score, shouldRefresh };
  }

  private generateSlotCacheKey(eventTypeId: number, month: string): string {
    return `slots:${eventTypeId}:${month}`;
  }
}
