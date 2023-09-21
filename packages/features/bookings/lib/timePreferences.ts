import { create } from "zustand";

import dayjs from "@calcom/dayjs";
import { TimeFormat, detectBrowserTimeFormat, setIs24hClockInLocalStorage } from "@calcom/lib/timeFormat";
import { localStorage } from "@calcom/lib/webstorage";

type TimePreferencesStore = {
  timeFormat: TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR;
  setTimeFormat: (format: TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR) => void;
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
  timeFormat: detectBrowserTimeFormat,
  setTimeFormat: (format: TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR) => {
    setIs24hClockInLocalStorage(format === TimeFormat.TWENTY_FOUR_HOUR);
    set({ timeFormat: format });
  },
  timezone: localStorage.getItem(timezoneLocalStorageKey) || dayjs.tz.guess() || "Europe/London",
  setTimezone: (timezone: string) => {
    localStorage.setItem(timezoneLocalStorageKey, timezone);
    set({ timezone });
  },
}));

export const useTimePreferences = timePreferencesStore;
