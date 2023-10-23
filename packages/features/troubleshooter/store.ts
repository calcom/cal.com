import { useEffect } from "react";
import { create } from "zustand";

import dayjs from "@calcom/dayjs";

import { updateQueryParam, getQueryParam, removeQueryParam } from "../bookings/Booker/utils/query-param";

/**
 * Arguments passed into store initializer, containing
 * the event data.
 */
type StoreInitializeType = {
  month: string | null;
};

export type TroubleshooterStore = {
  eventSlug: string | null;
  month: string | null;
  setMonth: (month: string | null) => void;
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  addToSelectedDate: (days: number) => void;
  initialize: (data: StoreInitializeType) => void;
};

/**
 * The booker store contains the data of the component's
 * current state. This data can be reused within child components
 * by importing this hook.
 *
 * See comments in interface above for more information on it's specific values.
 */
export const useTroubleshooterStore = create<TroubleshooterStore>((set, get) => ({
  selectedDate: getQueryParam("date") || null,
  setSelectedDate: (selectedDate: string | null) => {
    // unset selected date
    if (!selectedDate) {
      removeQueryParam("date");
      return;
    }

    const currentSelection = dayjs(get().selectedDate);
    const newSelection = dayjs(selectedDate);
    set({ selectedDate });
    updateQueryParam("date", selectedDate ?? "");

    // Setting month make sure small calendar in fullscreen layouts also updates.
    if (newSelection.month() !== currentSelection.month()) {
      set({ month: newSelection.format("YYYY-MM") });
      updateQueryParam("month", newSelection.format("YYYY-MM"));
    }
  },
  addToSelectedDate: (days: number) => {
    const currentSelection = dayjs(get().selectedDate);
    const newSelection = currentSelection.add(days, "day");
    const newSelectionFormatted = newSelection.format("YYYY-MM-DD");

    if (newSelection.month() !== currentSelection.month()) {
      set({ month: newSelection.format("YYYY-MM") });
      updateQueryParam("month", newSelection.format("YYYY-MM"));
    }

    set({ selectedDate: newSelectionFormatted });
    updateQueryParam("date", newSelectionFormatted);
  },
  eventSlug: null,
  month: getQueryParam("month") || getQueryParam("date") || dayjs().format("YYYY-MM"),
  setMonth: (month: string | null) => {
    set({ month });
    updateQueryParam("month", month ?? "");
    get().setSelectedDate(null);
  },
  initialize: ({ month }: StoreInitializeType) => {
    if (month) set({ month });
    //removeQueryParam("layout");
  },
}));

export const useInitalizeTroubleshooterStore = ({ month }: StoreInitializeType) => {
  const initializeStore = useTroubleshooterStore((state) => state.initialize);
  useEffect(() => {
    initializeStore({
      month,
    });
  }, [initializeStore, month]);
};
