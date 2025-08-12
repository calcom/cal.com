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
  containerRef?: React.RefObject<HTMLElement>;
  x: number;
  height: number;
  y: number;
  isHover?: boolean;
}

type TimezoneBuddyState = TimezoneBuddyProps & {
  addToDate: (amount: number) => void;
  subtractFromDate: (amount: number) => void;
  setBrowseDate: (date: Date) => void;
  setContainerRef: (ref: React.RefObject<HTMLElement>) => void;
  emitCellPosition: (x: number) => void;
  updateDimensions: () => void;
};

export type TimezoneBuddyStore = ReturnType<typeof createTimezoneBuddyStore>;

/**
 * Different type of zustand store compared to what we are used to
 * This is a function that returns a store instead of a hook. This allows us to properly set the initial state of the store
 * from the props passed in to the component.
 */
export const createTimezoneBuddyStore = (initProps?: Partial<TimezoneBuddyProps>) => {
  const DEFAULT_PROPS: TimezoneBuddyProps = {
    timeMode: "24h",
    browsingDate: new Date(),
    x: 0,
    y: 0,
    height: 0,
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
    setContainerRef: (ref: React.RefObject<HTMLElement>) => {
      set({ containerRef: ref });
    },
    emitCellPosition: (x: number) => {
      const container = get().containerRef?.current;
      if (x < 0) {
        // If x is less than 0, we are outside the container
        set({ isHover: false });
      } else if (container) {
        const containerRect = container.getBoundingClientRect();
        set({ x: x - containerRect.left, isHover: true });
      }
    },
    updateDimensions: () => {
      const container = get().containerRef?.current;
      let x = get().x;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const timeDials = container.querySelectorAll("[data-time-dial]>div");
        const height =
          timeDials[timeDials.length - 1]?.getBoundingClientRect().bottom -
          timeDials[0]?.getBoundingClientRect().top;
        const y = timeDials[0]?.getBoundingClientRect().top - containerRect.top;
        x = x ? x : timeDials[0]?.getBoundingClientRect().left - containerRect.left;
        set({ height, y, x });
      }
    },
  }));
};

export const TBContext = createContext<TimezoneBuddyStore | null>(null);
