import { useEffect, useRef } from "react";

import { useBookerTime } from "./useBookerTime";

type TimezoneChangeDetectionEvent =
  | {
      restrictionScheduleId?: number | null;
      useBookerTimezone?: boolean;
    }
  | null
  | undefined;

export const useTimezoneChangeDetection = (eventData: TimezoneChangeDetectionEvent) => {
  const { timezone } = useBookerTime();
  const previousTimezoneRef = useRef<string>(timezone);

  useEffect(() => {
    // Initialize the previous timezone on first render
    if (previousTimezoneRef.current === null) {
      previousTimezoneRef.current = timezone;
      return;
    }

    // Update the previous timezone when timezone changes
    if (previousTimezoneRef.current !== timezone) {
      previousTimezoneRef.current = timezone;
    }
  }, [timezone]);

  const shouldRefreshSlots = () => {
    const hasTimezoneChanged = previousTimezoneRef.current !== timezone;
    const hasRestrictionSchedule = !!eventData?.restrictionScheduleId;
    const isUsingBookerTimezone = !!eventData?.useBookerTimezone;

    // Only refresh slots when:
    // 1. Timezone has changed
    // 2. Event has a restriction schedule
    // 3. Event is configured to use booker's timezone
    return hasTimezoneChanged && hasRestrictionSchedule && isUsingBookerTimezone;
  };

  return {
    shouldRefreshSlots: shouldRefreshSlots(),
    currentTimezone: timezone,
    previousTimezone: previousTimezoneRef.current,
  };
};
