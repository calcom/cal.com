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
  /** The timezone we use to calculate the offset - Defaults to the timezone of the user's calcom account
   *
   * @default Users calcom account timezone
   */
  offsetTimezone: string | null;
  /**
   * A key value pair of the timezone name and the timezone object
   * We use an object here so we can lookup the timezone by name and get the offset
   * instead of computing this for mulitple users if they are in the same timezone
   */
  uniquedTimezones: string[];
  browsingDate: Date;
  timeMode?: "12h" | "24h";
}

interface TimezoneBuddyState extends TimezoneBuddyProps {
  timezones: Map<string, Timezone>;
  getOffsetTimezone: () => Timezone | null;
  getTimezones: () => Timezone[] | null;
  getTimezone: (name: string) => Timezone | null;
}

export type TimezoneBuddyStore = ReturnType<typeof createTimezoneBuddyStore>;

function getTimezoneOffset(timezoneName: string) {
  const date = new Date();

  const options = { timeZone: timezoneName, hour12: false };
  const timeString = date.toLocaleString("en-US", options);
  const timezoneOffset = new Date(
    date.toLocaleString("en-US", { timeZone: timezoneName })
  ).getTimezoneOffset();
  const dateInTimezone = new Date(date.getTime() + timezoneOffset * 60 * 1000);
  const diffInHours = (dateInTimezone.getTime() - new Date(timeString).getTime()) / (1000 * 60 * 60);
  const timezone = Intl.DateTimeFormat(undefined, {
    timeZone: timezoneName,
    timeZoneName: "short",
  }).resolvedOptions().timeZone;
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    timeZoneName: "short",
  });
  const parts = formatter.formatToParts(date);
  const abbr = parts.find((part) => part.type === "timeZoneName")?.value;
  return { offset: -Math.floor(diffInHours), abbr };
}

/**
 * Differnt type of zustand store compared to what we are used to
 * This is a function that returns a store instead of a hook. This allows us to properly set the initial state of the store
 * from the props passed in to the component.
 */
export const createTimezoneBuddyStore = (initProps?: Partial<TimezoneBuddyProps>) => {
  const DEFAULT_PROPS: TimezoneBuddyProps = {
    offsetTimezone: null,
    uniquedTimezones: [],
    timeMode: "24h",
    browsingDate: new Date(),
  };
  const timezones = new Map<string, Timezone>();

  function setTimezoneInfo(timezoneName: string) {
    const timezone = timezones.get(timezoneName);
    if (timezone) {
      return timezone;
    }

    const tzInfo = getTimezoneOffset(timezoneName);

    const newTimezone = {
      name: timezoneName,
      ...tzInfo,
    };

    timezones.set(timezoneName, newTimezone);

    return newTimezone;
  }

  // Set the offset timezone
  setTimezoneInfo(initProps?.offsetTimezone || "");
  // loop over uniquedTimezones and create a map of timezone name to timezone object
  initProps?.uniquedTimezones?.forEach((timezoneName) => setTimezoneInfo(timezoneName));

  return createStore<TimezoneBuddyState>()((set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    timezones,
    getTimezones: () => Array.from(get().timezones.values()),
    getOffsetTimezone: () => get().getTimezone(get().offsetTimezone || ""),
    getTimezone: (name: string) => get().timezones.get(name) || null,
  }));
};

export const TBContext = createContext<TimezoneBuddyStore | null>(null);
