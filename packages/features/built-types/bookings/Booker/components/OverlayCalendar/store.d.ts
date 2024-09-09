import type { EventBusyDate } from "@calcom/types/Calendar";
interface IOverlayCalendarStore {
    overlayBusyDates: EventBusyDate[] | undefined;
    setOverlayBusyDates: (busyDates: EventBusyDate[]) => void;
    continueWithProviderModal: boolean;
    setContinueWithProviderModal: (value: boolean) => void;
    calendarSettingsOverlayModal: boolean;
    setCalendarSettingsOverlayModal: (value: boolean) => void;
}
export declare const useOverlayCalendarStore: import("zustand").UseBoundStore<import("zustand").StoreApi<IOverlayCalendarStore>>;
export {};
//# sourceMappingURL=store.d.ts.map