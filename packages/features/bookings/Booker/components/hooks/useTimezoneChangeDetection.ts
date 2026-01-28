import { useMemo, useRef, useEffect } from "react";

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

  // this keeps track of the previous timezone across renders
  const prevTimezoneRef = useRef<string>(timezone);
  const prevTimezone = prevTimezoneRef.current;

  // detects changes during the current render
  const hasTimezoneChanged = prevTimezone !== timezone;

  // update the ref after the render logic is calculated
  useEffect(() => {
    prevTimezoneRef.current = timezone;
  }, [timezone]);

  return useMemo(() => {
    const hasRestrictionSchedule = Boolean(eventData?.restrictionScheduleId);
    const isUsingBookerTimezone = Boolean(eventData?.useBookerTimezone);

    // this matches the original logic: It is only true during the render
    // where the timezone has actually flipped.
    const shouldRefreshSlots = hasTimezoneChanged && hasRestrictionSchedule && isUsingBookerTimezone;

    return {
      shouldRefreshSlots,
      currentTimezone: timezone,
      previousTimezone: prevTimezone,
    };
    // We include hasTimezoneChanged here so the memoized object updates
    // correctly when the flip occurs.
  }, [timezone, hasTimezoneChanged, eventData?.restrictionScheduleId, eventData?.useBookerTimezone]);
};
