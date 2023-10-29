import { create } from "zustand";

export type BookingMultiFilterStore = {
  isFiltersVisible: boolean;
  toggleFiltersVisibility: () => void;
};

export const useBookingMultiFilterStore = create<BookingMultiFilterStore>((set, get) => ({
  isFiltersVisible: false,
  toggleFiltersVisibility: () =>
    set((state) => ({
      ...state,
      isFiltersVisible: !get().isFiltersVisible,
    })),
}));
