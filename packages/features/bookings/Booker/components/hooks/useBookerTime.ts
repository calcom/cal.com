import { useEffect, useMemo } from "react";
import { shallow } from "zustand/shallow";

import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

import { useTimePreferences } from "../../../lib/timePreferences";
import { getBookerTimezone } from "../../utils/getBookerTimezone";

export const useBookerTime = () => {
  const { data: me } = useMeQuery();

  const [timezoneFromBookerStore] = useBookerStoreContext((state) => [state.timezone], shallow);
  const { timezone: timezoneFromTimePreferences, timeFormat, initializeTimezone } = useTimePreferences();

  const timezone = useMemo(
    () =>
      getBookerTimezone({
        storeTimezone: timezoneFromBookerStore,
        bookerUserPreferredTimezone: timezoneFromTimePreferences,
      }),
    [timezoneFromBookerStore, timezoneFromTimePreferences]
  );

  // initialize timezone from user settings so timezone from preference default to user settings timezone instead of browser timezone
  useEffect(() => {
    if (me?.timeZone) {
      initializeTimezone(me.timeZone);
    }
  }, [me?.timeZone, initializeTimezone]);

  return {
    timezone,
    timeFormat,
    timezoneFromBookerStore,
    timezoneFromTimePreferences,
  };
};
