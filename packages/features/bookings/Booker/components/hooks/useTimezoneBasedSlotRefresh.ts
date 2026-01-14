import { useEffect } from "react";

import { useTimezoneChangeDetection } from "./useTimezoneChangeDetection";

type EventDataForTimezoneDetection =
  | {
      restrictionScheduleId?: number | null;
      useBookerTimezone?: boolean;
    }
  | null
  | undefined;

/**
 * Hook that handles timezone-based slot refreshing.
 * Detects timezone changes and triggers the provided refresh callback
 * when the event has a restriction schedule using booker's timezone.
 *
 * @param eventData - Event data containing restrictionScheduleId and useBookerTimezone
 * @param refreshCallback - Callback function to refresh slots (e.g., schedule.invalidate or schedule.refetch)
 */
export const useTimezoneBasedSlotRefresh = (
  eventData: EventDataForTimezoneDetection,
  refreshCallback: (() => void) | undefined | null
) => {
  const eventDataForTimezoneDetection: EventDataForTimezoneDetection = eventData
    ? {
        restrictionScheduleId: eventData.restrictionScheduleId,
        useBookerTimezone: eventData.useBookerTimezone,
      }
    : null;

  const { shouldRefreshSlots } = useTimezoneChangeDetection(eventDataForTimezoneDetection);

  useEffect(() => {
    if (shouldRefreshSlots && refreshCallback) {
      refreshCallback();
    }
  }, [shouldRefreshSlots, refreshCallback]);
};
