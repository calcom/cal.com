import process from "node:process";
const allowedIds = process.env.SLOT_ANALYTICS_EVENT_TYPE_IDS;

const SLOT_ANALYTICS_EVENT_TYPE_IDS: Set<number> = allowedIds
  ? new Set(
      allowedIds
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  : new Set();

export function isSlotAnalyticsEnabled(eventTypeId: number): boolean {
  return SLOT_ANALYTICS_EVENT_TYPE_IDS.has(eventTypeId);
}
