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
}));
