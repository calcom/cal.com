import { useEffect } from "react";
import { create } from "zustand";

import type { GetBookingType } from "../lib/get-booking";
import type { BookerState, BookerLayout } from "./types";

// Before booker store is initialized, it's unsure if all data is set,
// therefore these null values are allowed.
type BookerStoreUninitialized = {
  username: string | null;
  eventSlug: string | null;
  eventId: number | null;
  month: Date | null;
  initialized: false;
};

type BookerStoreInitialized = {
  /**
   * Event details. These are stored in store for easier
   * access in child components.
   */
  username: string;
  eventSlug: string;
  eventId: number;
  /**
   * Current month being viewed.
   */
  month: Date;
  initialized: true;
};

/**
 * Arguments passed into store initializer, containing
 * the event data.
 */
type StoreInitializeType = {
  username: string;
  eventSlug: string;
  month: Date;
  eventId: number | undefined;
  rescheduleUid: string | null;
  rescheduleBooking: GetBookingType | null | undefined;
};

type BookerStore = {
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
   * containing both the data + time.
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
export const useBookerStore = create<BookerStore & (BookerStoreUninitialized | BookerStoreInitialized)>(
  (set, get) => ({
    state: "loading",
    setState: (state: BookerState) => set({ state }),
    layout: "small_calendar",
    setLayout: (layout: BookerLayout) => set({ layout }),
    selectedDate:
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("month") ?? null : null,
    setSelectedDate: (selectedDate: string | null) => set({ selectedDate }),
    username: null,
    eventSlug: null,
    eventId: null,
    month: null,
    initialized: false,
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
        get().rescheduleBooking?.attendees[0].email === rescheduleBooking?.attendees[0].email
      )
        return;
      set({ username, eventSlug, month, eventId, rescheduleUid, rescheduleBooking, initialized: true });
    },
    selectedDuration:
      typeof window !== "undefined"
        ? Number(new URLSearchParams(window.location.search).get("duration")) ?? null
        : null,
    setSelectedDuration: (selectedDuration: number | null) => set({ selectedDuration }),
    recurringEventCount: null,
    setRecurringEventCount: (recurringEventCount: number | null) => set({ recurringEventCount }),
    rescheduleBooking: null,
    rescheduleUid: null,
    selectedTimeslot:
      typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("date") ?? null : null,
    setSelectedTimeslot: (selectedTimeslot: string | null) => set({ selectedTimeslot }),
  })
);

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
