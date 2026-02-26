import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { getBookerTimezone } from "@calcom/features/bookings/Booker/utils/getBookerTimezone";
import { useTimePreferences } from "@calcom/features/bookings/lib/timePreferences";
import { shallow } from "zustand/shallow";

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
