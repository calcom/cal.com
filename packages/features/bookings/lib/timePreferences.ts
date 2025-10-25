import { create } from "zustand";

import { TimeFormat, detectBrowserTimeFormat, setIs24hClockInLocalStorage } from "@calcom/lib/timeFormat";
import { CURRENT_TIMEZONE } from "@calcom/lib/timezoneConstants";
import { localStorage } from "@calcom/lib/webstorage";

type TimePreferencesStore = {
  timeFormat: TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR;
  setTimeFormat: (format: TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR) => void;
  timezone: string;
  setTimezone: (timeZone: string) => void;
};

const timezoneLocalStorageKey = "timeOption.preferredTimeZone";

/**
 * Get the initial timezone for the booker, ensuring it's auto-detected from the browser
 * if not previously set by the user.
 */
const getInitialTimezone = () => {
  const savedTimezone = localStorage.getItem(timezoneLocalStorageKey);
  
  // If user has previously set a timezone preference, use that
  if (savedTimezone) {
    return savedTimezone;
  }
  
  // Auto-detect timezone from browser - don't save to localStorage yet
  // Only save when user explicitly changes timezone
  return CURRENT_TIMEZONE;
};

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
  timezone: getInitialTimezone(),
  setTimezone: (timezone: string) => {
    localStorage.setItem(timezoneLocalStorageKey, timezone);
    set({ timezone });
  },
}));

export const useTimePreferences = timePreferencesStore;
