import { create } from "zustand";

import dayjs from "@calcom/dayjs";
import { localStorage } from "@calcom/lib/webstorage";

type TimePreferencesStore = {
  // @TODO: Does it make sense to add timeformat here as well?
  // timeFormat: TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR;
  // setTimeFromat: (format: TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR) => void;
  timezone: string;
  setTimezone: (timeZone: string) => void;
};

const timezoneLocalStorageKey = "timeOption.preferredTimeZone";

/**
 * This hook is NOT inside the user feature, since
 * these settings only apply to the booker component. They will not reflect
 * any changes made in the user settings.
 */
export const timePreferencesStore = create<TimePreferencesStore>((set) => ({
  // timeFormat: TimeFormat.TWELVE_HOUR,
  // setTimeFromat: (format: TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR) =>
  //   set({ timeFormat: format }),
  timezone: localStorage.getItem(timezoneLocalStorageKey) || dayjs.tz.guess(),
  setTimezone: (timezone: string) => {
    localStorage.setItem(timezoneLocalStorageKey, timezone);
    set({ timezone });
  },
}));

export const useTimePrerences = timePreferencesStore;
