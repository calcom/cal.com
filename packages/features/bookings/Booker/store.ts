"use client";

import { useEffect } from "react";
import { createWithEqualityFn } from "zustand/traditional";

import dayjs from "@calcom/dayjs";
import { BOOKER_NUMBER_OF_DAYS_TO_LOAD } from "@calcom/lib/constants";
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
  rescheduledBy?: string | null;
  seatReferenceUid?: string;
  durationConfig?: number[] | null;
  org?: string | null;
  isInstantMeeting?: boolean;
  timezone?: string | null;
  teamMemberEmail?: string | null;
  crmOwnerRecordType?: string | null;
  crmAppSlug?: string | null;
  crmRecordId?: string | null;
  isPlatform?: boolean;
  allowUpdatingUrlParams?: boolean;
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
  setSelectedDate: (params: {
    date: string | null;
    omitUpdatingParams?: boolean;
    preventMonthSwitching?: boolean;
  }) => void;
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
  tentativeSelectedTimeslots: string[];
  setTentativeSelectedTimeslots: (slots: string[]) => void;
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
   * The number of days worth of schedules to load.
   */
  dayCount: number | null;
  setDayCount: (dayCount: number | null) => void;
  /**
   * If booking is being rescheduled or it has seats, it receives a rescheduleUid with rescheduledBy or bookingUid
   * the current booking details are passed in. The `bookingData`
   * object is something that's fetched server side.
   */
  rescheduleUid: string | null;
  rescheduledBy: string | null;
  bookingUid: string | null;
  bookingData: GetBookingType | null;
  setBookingData: (bookingData: GetBookingType | null | undefined) => void;

  /**
   * Method called by booker component to set initial data.
   */
  initialize: (data: StoreInitializeType) => void;
  /**
   * Stored form state, used when user navigates back and
   * forth between timeslots and form. Gets cleared on submit
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
  seatedEventData: SeatedEventData;
  setSeatedEventData: (seatedEventData: SeatedEventData) => void;

  isInstantMeeting?: boolean;

  org?: string | null;
  setOrg: (org: string | null | undefined) => void;

  timezone: string | null;
  setTimezone: (timezone: string | null) => void;

  teamMemberEmail?: string | null;
  crmOwnerRecordType?: string | null;
  crmAppSlug?: string | null;
  crmRecordId?: string | null;
  isPlatform?: boolean;
  allowUpdatingUrlParams?: boolean;
};

/**
 * The booker store contains the data of the component's
 * current state. This data can be reused within child components
 * by importing this hook.
 *
 * See comments in interface above for more information on it's specific values.
 */
export const useBookerStore = createWithEqualityFn<BookerStore>((set, get) => ({
  state: "loading",
  setState: (state: BookerState) => set({ state }),
  layout: BookerLayouts.MONTH_VIEW,
  setLayout: (layout: BookerLayout) => {
    // If we switch to a large layout and don't have a date selected yet,
    // we selected it here, so week title is rendered properly.
    if (["week_view", "column_view"].includes(layout) && !get().selectedDate) {
      set({ selectedDate: dayjs().format("YYYY-MM-DD") });
    }
    if (!get().isPlatform || get().allowUpdatingUrlParams) {
      updateQueryParam("layout", layout);
    }
    return set({ layout });
  },
  selectedDate: getQueryParam("date") || null,
  setSelectedDate: ({ date: selectedDate, omitUpdatingParams = false, preventMonthSwitching = false }) => {
    // unset selected date
    if (!selectedDate) {
      removeQueryParam("date");
      return;
    }

    const currentSelection = dayjs(get().selectedDate);
    const newSelection = dayjs(selectedDate);
    set({ selectedDate });
    if (!omitUpdatingParams && (!get().isPlatform || get().allowUpdatingUrlParams)) {
      updateQueryParam("date", selectedDate ?? "");
    }

    // Setting month make sure small calendar in fullscreen layouts also updates.
    // preventMonthSwitching is true in monthly view
    if (!preventMonthSwitching && newSelection.month() !== currentSelection.month()) {
      set({ month: newSelection.format("YYYY-MM") });
      if (!omitUpdatingParams && (!get().isPlatform || get().allowUpdatingUrlParams)) {
        updateQueryParam("month", newSelection.format("YYYY-MM"));
      }
    }
  },
  selectedDatesAndTimes: null,
  setSelectedDatesAndTimes: (selectedDatesAndTimes) => {
    set({ selectedDatesAndTimes });
  },
  addToSelectedDate: (days: number) => {
    const currentSelection = dayjs(get().selectedDate);
    let newSelection = currentSelection.add(days, "day");

    // If newSelection is before the current date, set it to today
    if (newSelection.isBefore(dayjs(), "day")) {
      newSelection = dayjs();
    }

    const newSelectionFormatted = newSelection.format("YYYY-MM-DD");

    if (newSelection.month() !== currentSelection.month()) {
      set({ month: newSelection.format("YYYY-MM") });
      if (!get().isPlatform || get().allowUpdatingUrlParams) {
        updateQueryParam("month", newSelection.format("YYYY-MM"));
      }
    }

    set({ selectedDate: newSelectionFormatted });
    if (!get().isPlatform || get().allowUpdatingUrlParams) {
      updateQueryParam("date", newSelectionFormatted);
    }
  },
  username: null,
  eventSlug: null,
  eventId: null,
  rescheduledBy: null,
  verifiedEmail: null,
  setVerifiedEmail: (email: string | null) => {
    set({ verifiedEmail: email });
  },
  month:
    getQueryParam("month") ||
    (getQueryParam("date") && dayjs(getQueryParam("date")).isValid()
      ? dayjs(getQueryParam("date")).format("YYYY-MM")
      : null) ||
    dayjs().format("YYYY-MM"),
  setMonth: (month: string | null) => {
    if (!month) {
      removeQueryParam("month");
      return;
    }
    set({ month, selectedTimeslot: null });
    if (!get().isPlatform || get().allowUpdatingUrlParams) {
      updateQueryParam("month", month ?? "");
    }
    get().setSelectedDate({ date: null });
  },
  dayCount: BOOKER_NUMBER_OF_DAYS_TO_LOAD > 0 ? BOOKER_NUMBER_OF_DAYS_TO_LOAD : null,
  setDayCount: (dayCount: number | null) => {
    set({ dayCount });
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
    if (!get().isPlatform || get().allowUpdatingUrlParams) {
      updateQueryParam("bookingUid", seatedEventData.bookingUid ?? "null");
    }
  },
  // This is different from timeZone in timePreferencesStore, because timeZone in timePreferencesStore is the preferred timezone of the booker,
  // it is the timezone configured through query param. So, this is in a way the preference of the person who shared the link.
  // it is the timezone configured through query param. So, this is in a way the preference of the person who shared the link.
  timezone: getQueryParam("cal.tz") ?? null,
  setTimezone: (timezone: string | null) => {
    set({ timezone });
  },
  initialize: ({
    username,
    eventSlug,
    month,
    eventId,
    rescheduleUid = null,
    rescheduledBy = null,
    bookingUid = null,
    bookingData = null,
    layout,
    isTeamEvent,
    durationConfig,
    org,
    isInstantMeeting,
    timezone = null,
    teamMemberEmail,
    crmOwnerRecordType,
    crmAppSlug,
    crmRecordId,
    isPlatform = false,
    allowUpdatingUrlParams = true,
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
      get().layout === layout &&
      get().timezone === timezone &&
      get().rescheduledBy === rescheduledBy &&
      get().teamMemberEmail === teamMemberEmail &&
      get().crmOwnerRecordType === crmOwnerRecordType &&
      get().crmAppSlug === crmAppSlug &&
      get().crmRecordId === crmRecordId
    )
      return;
    set({
      username,
      eventSlug,
      eventId,
      org,
      rescheduleUid,
      rescheduledBy,
      bookingUid,
      bookingData,
      layout: layout || BookerLayouts.MONTH_VIEW,
      isTeamEvent: isTeamEvent || false,
      durationConfig,
      timezone,
      // Preselect today's date in week / column view, since they use this to show the week title.
      selectedDate:
        selectedDateInStore ||
        (["week_view", "column_view"].includes(layout) ? dayjs().format("YYYY-MM-DD") : null),
      teamMemberEmail,
      crmOwnerRecordType,
      crmAppSlug,
      crmRecordId,
      isPlatform,
      allowUpdatingUrlParams,
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
    // Also, fetch the original booking duration if user is rescheduling and
    // update the selectedDuration
    if (rescheduleUid && bookingData) {
      set({ selectedTimeslot: null });
      const originalBookingLength = dayjs(bookingData?.endTime).diff(
        dayjs(bookingData?.startTime),
        "minutes"
      );
      set({ selectedDuration: originalBookingLength });
      if (!isPlatform || allowUpdatingUrlParams) {
        updateQueryParam("duration", originalBookingLength ?? "");
      }
    }
    if (month) set({ month });

    if (isInstantMeeting) {
      const month = dayjs().format("YYYY-MM");
      const selectedDate = dayjs().format("YYYY-MM-DD");
      const selectedTimeslot = new Date().toISOString();
      set({
        month,
        selectedDate,
        selectedTimeslot,
        isInstantMeeting,
      });

      if (!isPlatform || allowUpdatingUrlParams) {
        updateQueryParam("month", month);
        updateQueryParam("date", selectedDate ?? "");
        updateQueryParam("slot", selectedTimeslot ?? "", false);
      }
    }
    //removeQueryParam("layout");
  },
  durationConfig: null,
  selectedDuration: null,
  setSelectedDuration: (selectedDuration: number | null) => {
    set({ selectedDuration });
    if (!get().isPlatform || get().allowUpdatingUrlParams) {
      updateQueryParam("duration", selectedDuration ?? "");
    }
  },
  setBookingData: (bookingData: GetBookingType | null | undefined) => {
    set({ bookingData: bookingData ?? null });
  },
  recurringEventCount: null,
  setRecurringEventCount: (recurringEventCount: number | null) => set({ recurringEventCount }),
  occurenceCount: null,
  setOccurenceCount: (occurenceCount: number | null) => set({ occurenceCount }),
  rescheduleUid: null,
  bookingData: null,
  bookingUid: null,
  selectedTimeslot: getQueryParam("slot") || null,
  tentativeSelectedTimeslots: [],
  setTentativeSelectedTimeslots: (tentativeSelectedTimeslots: string[]) => {
    set({ tentativeSelectedTimeslots });
  },
  setSelectedTimeslot: (selectedTimeslot: string | null) => {
    set({ selectedTimeslot });
    if (!get().isPlatform || get().allowUpdatingUrlParams) {
      updateQueryParam("slot", selectedTimeslot ?? "", false);
    }
  },
  formValues: {},
  setFormValues: (formValues: Record<string, any>) => {
    set({ formValues });
  },
  org: null,
  setOrg: (org: string | null | undefined) => {
    set({ org });
  },
  isPlatform: false,
  allowUpdatingUrlParams: true,
}));

export const useInitializeBookerStore = ({
  username,
  eventSlug,
  month,
  eventId,
  rescheduleUid = null,
  rescheduledBy = null,
  bookingData = null,
  verifiedEmail = null,
  layout,
  isTeamEvent,
  durationConfig,
  org,
  isInstantMeeting,
  timezone = null,
  teamMemberEmail,
  crmOwnerRecordType,
  crmAppSlug,
  crmRecordId,
  isPlatform = false,
  allowUpdatingUrlParams = true,
}: StoreInitializeType) => {
  const initializeStore = useBookerStore((state) => state.initialize);
  useEffect(() => {
    initializeStore({
      username,
      eventSlug,
      month,
      eventId,
      rescheduleUid,
      rescheduledBy,
      bookingData,
      layout,
      isTeamEvent,
      org,
      verifiedEmail,
      durationConfig,
      isInstantMeeting,
      timezone,
      teamMemberEmail,
      crmOwnerRecordType,
      crmAppSlug,
      crmRecordId,
      isPlatform,
      allowUpdatingUrlParams,
    });
  }, [
    initializeStore,
    org,
    username,
    eventSlug,
    month,
    eventId,
    rescheduleUid,
    rescheduledBy,
    bookingData,
    layout,
    isTeamEvent,
    verifiedEmail,
    durationConfig,
    isInstantMeeting,
    timezone,
    teamMemberEmail,
    crmOwnerRecordType,
    crmAppSlug,
    crmRecordId,
    isPlatform,
    allowUpdatingUrlParams,
  ]);
};
