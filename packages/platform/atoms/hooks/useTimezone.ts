import { useEffect } from "react";

import { useMe } from "./useMe";

export const useTimezone = (
  onTimeZoneChange: (currentTimezone: string) => void,
  currentTimezone: string = new Intl.DateTimeFormat().resolvedOptions().timeZone
) => {
  const { timeZone: preferredTimezone } = useMe();

  useEffect(() => {
    if (preferredTimezone !== currentTimezone) {
      onTimeZoneChange(currentTimezone);
    }
  }, [currentTimezone, preferredTimezone, onTimeZoneChange]);
};
