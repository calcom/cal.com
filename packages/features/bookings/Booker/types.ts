import type React from "react";

import type { UseBookerLayoutType } from "@calcom/features/bookings/Booker/components/hooks/useBookerLayout";
import type { UseBookingFormReturnType } from "@calcom/features/bookings/Booker/components/hooks/useBookingForm";
import type { UseBookingsReturnType } from "@calcom/features/bookings/Booker/components/hooks/useBookings";
import type { UseCalendarsReturnType } from "@calcom/features/bookings/Booker/components/hooks/useCalendars";
import type { UseSlotsReturnType } from "@calcom/features/bookings/Booker/components/hooks/useSlots";
import type { UseVerifyCodeReturnType } from "@calcom/features/bookings/Booker/components/hooks/useVerifyCode";
import type { UseVerifyEmailReturnType } from "@calcom/features/bookings/Booker/components/hooks/useVerifyEmail";
import type { useScheduleForEventReturnType } from "@calcom/features/bookings/Booker/utils/event";
import type { BookerEventQuery } from "@calcom/features/bookings/types";
import type { IntlSupportedTimeZones } from "@calcom/lib/timeZones";

import type { GetBookingType } from "../lib/get-booking";

export type Timezone = (typeof IntlSupportedTimeZones)[number];

/**
 * Entity configuration for the Booker component.
 *
 * This object provides organizational context for the booking flow and is
 * essential for proper availability resolution, especially in these scenarios:
 *
 * 1. **Organization-scoped events**: When booking events within an organization,
 *    the `orgSlug` helps resolve the correct user/team availability.
 *
 * 2. **Dynamic bookings**: When multiple usernames are provided (e.g., "alice+bob"),
 *    the entity context ensures availability is fetched from the correct org scope.
 *
 * 3. **Team events**: The `teamSlug` identifies which team's event is being booked.
 *
 * @example
 * // Minimal entity for a public event
 * entity={{ considerUnpublished: false }}
 *
 * @example
 * // Organization-scoped event
 * entity={{
 *   considerUnpublished: false,
 *   orgSlug: "acme-corp",
 *   name: "ACME Corporation"
 * }}
 *
 * @example
 * // Team event within an organization
 * entity={{
 *   considerUnpublished: false,
 *   orgSlug: "acme-corp",
 *   teamSlug: "sales-team",
 *   name: "Sales Team"
 * }}
 */
export interface BookerEntityConfig {
  /**
   * Indicates if the user was redirected from a non-organization link.
   * Used for analytics and redirect handling.
   */
  fromRedirectOfNonOrgLink?: boolean;

  /**
   * If true and the organization is unpublished, shows an "unpublished" state.
   * Set to false to bypass this check (e.g., for reschedule links where the
   * booking should proceed regardless of org publish status).
   */
  considerUnpublished: boolean;

  /**
   * Whether the organization/team is currently unpublished.
   * When true and `considerUnpublished` is also true, the Booker shows
   * an unpublished state instead of the booking flow.
   */
  isUnpublished?: boolean;

  /**
   * The organization's slug (URL-friendly identifier).
   *
   * **Important for availability resolution:**
   * - Required for org-scoped events to fetch correct availability
   * - For dynamic bookings, ensures users are resolved within the correct org
   * - If not provided, the platform wrapper attempts to resolve it from event data
   *
   * @example "acme-corp"
   */
  orgSlug?: string | null;

  /**
   * The team's slug within the organization.
   * Used to identify team-specific events.
   *
   * @example "engineering"
   */
  teamSlug?: string | null;

  /**
   * Display name of the organization or team.
   * Shown in the Booker UI for branding purposes.
   */
  name?: string | null;

  /**
   * URL to the organization or team logo.
   * Displayed in the Booker header/meta section.
   */
  logoUrl?: string | null;

  /**
   * The specific event type ID.
   * Used for routing and validation purposes.
   */
  eventTypeId?: number | null;
}

export interface BookerProps {
  eventSlug: string;
  /**
   * Username(s) for the booking.
   *
   * **Single username**: Standard individual booking
   * @example username="john"
   *
   * **Multiple usernames (dynamic booking)**: Combined availability from all users.
   * Users are joined with "+" internally (e.g., "alice+bob").
   * All specified users must have `allowDynamicBooking` enabled.
   * @example username="alice+bob"
   *
   * Note: For the Platform Booker Atom, you can pass an array directly:
   * @example username={["alice", "bob"]}
   */
  username: string;
  orgBannerUrl?: string | null;

  /*
    all custom classnames related to booker styling go here
  */
  customClassNames?: CustomClassNames;

  /**
   * Custom React components to render at the bottom of the EventMeta component
   */
  eventMetaChildren?: React.ReactNode;

  /**
   * Entity configuration providing organizational context for the booking.
   * See {@link BookerEntityConfig} for detailed documentation.
   *
   * **Why entity matters:**
   * - Determines which organization scope to use for availability lookups
   * - Controls unpublished state display
   * - Provides branding information (logo, name)
   *
   * For dynamic bookings or org-scoped events, ensure `orgSlug` is set
   * either here or let the platform wrapper resolve it automatically.
   */
  entity: BookerEntityConfig;

  /**
   * If month is NOT set as a prop on the component, we expect a query parameter
   * called `month` to be present on the url. If that is missing, the component will
   * default to the current month.
   * @note In case you're using a client side router, please pass the value in as a prop,
   * since the component will leverage window.location, which might not have the query param yet.
   * @format YYYY-MM.
   * @optional
   */
  month?: string;
  /**
   * Default selected date for with the slotpicker will already open.
   * @optional
   */
  selectedDate?: Date;

  hideBranding?: boolean;
  /**
   * If false and the current username indicates a dynamic booking,
   * the Booker will immediately show an error.
   * This is NOT revalidated by calling the API.
   */
  allowsDynamicBooking?: boolean;
  /**
   * When rescheduling a booking, the current' bookings data is passed in via this prop.
   * The component itself won't fetch booking data based on the ID, since there is not public
   * api to fetch this data. Therefore rescheduling a booking currently is not possible
   * within the atom (i.e. without a server side component).
   */
  bookingData?: GetBookingType;
  /**
   * If this boolean is passed, we will only check team events with this slug and event slug.
   * If it's not passed, we will first query a generic user event, and only if that doesn't exist
   * fetch the team event. In case there's both a team + user with the same slug AND same event slug,
   * that will always result in the user event being returned.
   */
  isTeamEvent?: boolean;
  /**
   * Refers to a multiple-duration event-type
   * It will correspond to selected time from duration query param if exists and if it is allowed as an option,
   * otherwise, the default value is selected
   */
  duration?: number | null;
  /**
   * Configures the selectable options for a multiDuration event type.
   */
  durationConfig?: number[];
  /**
   * Refers to the private link from event types page.
   */
  hashedLink?: string | null;
  isInstantMeeting?: boolean;
  teamMemberEmail?: string | null;
  showNoAvailabilityDialog?: boolean;
  crmOwnerRecordType?: string | null;
  crmAppSlug?: string | null;
  crmRecordId?: string | null;
  areInstantMeetingParametersSet?: boolean | null;
  userLocale?: string | null;
  hasValidLicense?: boolean;
  useApiV2?: boolean;
}

export type WrappedBookerPropsMain = {
  sessionUsername?: string | null;
  rescheduleUid: string | null;
  rescheduledBy: string | null;
  bookingUid: string | null;
  isRedirect: boolean;
  fromUserNameRedirected: string;
  hasSession: boolean;
  onGoBackInstantMeeting: () => void;
  onConnectNowInstantMeeting: () => void;
  onOverlayClickNoCalendar: () => void;
  onClickOverlayContinue: () => void;
  onOverlaySwitchStateChange: (state: boolean) => void;
  extraOptions: Record<string, string | string[]>;
  bookings: UseBookingsReturnType;
  slots: UseSlotsReturnType;
  calendars: UseCalendarsReturnType;
  bookerForm: UseBookingFormReturnType;
  event: BookerEventQuery;
  schedule: useScheduleForEventReturnType;
  bookerLayout: UseBookerLayoutType;
  verifyEmail: UseVerifyEmailReturnType;
  customClassNames?: CustomClassNames;
  isBookingDryRun?: boolean;
  renderCaptcha?: boolean;
  confirmButtonDisabled?: boolean;
};

export type WrappedBookerPropsForPlatform = WrappedBookerPropsMain & {
  isPlatform: true;
  verifyCode: undefined;
  customClassNames?: CustomClassNames;
  timeZones?: Timezone[];
  roundRobinHideOrgAndTeam?: boolean;
};
export type WrappedBookerPropsForWeb = WrappedBookerPropsMain & {
  isPlatform: false;
  verifyCode: UseVerifyCodeReturnType;
  timeZones?: Timezone[];
  roundRobinHideOrgAndTeam?: boolean;
};

export type WrappedBookerProps = WrappedBookerPropsForPlatform | WrappedBookerPropsForWeb;
export type VIEW_TYPE = "MONTH_VIEW" | "WEEK_VIEW" | "COLUMN_VIEW";

export type BookerState = "loading" | "selecting_date" | "selecting_time" | "booking";
export type BookerLayout = "month_view" | "week_view" | "column_view" | "mobile";
export type BookerAreas = "calendar" | "timeslots" | "main" | "meta" | "header";

export type CustomClassNames = {
  bookerWrapper?: string;
  bookerContainer?: string;
  eventMetaCustomClassNames?: {
    eventMetaContainer?: string;
    eventMetaTitle?: string;
    eventMetaTimezoneSelect?: string;
    eventMetaChildren?: string;
  };
  datePickerCustomClassNames?: DatePickerClassNames;
  availableTimeSlotsCustomClassNames?: {
    availableTimeSlotsContainer?: string;
    availableTimeSlotsHeaderContainer?: string;
    availableTimeSlotsTitle?: string;
    availableTimeSlotsTimeFormatToggle?: string;
    availableTimes?: string;
  };
  atomsWrapper?: string;
  confirmStep?: {
    confirmButton?: string;
    backButton?: string;
  };
};

export type DatePickerClassNames = {
  datePickerContainer?: string;
  datePickerTitle?: string;
  datePickerDays?: string;
  datePickerDate?: string;
  datePickerDatesActive?: string;
  datePickerToggle?: string;
};
