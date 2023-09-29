import { create } from "zustand";

import type { SVGComponent } from "@calcom/types/SVGComponent";
import { User, Link } from "@calcom/ui/components/icon";

interface addFilterOption {
  StartIcon?: SVGComponent;
  label: "people" | "event_type" | "date_range" | "location";
}

export type BookingMultiFilterStore = {
  addFilterOptions: addFilterOption[];
  toggleOption: (option: addFilterOption) => void;
  isFilterActive: (label: addFilterOption["label"]) => boolean;
  activeFilters: string[];
  addActiveFilter: (filter: string) => void;
  removeActiveFilter: (filter: string) => void;
  clearActiveFilters: () => void;
  isFilterViewOpen: boolean;
  toggleFilterViewOpen: () => void;
  closeFilterView: () => void;
};

export const useBookingMultiFilterStore = create<BookingMultiFilterStore>((set, get) => ({
  addFilterOptions: [
    {
      label: "people",
      StartIcon: User,
    },
    {
      label: "event_type",
      StartIcon: Link,
    },
    // {
    //   label: "date_range",
    //   StartIcon: Calendar,
    // },
    // {
    //   label: "location",
    //   StartIcon: MapPin,
    // },
  ],
  isFilterActive: (label: addFilterOption["label"]) => {
    return !get().addFilterOptions.some((option) => option.label === label);
  },
  setState: (state: BookingMultiFilterStore) => set(state),
  toggleOption: (option: addFilterOption) => {
    const availableOptions = get().addFilterOptions;
    const foundOption = availableOptions.find((activeOption) => activeOption.label === option.label);

    if (foundOption) {
      set({
        addFilterOptions: availableOptions.filter((activeOption) => activeOption.label !== foundOption.label),
      });
    } else {
      set({ addFilterOptions: [...availableOptions, option] });
    }
  },
  activeFilters: [],
  addActiveFilter: (filter: string) => {
    if (!get().activeFilters.includes(filter)) {
      set({ activeFilters: [...get().activeFilters, filter] });
    }
  },
  removeActiveFilter: (filter: string) => {
    set({ activeFilters: get().activeFilters.filter((activeFilter) => activeFilter !== filter) });
  },
  clearActiveFilters: () => {
    set({ activeFilters: [] });
  },
  isFilterViewOpen: false,
  toggleFilterViewOpen: () => {
    set({ isFilterViewOpen: !get().isFilterViewOpen });
  },
  closeFilterView: () => {
    set({ isFilterViewOpen: false });
  },
}));
