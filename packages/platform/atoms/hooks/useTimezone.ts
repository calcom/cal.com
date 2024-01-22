import { useEffect } from "react";

import { useApiKey } from "../hooks/useApiKeys";
import { useGetUserTimezone } from "../hooks/useGetUserTimezone";

export const useTimezone = (currentTimezone: string, onTimeZoneChange: () => void) => {
  const { key } = useApiKey();
  const preferredTimezone = useGetUserTimezone(key);

  useEffect(() => {
    if (currentTimezone !== preferredTimezone) {
      onTimeZoneChange();
    }
  }, [currentTimezone, preferredTimezone, onTimeZoneChange]);
};
