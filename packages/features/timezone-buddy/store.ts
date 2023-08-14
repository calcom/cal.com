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

type TimezoneBuddyState = TimezoneBuddyProps;

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

  return createStore<TimezoneBuddyState>()(() => ({
    ...DEFAULT_PROPS,
    ...initProps,
  }));
};

export const TBContext = createContext<TimezoneBuddyStore | null>(null);
