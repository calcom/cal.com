import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["SlotCacheRefresh"] });

export async function scheduleSlotCacheRefresh(eventTypeId: number, month: string): Promise<void> {
  log.debug("Slot cache refresh requested (not implemented)", safeStringify({ eventTypeId, month }));
  return;
}
