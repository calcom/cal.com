import { useEffect } from "react";

import { useMe } from "./useMe";

export const useTimezone = (
  onTimeZoneChange: (currentTimezone: string) => void,
  currentTimezone: string = new Intl.DateTimeFormat().resolvedOptions().timeZone
) => {
  const { data: me, isLoading } = useMe();
  const preferredTimezone = me?.data?.user?.timeZone ?? currentTimezone;

  useEffect(() => {
    if (!isLoading && preferredTimezone && preferredTimezone !== currentTimezone) {
      // TODO: figure out how to do patch request correctly in axios
      // onTimeZoneChange(currentTimezone);
    }
  }, [currentTimezone, preferredTimezone, onTimeZoneChange, isLoading]);
};
