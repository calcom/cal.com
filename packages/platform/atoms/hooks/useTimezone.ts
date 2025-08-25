import { useEffect } from "react";

import dayjs from "@calcom/dayjs";

import { useMe } from "./useMe";

export const useTimezone = (
  onTimeZoneChange?: (currentTimezone: string) => void,
  currentTimezone: string = dayjs.tz.guess()
) => {
  const { data: me, isLoading } = useMe();
  const preferredTimezone = me?.data?.timeZone ?? currentTimezone;

  useEffect(() => {
    // NEVER automatically update timezone if:
    // 1. No callback function provided
    // 2. Still loading user data
    // 3. User has ANY timezone preference set (prevents automatic updates when browser timezone changes)
    // 4. Timezones are the same
    if (
      !isLoading &&
      onTimeZoneChange &&
      preferredTimezone !== currentTimezone &&
      !me?.data?.timeZone // Only update if user has NEVER set any timezone preference
    ) {
      onTimeZoneChange(currentTimezone);
    }
  }, [currentTimezone, preferredTimezone, onTimeZoneChange, isLoading, me?.data?.timeZone]);
};
