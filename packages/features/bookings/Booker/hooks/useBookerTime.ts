import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useBookerTimezone } from "@calcom/features/bookings/Booker/utils/useBookerTimezone";
import { useTimePreferences } from "@calcom/features/bookings/lib/timePreferences";
import { shallow } from "zustand/shallow";

export const useBookerTime = () => {
  const [timezoneFromBookerStore] = useBookerStoreContext((state) => [state.timezone], shallow);
  const { timezone: timezoneFromTimePreferences, timeFormat } = useTimePreferences();
  const timezone = useBookerTimezone();

  return {
    timezone,
    timeFormat,
    timezoneFromBookerStore,
    timezoneFromTimePreferences,
  };
};