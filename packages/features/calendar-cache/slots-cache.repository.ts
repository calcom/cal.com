import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["SlotsCacheRepository"] });

const ONE_MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000;

export interface SlotCacheEntry {
  slotTime: string;
  availableCount: number;
  totalHosts: number;
}

export interface StalenessScore {
  score: number;
  shouldRefresh: boolean;
}

export class SlotsCacheRepository {
  async getCachedSlotsForMonth(eventTypeId: number, month: string): Promise<SlotCacheEntry[]> {
    try {
      const cached = await prisma.slotsCache.findMany({
        where: {
          eventTypeId,
          month,
          expiresAt: { gte: new Date() },
        },
        orderBy: { slotTime: "asc" },
      });

      log.debug("Found cached slots", safeStringify({ eventTypeId, month, count: cached.length }));

      return cached.map((slot) => ({
        slotTime: slot.slotTime.toISOString(),
        availableCount: slot.availableCount,
        totalHosts: slot.totalHosts,
      }));
    } catch (error) {
      log.error("Error getting cached slots", safeStringify({ error, eventTypeId, month }));
      return [];
    }
  }

  async getCachedSlotsForDate(eventTypeId: number, date: string): Promise<SlotCacheEntry[]> {
    try {
      const cached = await prisma.slotsCache.findMany({
        where: {
          eventTypeId,
          date,
          expiresAt: { gte: new Date() },
        },
        orderBy: { slotTime: "asc" },
      });

      return cached.map((slot) => ({
        slotTime: slot.slotTime.toISOString(),
        availableCount: slot.availableCount,
        totalHosts: slot.totalHosts,
      }));
    } catch (error) {
      log.error("Error getting cached slots for date", safeStringify({ error, eventTypeId, date }));
      return [];
    }
  }

  async upsertSlotCache(
    eventTypeId: number,
    slotTime: string,
    availableCount: number,
    totalHosts: number
  ): Promise<void> {
    const slotDateTime = dayjs(slotTime);
    const date = slotDateTime.format("YYYY-MM-DD");
    const month = slotDateTime.format("YYYY-MM");

    try {
      await prisma.slotsCache.upsert({
        where: {
          eventTypeId_slotTime: {
            eventTypeId,
            slotTime: slotDateTime.toDate(),
          },
        },
        update: {
          availableCount,
          totalHosts,
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + ONE_MONTH_IN_MS),
        },
        create: {
          eventTypeId,
          slotTime: slotDateTime.toDate(),
          date,
          month,
          availableCount,
          totalHosts,
          expiresAt: new Date(Date.now() + ONE_MONTH_IN_MS),
        },
      });

      log.debug(
        "Upserted slot cache",
        safeStringify({
          eventTypeId,
          slotTime,
          availableCount,
          totalHosts,
        })
      );
    } catch (error) {
      log.error(
        "Error upserting slot cache",
        safeStringify({
          error,
          eventTypeId,
          slotTime,
          availableCount,
          totalHosts,
        })
      );
      throw error;
    }
  }

  async batchUpsertSlots(eventTypeId: number, slots: SlotCacheEntry[]): Promise<void> {
    try {
      const operations = slots.map((slot) => {
        const slotDateTime = dayjs(slot.slotTime);
        const date = slotDateTime.format("YYYY-MM-DD");
        const month = slotDateTime.format("YYYY-MM");

        return prisma.slotsCache.upsert({
          where: {
            eventTypeId_slotTime: {
              eventTypeId,
              slotTime: slotDateTime.toDate(),
            },
          },
          update: {
            availableCount: slot.availableCount,
            totalHosts: slot.totalHosts,
            updatedAt: new Date(),
            expiresAt: new Date(Date.now() + ONE_MONTH_IN_MS),
          },
          create: {
            eventTypeId,
            slotTime: slotDateTime.toDate(),
            date,
            month,
            availableCount: slot.availableCount,
            totalHosts: slot.totalHosts,
            expiresAt: new Date(Date.now() + ONE_MONTH_IN_MS),
          },
        });
      });

      await prisma.$transaction(operations);

      log.debug(
        "Batch upserted slot cache",
        safeStringify({
          eventTypeId,
          slotCount: slots.length,
        })
      );
    } catch (error) {
      log.error(
        "Error batch upserting slot cache",
        safeStringify({
          error,
          eventTypeId,
          slotCount: slots.length,
        })
      );
      throw error;
    }
  }

  async updateSlotAvailability(eventTypeId: number, slotTime: string, availableCount: number): Promise<void> {
    try {
      const slotDateTime = dayjs(slotTime);

      await prisma.slotsCache.updateMany({
        where: {
          eventTypeId,
          slotTime: slotDateTime.toDate(),
          expiresAt: { gte: new Date() },
        },
        data: {
          availableCount,
          updatedAt: new Date(),
        },
      });

      log.debug(
        "Updated slot availability",
        safeStringify({
          eventTypeId,
          slotTime,
          availableCount,
        })
      );
    } catch (error) {
      log.error(
        "Error updating slot availability",
        safeStringify({
          error,
          eventTypeId,
          slotTime,
          availableCount,
        })
      );
      throw error;
    }
  }

  calculateStalenessScore(slots: SlotCacheEntry[]): StalenessScore {
    if (slots.length === 0) {
      return { score: 1, shouldRefresh: true };
    }

    let totalStaleSlots = 0;
    const totalSlots = slots.length;

    slots.forEach((slot) => {
      const availabilityRatio = slot.totalHosts > 0 ? slot.availableCount / slot.totalHosts : 0;
      if (availabilityRatio < 0.2) {
        totalStaleSlots++;
      }
    });

    const score = totalStaleSlots / totalSlots;
    const shouldRefresh = score > 0.3;

    log.debug(
      "Calculated staleness score",
      safeStringify({
        score,
        shouldRefresh,
        totalStaleSlots,
        totalSlots,
      })
    );

    return { score, shouldRefresh };
  }

  async cleanupExpiredSlots(): Promise<void> {
    try {
      const result = await prisma.slotsCache.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });

      log.debug("Cleaned up expired slots", safeStringify({ deletedCount: result.count }));
    } catch (error) {
      log.error("Error cleaning up expired slots", safeStringify({ error }));
    }
  }
}
