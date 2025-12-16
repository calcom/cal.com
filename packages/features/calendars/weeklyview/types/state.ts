import type { IFromUser, IToUser } from "@calcom/features/availability/lib/getUserAvailability";
import type { TimeRange } from "@calcom/types/schedule";

import type { BorderColor } from "./common";
import type { CalendarEvent } from "./events";

export type View = "month" | "week" | "day";
export type Hours =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23;

// These will be on eventHandlers - e.g. do more actions on view change if required
export type CalendarPublicActions = {
  onViewChange?: (view: View) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventContextMenu?: (event: CalendarEvent) => void;
  onEmptyCellClick?: (date: Date) => void;
  onDateChange?: (startDate: Date, endDate?: Date) => void;
};

// We have private actions here that we want to be available in state but not as component props.
export type CalendarPrivateActions = {
  /** initState is used to init the state from public props -> Doesn't override internal state */
  initState: (state: CalendarState & CalendarPublicActions) => void;
  setView: (view: CalendarComponentProps["view"]) => void;
  setStartDate: (startDate: CalendarComponentProps["startDate"]) => void;
  setEndDate: (endDate: CalendarComponentProps["endDate"]) => void;
  setEvents: (events: CalendarComponentProps["events"]) => void;
  selectedEvent?: CalendarEvent;
  setSelectedEvent: (event: CalendarEvent) => void;
  handleDateChange: (payload: "INCREMENT" | "DECREMENT") => void;
};
type TimeRangeExtended = TimeRange & {
  away?: boolean;
  fromUser?: IFromUser;
  toUser?: IToUser;
  reason?: string;
  emoji?: string;
  notes?: string | null;
  showNotePublicly?: boolean;
};

export type CalendarAvailableTimeslots = {
  // Key is the date in YYYY-MM-DD format
  // start and end are ISOstring
  [key: string]: TimeRangeExtended[];
};

export type CalendarState = {
  /** @NotImplemented This in future will change the view to be daily/weekly/monthly  DAY/WEEK are supported currently however WEEK is the most adv.*/
  view?: View;
  startDate: Date;
  /** By default we just dynamically create endDate from the viewType */
  endDate: Date;
  /**
   * Please enter events already SORTED. This is required to setup tab index correctly.
   * @Note Ideally you should pass in a sorted array from the DB however, pass the prop `sortEvents` if this is not possible and we will sort this for you..
   */
  events: CalendarEvent[];
  /**
   * Instead of letting users choose any option, this will only show these timeslots.
   * Users can not pick any time themselves but are restricted to the available options.
   */
  availableTimeslots?: CalendarAvailableTimeslots;
  /** Any time ranges passed in here will display as blocked on the users calendar. Note: Anything < than the current date automatically gets blocked. */
  blockingDates?: TimeRange[];
  /** Loading will only expect events to be loading. */
  loading?: boolean;
  /** Disables all actions on Events*/
  eventsDisabled?: boolean;
  /** If you don't want the date to be scrollable past a certain date */
  minDate?: Date;
  /** If you don't want the date to be scrollable past a certain date */
  maxDate?: Date;
  /**
   * Defined the time your calendar will start at
   * @default 0
   */
  startHour?: Hours;
  /**
   * Defined the time your calendar will end at
   * @default 23
   */
  endHour?: Hours;
  /** Toggle the ability to scroll to currentTime */
  scrollToCurrentTime?: boolean;
  /** Toggle the ability show the current time on the calendar
   *  @NotImplemented
   */
  showCurrentTimeLine?: boolean;
  /**
   * This indicates the number of grid stops that are available per hour. 4 -> Grid set to 15 minutes.
   * @NotImplemented
   * @default 4
   */
  gridCellsPerHour?: number;
  /**
   * Sets the duration on the hover event. In minutes.
   * @Note set to 0 to disable any hover actions.
   */
  hoverEventDuration?: number;
  /**
   * If passed in we will sort the events internally.
   * @Note It is recommended to sort the events before passing them into the scheduler - e.g. On DB level.
   */
  sortEvents?: boolean;
  /**
   * Optional boolean to  hide the main header. Default the header will be visible.
   */
  hideHeader?: boolean;
  /**
   * Timezone to use for displaying times in the calendar
   */
  timezone: string;
  /**
   * Show the background pattern for unavailable areas
   * @default true
   */
  showBackgroundPattern?: boolean;
  /**
   * Show borders on the leftmost and rightmost sides of the calendar container
   * @default true
   */
  showBorder?: boolean;
  /**
   * Border color for calendar cells
   * @default "default"
   */
  borderColor?: BorderColor;
  /**
   * Show the timezone in the empty space next to the date headers
   * @default false
   */
  showTimezone?: boolean;
  /**
   * Selected booking UID to highlight the corresponding event
   */
  selectedBookingUid?: string | null;
};

export type CalendarComponentProps = CalendarPublicActions & CalendarState & { isPending?: boolean };

export type CalendarStoreProps = CalendarComponentProps & CalendarPrivateActions;
