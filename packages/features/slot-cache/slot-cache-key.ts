import { createHash } from "crypto";

export interface SlotCacheKeyParams {
  eventTypeId: number;
  userId: number; // Per-person caching
  startDate: string; // ISO string in UTC
  endDate: string; // ISO string in UTC
  eventLength: number;
  frequency: number;
  offsetStart?: number;
  minimumBookingNotice: number;
  scheduleId?: number | null;
  restrictionScheduleId?: number | null;
  bookingLimits?: Record<string, number>;
  durationLimits?: Record<string, number>;
}

export function generateSlotCacheKey(params: SlotCacheKeyParams): string {
  const normalized = {
    eventTypeId: params.eventTypeId,
    userId: params.userId,
    startDate: params.startDate,
    endDate: params.endDate,
    eventLength: params.eventLength,
    frequency: params.frequency,
    offsetStart: params.offsetStart || 0,
    minimumBookingNotice: params.minimumBookingNotice,
    scheduleId: params.scheduleId,
    restrictionScheduleId: params.restrictionScheduleId,
    bookingLimits: params.bookingLimits || {},
    durationLimits: params.durationLimits || {},
  };

  const keyString = JSON.stringify(normalized);
  return createHash("sha256").update(keyString).digest("hex").substring(0, 16);
}

export function expandDateRangeForCache(
  startDate: string,
  endDate: string
): {
  expandedStart: string;
  expandedEnd: string;
} {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const expandedStart = new Date(start.getFullYear(), start.getMonth(), 1);
  expandedStart.setHours(expandedStart.getHours() - 12);

  const expandedEnd = new Date(end.getFullYear(), end.getMonth() + 1, 1);
  expandedEnd.setHours(expandedEnd.getHours() + 14);

  return {
    expandedStart: expandedStart.toISOString(),
    expandedEnd: expandedEnd.toISOString(),
  };
}
