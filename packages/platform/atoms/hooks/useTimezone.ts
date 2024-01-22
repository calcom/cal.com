import { useEffect } from "react";

import { useApiKey } from "../hooks/useApiKeys";
import { useGetUserTimezone } from "../hooks/useGetUserTimezone";

export const useTimezone = (currentUserTimezone: string, onTimeZoneChange: () => void) => {
  const { key } = useApiKey();
  const userPreferredTimezone = useGetUserTimezone(key);

  useEffect(() => {
    if (currentUserTimezone !== userPreferredTimezone) {
      onTimeZoneChange();
    }
  }, [currentUserTimezone, userPreferredTimezone, onTimeZoneChange]);
};
