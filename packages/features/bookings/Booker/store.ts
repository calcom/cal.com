import { useEffect } from "react";
import { create } from "zustand";

import dayjs from "@calcom/dayjs";
import { BookerLayouts } from "@calcom/prisma/zod-utils";

import type { GetBookingType } from "../lib/get-booking";
import type { BookerState, BookerLayout } from "./types";
import { validateLayout } from "./utils/layout";
import { getQueryParam, removeQueryParam, updateQueryParam } from "./utils/query-param";

/**
 * Arguments passed into store initializer, containing
 * the event data.
 */
type StoreInitializeType = {
  eventId: number | undefined;
  rescheduleBooking: GetBookingType | null | undefined;
  layout: BookerLayout;
  isTeamEvent?: boolean;
};

export type BookerStore = {
  eventId: number | null;
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
   * Number of recurring events to create.
   */
  recurringEventCount: number | null;
  setRecurringEventCount(count: number | null): void;
  rescheduleBooking: GetBookingType | null;
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
  layout: validateLayout(getQueryParam("layout") as BookerLayouts) || BookerLayouts.MONTH_VIEW,
  setLayout: (layout: BookerLayout) => {
    const date = getQueryParam("date");
    const month = getQueryParam("month");
    // If we switch to a large layout and don't have a date selected yet,
    // we selected it here, so week title is rendered properly.
    if (["week_view", "column_view"].includes(layout) && !date) {
      updateQueryParam("date", (month ? dayjs(month, "YYYY-MM") : dayjs()).format("YYYY-MM-DD"));
    }
    return set({ layout });
  },
  eventId: null,
  isTeamEvent: false,
  initialize: ({ eventId, rescheduleBooking = null, layout, isTeamEvent }: StoreInitializeType) => {
    if (
      get().eventId === eventId &&
      get().rescheduleBooking?.responses.email === rescheduleBooking?.responses.email &&
      get().layout === layout
    )
      return;
    set({
      eventId,
      rescheduleBooking,
      layout: layout || BookerLayouts.MONTH_VIEW,
      isTeamEvent: isTeamEvent || false,
    });

    removeQueryParam("layout");
  },
  recurringEventCount: null,
  setRecurringEventCount: (recurringEventCount: number | null) => set({ recurringEventCount }),
  rescheduleBooking: null,
  rescheduleUid: null,
  formValues: {},
  setFormValues: (formValues: Record<string, any>) => {
    set({ formValues });
  },
}));

export const useInitializeBookerStore = ({
  eventId,
  rescheduleBooking = null,
  layout,
  isTeamEvent,
}: StoreInitializeType) => {
  const initializeStore = useBookerStore((state) => state.initialize);
  useEffect(() => {
    initializeStore({
      eventId,
      rescheduleBooking,
      layout,
      isTeamEvent,
    });
  }, [initializeStore, eventId, rescheduleBooking, layout, isTeamEvent]);
};
