import { create } from "zustand";

import { BookerState, BookerLayout } from "./types";

type BookerStore = {
  state: BookerState;
  setState: (state: BookerState) => void;
  layout: BookerLayout;
  setLayout: (layout: BookerLayout) => void;
};

export const useBookerStore = create<BookerStore>((set) => ({
  state: "loading",
  setState: (state: BookerState) => set({ state }),
  layout: "small_calendar",
  setLayout: (layout: BookerLayout) => set({ layout }),
}));
