import { create } from "zustand";

import { GetBookingType } from "../lib/get-booking";
import { BookerState, BookerLayout } from "./types";

type BookerStore = {
  state: BookerState;
  setState: (state: BookerState) => void;
  layout: BookerLayout;
  setLayout: (layout: BookerLayout) => void;
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  username: string | null;
  eventSlug: string | null;
  eventId: number | null;
  month: Date | null;
  initialize: (
    username: string,
    eventSlug: string,
    month: Date,
    eventId: number | undefined,
    rescheduleUid?: string | null,
    rescheduleBooking?: GetBookingType | null
  ) => void;
  selectedDuration: number | null;
  setSelectedDuration: (duration: number | null) => void;
  recurringEventCount: number | null;
  setRecurringEventCount(count: number | null): void;
  rescheduleUid: string | null;
  rescheduleBooking: GetBookingType | null;
};

export const useBookerStore = create<BookerStore>((set, get) => ({
  state: "loading",
  setState: (state: BookerState) => set({ state }),
  layout: "small_calendar",
  setLayout: (layout: BookerLayout) => set({ layout }),
  selectedDate: null,
  setSelectedDate: (selectedDate: string | null) => set({ selectedDate }),
  username: null,
  eventSlug: null,
  eventId: null,
  month: null,
  initialize: (
    username: string,
    eventSlug: string,
    month: Date,
    eventId: number | undefined,
    rescheduleUid: string | null = null,
    rescheduleBooking: GetBookingType | null = null
  ) => {
    if (
      get().username === username &&
      get().eventSlug === eventSlug &&
      get().month === month &&
      get().eventId === eventId &&
      get().rescheduleUid === rescheduleUid &&
      get().rescheduleBooking?.attendees[0].email === rescheduleBooking?.attendees[0].email
    )
      return;
    set({ username, eventSlug, month, eventId, rescheduleUid, rescheduleBooking });
  },
  selectedDuration: null,
  setSelectedDuration: (selectedDuration: number | null) => set({ selectedDuration }),
  recurringEventCount: null,
  setRecurringEventCount: (recurringEventCount: number | null) => set({ recurringEventCount }),
  rescheduleBooking: null,
  rescheduleUid: null,
}));
