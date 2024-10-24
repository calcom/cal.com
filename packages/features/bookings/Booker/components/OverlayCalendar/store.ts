import { create } from "zustand";

import type { EventBusyData } from "@calcom/types/Calendar";

interface IOverlayCalendarStore {
  overlayBusyDates: EventBusyData[] | undefined;
  setOverlayBusyDates: (busyDates: EventBusyData[]) => void;
  continueWithProviderModal: boolean;
  setContinueWithProviderModal: (value: boolean) => void;
  calendarSettingsOverlayModal: boolean;
  setCalendarSettingsOverlayModal: (value: boolean) => void;
}

export const useOverlayCalendarStore = create<IOverlayCalendarStore>((set) => ({
  overlayBusyDates: undefined,
  setOverlayBusyDates: (busyDates: EventBusyData[]) => {
    set({ overlayBusyDates: busyDates });
  },
  calendarSettingsOverlayModal: false,
  setCalendarSettingsOverlayModal: (value: boolean) => {
    set({ calendarSettingsOverlayModal: value });
  },
  continueWithProviderModal: false,
  setContinueWithProviderModal: (value: boolean) => {
    set({ continueWithProviderModal: value });
  },
}));
