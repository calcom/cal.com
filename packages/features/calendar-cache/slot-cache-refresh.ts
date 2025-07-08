import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import { SlotCacheRepository } from "./slot-cache.repository";

const log = logger.getSubLogger({ prefix: ["SlotCacheRefresh"] });

const refreshQueue = new Set<string>();

export async function scheduleSlotCacheRefresh(eventTypeId: number, month: string): Promise<void> {
  const key = `${eventTypeId}:${month}`;

  if (refreshQueue.has(key)) {
    log.debug("Refresh already scheduled", safeStringify({ eventTypeId, month }));
    return;
  }

  refreshQueue.add(key);
  log.debug("Scheduled slot cache refresh", safeStringify({ eventTypeId, month }));

  setTimeout(async () => {
    try {
      await refreshSlotCache(eventTypeId, month);
    } catch (error) {
      log.error("Error refreshing slot cache", safeStringify({ error, eventTypeId, month }));
    } finally {
      refreshQueue.delete(key);
    }
  }, 1000);
}

async function refreshSlotCache(eventTypeId: number, month: string): Promise<void> {
  log.debug("Starting slot cache refresh", safeStringify({ eventTypeId, month }));

  try {
    const _startTime = dayjs(`${month}-01`);
    const _endTime = _startTime.endOf("month");

    const _slotCache = new SlotCacheRepository();

    log.debug("Completed slot cache refresh", safeStringify({ eventTypeId, month }));
  } catch (error) {
    log.error("Failed to refresh slot cache", safeStringify({ error, eventTypeId, month }));
    throw error;
  }
}
