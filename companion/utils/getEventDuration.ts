import type { EventType } from "@/hooks";

export const getEventDuration = (eventType: EventType): number => {
  // Prefer lengthInMinutes (API field), fallback to length for backwards compatibility
  return eventType.lengthInMinutes ?? eventType.length ?? 0;
};
