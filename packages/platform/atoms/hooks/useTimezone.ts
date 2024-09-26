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
    if (!isLoading && preferredTimezone && onTimeZoneChange && preferredTimezone !== currentTimezone) {
      onTimeZoneChange(currentTimezone);
    }
  }, [currentTimezone, preferredTimezone, onTimeZoneChange, isLoading]);
};
