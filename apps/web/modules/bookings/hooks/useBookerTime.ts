import { shallow } from "zustand/shallow";

import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";

import { useTimePreferences } from "@calcom/features/bookings/lib/timePreferences";
import { getBookerTimezone } from "@calcom/features/bookings/Booker/utils/getBookerTimezone";

export const useBookerTime = () => {
  const [timezoneFromBookerStore] = useBookerStoreContext((state) => [state.timezone], shallow);
  const { timezone: timezoneFromTimePreferences, timeFormat } = useTimePreferences();
  const timezone = getBookerTimezone({
    storeTimezone: timezoneFromBookerStore,
    bookerUserPreferredTimezone: timezoneFromTimePreferences,
  });

  return {
    timezone,
    timeFormat,
    timezoneFromBookerStore,
    timezoneFromTimePreferences,
  };
};
