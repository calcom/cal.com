import { createContext } from "react";
import { createStore } from "zustand";

export interface Timezone {
  name: string;
  offset: number;
  isdst?: boolean;
  abbr?: string;
  city?: string;
  location?: string;
}

export interface TimezoneBuddyProps {
  browsingDate: Date;
  timeMode?: "12h" | "24h";
}

type TimezoneBuddyState = TimezoneBuddyProps & {
  addToDate: (amount: number) => void;
  subtractFromDate: (amount: number) => void;
  setBrowseDate: (date: Date) => void;
};

export type TimezoneBuddyStore = ReturnType<typeof createTimezoneBuddyStore>;

/**
 * Differnt type of zustand store compared to what we are used to
 * This is a function that returns a store instead of a hook. This allows us to properly set the initial state of the store
 * from the props passed in to the component.
 */
export const createTimezoneBuddyStore = (initProps?: Partial<TimezoneBuddyProps>) => {
  const DEFAULT_PROPS: TimezoneBuddyProps = {
    timeMode: "24h",
    browsingDate: new Date(),
  };

  return createStore<TimezoneBuddyState>()((set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    addToDate: (amount?: number) => {
      const date = get().browsingDate;
      date.setDate(date.getDate() + (amount || 1));
      set({ browsingDate: date });
    },
    subtractFromDate: (amount?: number) => {
      const date = get().browsingDate;
      date.setDate(date.getDate() - (amount || 1));
      set({ browsingDate: date });
    },
    setBrowseDate: (date: Date) => {
      set({ browsingDate: date });
    },
  }));
};

export const TBContext = createContext<TimezoneBuddyStore | null>(null);
