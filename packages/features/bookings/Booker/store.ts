import { useEffect } from "react";
import { create } from "zustand";

import dayjs from "@calcom/dayjs";

import type { GetBookingType } from "../lib/get-booking";
import type { BookerState, BookerLayout } from "./types";
import { updateQueryParam, getQueryParam } from "./utils/query-param";

/**
 * Arguments passed into store initializer, containing
 * the event data.
 */
type StoreInitializeType = {
  username: string;
  eventSlug: string;
  // Month can be undefined if it's not passed in as a prop.
  month?: string;
  eventId: number | undefined;
  rescheduleUid: string | null;
  rescheduleBooking: GetBookingType | null | undefined;
};

type BookerStore = {
  /**
   * Event details. These are stored in store for easier
   * access in child components.
   */
  username: string | null;
  eventSlug: string | null;
  eventId: number | null;
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
   * If booking is being rescheduled, both the ID as well as
   * the current booking details are passed in. The `rescheduleBooking`
   * object is something that's fetched server side.
   */
  rescheduleUid: string | null;
  rescheduleBooking: GetBookingType | null;
  /**
   * Method called by booker component to set initial data.
   */
  initialize: (data: StoreInitializeType) => void;
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
  layout: "small_calendar",
  setLayout: (layout: BookerLayout) => set({ layout }),
  selectedDate: getQueryParam("date") || null,
  setSelectedDate: (selectedDate: string | null) => {
    set({ selectedDate });
    updateQueryParam("date", selectedDate ?? "");
  },
  username: null,
  eventSlug: null,
  eventId: null,
  month: getQueryParam("month") || getQueryParam("date") || dayjs().format("YYYY-MM"),
  setMonth: (month: string | null) => {
    set({ month, selectedTimeslot: null });
    updateQueryParam("month", month ?? "");
    get().setSelectedDate(null);
  },
  initialize: ({
    username,
    eventSlug,
    month,
    eventId,
    rescheduleUid = null,
    rescheduleBooking = null,
  }: StoreInitializeType) => {
    if (
      get().username === username &&
      get().eventSlug === eventSlug &&
      get().month === month &&
      get().eventId === eventId &&
      get().rescheduleUid === rescheduleUid &&
      get().rescheduleBooking?.responses.email === rescheduleBooking?.responses.email
    )
      return;
    set({
      username,
      eventSlug,
      eventId,
      rescheduleUid,
      rescheduleBooking,
    });
    // Unset selected timeslot if user is rescheduling. This could happen
    // if the user reschedules a booking right after the confirmation page.
    // In that case the time would still be store in the store, this way we
    // force clear this.
    if (rescheduleBooking) set({ selectedTimeslot: null });
    if (month) set({ month });
  },
  selectedDuration: Number(getQueryParam("duration")) || null,
  setSelectedDuration: (selectedDuration: number | null) => {
    set({ selectedDuration });
    updateQueryParam("duration", selectedDuration ?? "");
  },
  recurringEventCount: null,
  setRecurringEventCount: (recurringEventCount: number | null) => set({ recurringEventCount }),
  rescheduleBooking: null,
  rescheduleUid: null,
  selectedTimeslot: getQueryParam("slot") || null,
  setSelectedTimeslot: (selectedTimeslot: string | null) => {
    set({ selectedTimeslot });
    updateQueryParam("slot", selectedTimeslot ?? "");
  },
}));

export const useInitializeBookerStore = ({
  username,
  eventSlug,
  month,
  eventId,
  rescheduleUid = null,
  rescheduleBooking = null,
}: StoreInitializeType) => {
  const initializeStore = useBookerStore((state) => state.initialize);
  useEffect(() => {
    initializeStore({ username, eventSlug, month, eventId, rescheduleUid, rescheduleBooking });
  }, [initializeStore, username, eventSlug, month, eventId, rescheduleUid, rescheduleBooking]);
};
