import { useEffect } from "react";
import { create } from "zustand";

import dayjs from "@calcom/dayjs";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

import type { GetBookingType } from "../lib/get-booking";
import type { BookerState, BookerLayout } from "./types";
import { updateQueryParam, getQueryParam, removeQueryParam } from "./utils/query-param";

/**
 * Arguments passed into store initializer, containing
 * the event data.
 */
type StoreInitializeType = {
  username: string;
  eventSlug: string;
  // Month can be undefined if it's not passed in as a prop.
  eventId: number | undefined;
  layout: BookerLayout;
  month?: string;
  bookingUid?: string | null;
  isTeamEvent?: boolean;
  bookingData?: GetBookingType | null | undefined;
  verifiedEmail?: string | null;
  rescheduleUid?: string | null;
  seatReferenceUid?: string;
  durationConfig?: number[] | null;
  org?: string | null;
};

type SeatedEventData = {
  seatsPerTimeSlot?: number | null;
  attendees?: number;
  bookingUid?: string;
  showAvailableSeatsCount?: boolean | null;
};

export type BookerStore = {
  /**
   * Event details. These are stored in store for easier
   * access in child components.
   */
  username: string | null;
  eventSlug: string | null;
  eventId: number | null;
  /**
   * Verified booker email.
   * Needed in case user turns on Requires Booker Email Verification for an event
   */
  verifiedEmail: string | null;
  setVerifiedEmail: (email: string | null) => void;
  /**
   * Current month being viewed. Format is YYYY-MM.
   */
  month: string | null;
  setMonth: (month: string | null) => void;
  /**
   * Current state of the booking process
   * the user is currently in. See enum for possible values.
   */
  state: BookerState;
  setState: (state: BookerState) => void;
  /**
   * The booker component supports different layouts,
   * this value tracks the current layout.
   */
  layout: BookerLayout;
  setLayout: (layout: BookerLayout) => void;
  /**
   * Date selected by user (exact day). Format is YYYY-MM-DD.
   */
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  addToSelectedDate: (days: number) => void;
  /**
   * Multiple Selected Dates and Times
   */
  selectedDatesAndTimes: { [key: string]: { [key: string]: string[] } } | null;
  setSelectedDatesAndTimes: (selectedDatesAndTimes: { [key: string]: { [key: string]: string[] } }) => void;
  /**
   * Multiple duration configuration
   */
  durationConfig: number[] | null;
  /**
   * Selected event duration in minutes.
   */
  selectedDuration: number | null;
  setSelectedDuration: (duration: number | null) => void;
  /**
   * Selected timeslot user has chosen. This is a date string
   * containing both the date + time.
   */
  selectedTimeslot: string | null;
  setSelectedTimeslot: (timeslot: string | null) => void;
  /**
   * Number of recurring events to create.
   */
  recurringEventCount: number | null;
  setRecurringEventCount(count: number | null): void;
  /**
   * Input occurrence count.
   */
  occurenceCount: number | null;
  setOccurenceCount(count: number | null): void;
  /**
   * If booking is being rescheduled or it has seats, it receives a rescheduleUid or bookingUid
   * the current booking details are passed in. The `bookingData`
   * object is something that's fetched server side.
   */
  rescheduleUid: string | null;
  bookingUid: string | null;
  bookingData: GetBookingType | null;
  /**
   * Method called by booker component to set initial data.
   */
  initialize: (data: StoreInitializeType) => void;
  /**
   * Stored form state, used when user navigates back and
   * forth between timeslots and form. Get's cleared on submit
   * to prevent sticky data.
   */
  formValues: Record<string, any>;
  setFormValues: (values: Record<string, any>) => void;
  /**
   * Force event being a team event, so we only query for team events instead
   * of also include 'user' events and return the first event that matches with
   * both the slug and the event slug.
   */
  isTeamEvent: boolean;
  org?: string | null;
  seatedEventData: SeatedEventData;
  setSeatedEventData: (seatedEventData: SeatedEventData) => void;
};

/**
 * The booker store contains the data of the component's
 * current state. This data can be reused within child components
 * by importing this hook.
 *
 * See comments in interface above for more information on it's specific values.
 */
export const useBookerStore = create<BookerStore>((set, get) => ({
  state: "loading",
  setState: (state: BookerState) => set({ state }),
  layout: BookerLayouts.MONTH_VIEW,
  setLayout: (layout: BookerLayout) => {
    // If we switch to a large layout and don't have a date selected yet,
    // we selected it here, so week title is rendered properly.
    if (["week_view", "column_view"].includes(layout) && !get().selectedDate) {
      set({ selectedDate: dayjs().format("YYYY-MM-DD") });
    }
    updateQueryParam("layout", layout);
    return set({ layout });
  },
  selectedDate: getQueryParam("date") || null,
  setSelectedDate: (selectedDate: string | null) => {
    // unset selected date
    if (!selectedDate) {
      removeQueryParam("date");
      return;
    }

    const currentSelection = dayjs(get().selectedDate);
    const newSelection = dayjs(selectedDate);
    set({ selectedDate });
    updateQueryParam("date", selectedDate ?? "");

    // Setting month make sure small calendar in fullscreen layouts also updates.
    if (newSelection.month() !== currentSelection.month()) {
      set({ month: newSelection.format("YYYY-MM") });
      updateQueryParam("month", newSelection.format("YYYY-MM"));
    }
  },
  selectedDatesAndTimes: null,
  setSelectedDatesAndTimes: (selectedDatesAndTimes) => {
    set({ selectedDatesAndTimes });
  },
  addToSelectedDate: (days: number) => {
    const currentSelection = dayjs(get().selectedDate);
    const newSelection = currentSelection.add(days, "day");
    const newSelectionFormatted = newSelection.format("YYYY-MM-DD");

    if (newSelection.month() !== currentSelection.month()) {
      set({ month: newSelection.format("YYYY-MM") });
      updateQueryParam("month", newSelection.format("YYYY-MM"));
    }

    set({ selectedDate: newSelectionFormatted });
    updateQueryParam("date", newSelectionFormatted);
  },
  username: null,
  eventSlug: null,
  eventId: null,
  verifiedEmail: null,
  setVerifiedEmail: (email: string | null) => {
    set({ verifiedEmail: email });
  },
  month: getQueryParam("month") || getQueryParam("date") || dayjs().format("YYYY-MM"),
  setMonth: (month: string | null) => {
    set({ month, selectedTimeslot: null });
    updateQueryParam("month", month ?? "");
    get().setSelectedDate(null);
  },
  isTeamEvent: false,
  seatedEventData: {
    seatsPerTimeSlot: undefined,
    attendees: undefined,
    bookingUid: undefined,
    showAvailableSeatsCount: true,
  },
  setSeatedEventData: (seatedEventData: SeatedEventData) => {
    set({ seatedEventData });
    updateQueryParam("bookingUid", seatedEventData.bookingUid ?? "null");
  },
  initialize: ({
    username,
    eventSlug,
    month,
    eventId,
    rescheduleUid = null,
    bookingUid = null,
    bookingData = null,
    layout,
    isTeamEvent,
    durationConfig,
    org,
  }: StoreInitializeType) => {
    const selectedDateInStore = get().selectedDate;

    if (
      get().username === username &&
      get().eventSlug === eventSlug &&
      get().month === month &&
      get().eventId === eventId &&
      get().rescheduleUid === rescheduleUid &&
      get().bookingUid === bookingUid &&
      get().bookingData?.responses.email === bookingData?.responses.email &&
      get().layout === layout
    )
      return;
    set({
      username,
      eventSlug,
      eventId,
      org,
      rescheduleUid,
      bookingUid,
      bookingData,
      layout: layout || BookerLayouts.MONTH_VIEW,
      isTeamEvent: isTeamEvent || false,
      durationConfig,
      // Preselect today's date in week / column view, since they use this to show the week title.
      selectedDate:
        selectedDateInStore ||
        (["week_view", "column_view"].includes(layout) ? dayjs().format("YYYY-MM-DD") : null),
    });

    if (durationConfig?.includes(Number(getQueryParam("duration")))) {
      set({
        selectedDuration: Number(getQueryParam("duration")),
      });
    } else {
      removeQueryParam("duration");
    }

    // Unset selected timeslot if user is rescheduling. This could happen
    // if the user reschedules a booking right after the confirmation page.
    // In that case the time would still be store in the store, this way we
    // force clear this.
    if (rescheduleUid && bookingData) set({ selectedTimeslot: null });
    if (month) set({ month });
    //removeQueryParam("layout");
  },
  durationConfig: null,
  selectedDuration: null,
  setSelectedDuration: (selectedDuration: number | null) => {
    set({ selectedDuration });
    updateQueryParam("duration", selectedDuration ?? "");
  },
  recurringEventCount: null,
  setRecurringEventCount: (recurringEventCount: number | null) => set({ recurringEventCount }),
  occurenceCount: null,
  setOccurenceCount: (occurenceCount: number | null) => set({ occurenceCount }),
  rescheduleUid: null,
  bookingData: null,
  bookingUid: null,
  selectedTimeslot: getQueryParam("slot") || null,
  setSelectedTimeslot: (selectedTimeslot: string | null) => {
    set({ selectedTimeslot });
    updateQueryParam("slot", selectedTimeslot ?? "");
  },
  formValues: {},
  setFormValues: (formValues: Record<string, any>) => {
    set({ formValues });
  },
}));

export const useInitializeBookerStore = ({
  username,
  eventSlug,
  month,
  eventId,
  rescheduleUid = null,
  bookingData = null,
  verifiedEmail = null,
  layout,
  isTeamEvent,
  durationConfig,
  org,
}: StoreInitializeType) => {
  const initializeStore = useBookerStore((state) => state.initialize);
  useEffect(() => {
    initializeStore({
      username,
      eventSlug,
      month,
      eventId,
      rescheduleUid,
      bookingData,
      layout,
      isTeamEvent,
      org,
      verifiedEmail,
      durationConfig,
    });
  }, [
    initializeStore,
    org,
    username,
    eventSlug,
    month,
    eventId,
    rescheduleUid,
    bookingData,
    layout,
    isTeamEvent,
    verifiedEmail,
    durationConfig,
  ]);
};
