import { create } from "zustand";

import { BookerState, BookerLayout } from "./types";

type BookerStore = {
  state: BookerState;
  setState: (state: BookerState) => void;
  layout: BookerLayout;
  setLayout: (layout: BookerLayout) => void;
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  username: string | null;
  eventSlug: string | null;
  eventId: number | null;
  month: Date | null;
  initialize: (username: string, eventSlug: string, month: Date, eventId: number | undefined) => void;
  selectedDuration: number | null;
  setSelectedDuration: (duration: number | null) => void;
};

export const useBookerStore = create<BookerStore>((set, get) => ({
  state: "loading",
  setState: (state: BookerState) => set({ state }),
  layout: "small_calendar",
  setLayout: (layout: BookerLayout) => set({ layout }),
  selectedDate: null,
  setSelectedDate: (date: string | null) => set({ selectedDate: date }),
  username: null,
  eventSlug: null,
  eventId: null,
  month: null,
  initialize: (username: string, eventSlug: string, month: Date, eventId: number | undefined) => {
    if (
      get().username === username &&
      get().eventSlug === eventSlug &&
      get().month === month &&
      get().eventId === eventId
    )
      return;
    set({ username, eventSlug, month, eventId });
  },
  selectedDuration: null,
  setSelectedDuration: (duration: number | null) => set({ selectedDuration: duration }),
}));
