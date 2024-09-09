import type { GetBookingType } from "../lib/get-booking";
import type { BookerState, BookerLayout } from "./types";
/**
 * Arguments passed into store initializer, containing
 * the event data.
 */
type StoreInitializeType = {
    username: string;
    eventSlug: string;
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
    teamMemberEmail?: string | null;
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
    selectedDatesAndTimes: {
        [key: string]: {
            [key: string]: string[];
        };
    } | null;
    setSelectedDatesAndTimes: (selectedDatesAndTimes: {
        [key: string]: {
            [key: string]: string[];
        };
    }) => void;
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
    seatedEventData: SeatedEventData;
    setSeatedEventData: (seatedEventData: SeatedEventData) => void;
    isInstantMeeting?: boolean;
    org?: string | null;
    setOrg: (org: string | null | undefined) => void;
    teamMemberEmail?: string | null;
};
/**
 * The booker store contains the data of the component's
 * current state. This data can be reused within child components
 * by importing this hook.
 *
 * See comments in interface above for more information on it's specific values.
 */
export declare const useBookerStore: import("zustand").UseBoundStore<import("zustand").StoreApi<BookerStore>>;
export declare const useInitializeBookerStore: ({ username, eventSlug, month, eventId, rescheduleUid, rescheduledBy, bookingData, verifiedEmail, layout, isTeamEvent, durationConfig, org, isInstantMeeting, teamMemberEmail, }: StoreInitializeType) => void;
export {};
//# sourceMappingURL=store.d.ts.map