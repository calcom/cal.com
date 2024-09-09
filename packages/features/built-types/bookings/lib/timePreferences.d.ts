import { TimeFormat } from "@calcom/lib/timeFormat";
type TimePreferencesStore = {
    timeFormat: TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR;
    setTimeFormat: (format: TimeFormat.TWELVE_HOUR | TimeFormat.TWENTY_FOUR_HOUR) => void;
    timezone: string;
    setTimezone: (timeZone: string) => void;
};
/**
 * This hook is NOT inside the user feature, since
 * these settings only apply to the booker component. They will not reflect
 * any changes made in the user settings.
 */
export declare const timePreferencesStore: import("zustand").UseBoundStore<import("zustand").StoreApi<TimePreferencesStore>>;
export declare const useTimePreferences: import("zustand").UseBoundStore<import("zustand").StoreApi<TimePreferencesStore>>;
export {};
//# sourceMappingURL=timePreferences.d.ts.map