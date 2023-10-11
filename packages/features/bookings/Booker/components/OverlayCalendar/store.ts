import { create } from "zustand";

import type { EventBusyDate } from "@calcom/types/Calendar";

interface IOverlayCalendarStore {
  overlayBusyDates: EventBusyDate[] | undefined;
  setOverlayBusyDates: (busyDates: EventBusyDate[]) => void;
}

export const useOverlayCalendarStore = create<IOverlayCalendarStore>((set) => ({
  overlayBusyDates: undefined,
  setOverlayBusyDates: (busyDates: EventBusyDate[]) => {
    set({ overlayBusyDates: busyDates });
  },
}));
