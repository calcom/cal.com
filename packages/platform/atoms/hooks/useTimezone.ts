import { useEffect } from "react";

import { useMe } from "./useMe";

export const useTimezone = (
  onTimeZoneChange: (currentTimezone: string) => void,
  currentTimezone: string = new Intl.DateTimeFormat().resolvedOptions().timeZone
) => {
  const user = useMe();
  const preferredTimezone = user?.data.user.timeZone;

  useEffect(() => {
    if (preferredTimezone && preferredTimezone !== currentTimezone) {
      // TODO: figure out how to do patch request correctly in axios
      // onTimeZoneChange(currentTimezone);
    }
  }, [currentTimezone, preferredTimezone, onTimeZoneChange]);
};
