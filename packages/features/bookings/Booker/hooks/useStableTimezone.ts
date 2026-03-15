import { useRef } from "react";

export function useStableTimezone(
  timezone: string,
  restrictionSchedule?: { id: number | null; useBookerTimezone: boolean }
): string {
  const initialRef = useRef(timezone);
  const shouldPin =
    restrictionSchedule?.id != null &&
    restrictionSchedule.id > 0 &&
    restrictionSchedule.useBookerTimezone === false;
  return shouldPin ? initialRef.current : timezone;
}
