import { useEffect } from "react";

import { useApiKey } from "../hooks/useApiKeys";
import { useMe } from "./useMe";

export const useTimezone = (
  onTimeZoneChange: (currentTimezone: string) => void,
  currentTimezone: string = new Intl.DateTimeFormat().resolvedOptions().timeZone
) => {
  const { key } = useApiKey();
  const { timeZone: preferredTimezone } = useMe(key);

  useEffect(() => {
    if (preferredTimezone !== currentTimezone) {
      onTimeZoneChange(currentTimezone);
    }
  }, [currentTimezone, preferredTimezone, onTimeZoneChange]);
};
