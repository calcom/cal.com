import { create } from "zustand";

import { TimeFormat, detectBrowserTimeFormat, setIs24hClockInLocalStorage } from "@calcom/lib/timeFormat";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import { localStorage } from "@calcom/lib/webstorage";

type TimePreferencesStore = {
  timeFormat: TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR;
  setTimeFormat: (format: TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR) => void;
  timezone: string;
  setTimezone: (timeZone: string) => void;
  _initializedTimezone: boolean;
  initializeTimezone: (timezoneFromUserSettings: string) => void;
  checkHavePreferedTimezone: () => boolean;
  removePreferedTimezone: () => void;
};

const timezoneLocalStorageKey = "timeOption.preferredTimeZone";

/**
 * This hook is NOT inside the user feature, since
 * these settings only apply to the booker component. They will not reflect
 * any changes made in the user settings.
 */
export const timePreferencesStore = create<TimePreferencesStore>((set, get) => ({
  timeFormat: detectBrowserTimeFormat,
  setTimeFormat: (format: TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR) => {
    setIs24hClockInLocalStorage(format === TimeFormat.TWENTY_FOUR_HOUR);
    set({ timeFormat: format });
  },

  timezone: localStorage.getItem(timezoneLocalStorageKey) || CURRENT_TIMEZONE,
  setTimezone: (timezone: string) => {
    localStorage.setItem(timezoneLocalStorageKey, timezone);
    set({ timezone });
  },

  _initializedTimezone: false,

  /**
   * initializeTimezone is used to initialize the timezone using timezone from user settings so that when there is no preferred timezone stored in localStorage, instead of defaulting to the browser timezone we use the timezone from user settings.
   */
  initializeTimezone: (timezoneFromUserSettings: string) => {
    if (get()._initializedTimezone) return;
    const timezone =
      localStorage.getItem(timezoneLocalStorageKey) || timezoneFromUserSettings || CURRENT_TIMEZONE;
    set({ timezone, _initializedTimezone: true });
  },

  /**
   * checkHavePreferedTimezone is used to check if there is a preferred timezone stored in localStorage.
   */
  checkHavePreferedTimezone: () => {
    return !!localStorage.getItem(timezoneLocalStorageKey);
  },

  /**
   * removePreferedTimezone is used to remove the preferred timezone from localStorage - currently used to remove the preferred timezone when user changes timezone in settings so that the timezone from user settings is used in the booker .
   */
  removePreferedTimezone: () => {
    localStorage.removeItem(timezoneLocalStorageKey);
  },
}));

export const useTimePreferences = timePreferencesStore;
