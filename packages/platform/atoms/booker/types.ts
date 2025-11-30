import type React from "react";

import type { BookerProps } from "@calcom/features/bookings/Booker";
import type { BookerStore, CountryCode } from "@calcom/features/bookings/Booker/store";
import type { Timezone, VIEW_TYPE } from "@calcom/features/bookings/Booker/types";
import type { BookingCreateBody } from "@calcom/features/bookings/lib/bookingCreateBodySchema";
import type { BookingResponse } from "@calcom/platform-libraries";
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiSuccessResponseWithoutData,
  RoutingFormSearchParams,
} from "@calcom/platform-types";
import type { Slot } from "@calcom/trpc/server/routers/viewer/slots/types";

import type { UseCreateBookingInput } from "../hooks/bookings/useCreateBooking";

// Type that includes only the data values from BookerStore (excluding functions)
export type BookerStoreValues = Omit<
  BookerStore,
  | "setState"
  | "setLayout"
  | "setSelectedDate"
  | "setSelectedDatesAndTimes"
  | "addToSelectedDate"
  | "setVerifiedEmail"
  | "setMonth"
  | "setDayCount"
  | "setSeatedEventData"
  | "setTimezone"
  | "initialize"
  | "setSelectedDuration"
  | "setBookingData"
  | "setRecurringEventCount"
  | "setRecurringEventCountQueryParam"
  | "setTentativeSelectedTimeslots"
  | "setSelectedTimeslot"
  | "setFormValues"
  | "setOrg"
>;

/**
 * Entity configuration for the Booker Atom.
 *
 * The `entity` prop provides organizational context for the booking flow.
 * It helps the Booker resolve availability correctly, especially for
 * organization-scoped events and dynamic booking scenarios.
 *
 * @property considerUnpublished - If true, shows "unpublished" state for orgs that aren't live yet.
 *                                 Set to false to bypass this check (e.g., for reschedule links).
 * @property orgSlug - The organization's slug. Required for org-scoped availability lookups.
 *                     If not provided, the wrapper will attempt to resolve it from user/team data.
 * @property teamSlug - The team's slug within the organization (if applicable).
 * @property name - Display name of the organization or team.
 * @property logoUrl - URL to the organization or team logo.
 * @property eventTypeId - The specific event type ID (optional, used for routing).
 * @property fromRedirectOfNonOrgLink - Indicates if the user was redirected from a non-org link.
 * @property isUnpublished - Whether the org/team is currently unpublished.
 */
export type BookerEntityConfig = {
  fromRedirectOfNonOrgLink?: boolean;
  considerUnpublished: boolean;
  isUnpublished?: boolean;
  orgSlug?: string | null;
  teamSlug?: string | null;
  name?: string | null;
  logoUrl?: string | null;
  eventTypeId?: number | null;
};

export type BookerPlatformWrapperAtomProps = Omit<
  BookerProps,
  "username" | "entity" | "isTeamEvent" | "teamId"
> & {
  rescheduleUid?: string;
  rescheduledBy?: string;
  bookingUid?: string;
  /**
   * Entity configuration for organizational context.
   * See {@link BookerEntityConfig} for detailed documentation.
   *
   * The `orgSlug` field is particularly important for dynamic bookings:
   * - If provided, it will be used directly for availability lookups.
   * - If not provided, the wrapper will attempt to resolve it from user/team data
   *   when the event data is loaded.
   *
   * @example
   * // For organization-scoped booking
   * entity={{ considerUnpublished: false, orgSlug: "acme-corp" }}
   *
   * @example
   * // Minimal configuration (orgSlug resolved automatically)
   * entity={{ considerUnpublished: false }}
   */
  entity?: BookerEntityConfig;
  // values for the booking form and booking fields
  defaultFormValues?: {
    firstName?: string;
    lastName?: string;
    guests?: string[];
    name?: string;
    email?: string;
    notes?: string;
    rescheduleReason?: string;
  } & Record<string, string | string[]>;
  handleCreateBooking?: (input: UseCreateBookingInput) => void;
  handleCreateRecurringBooking?: (input: BookingCreateBody[]) => void;
  onCreateBookingSuccess?: (data: ApiSuccessResponse<BookingResponse>) => void;
  onCreateBookingError?: (data: ApiErrorResponse | Error) => void;
  onCreateRecurringBookingSuccess?: (data: ApiSuccessResponse<BookingResponse[]>) => void;
  onCreateRecurringBookingError?: (data: ApiErrorResponse | Error) => void;
  onCreateInstantBookingSuccess?: (data: ApiSuccessResponse<BookingResponse>) => void;
  onCreateInstantBookingError?: (data: ApiErrorResponse | Error) => void;
  onReserveSlotSuccess?: (data: ApiSuccessResponse<string>) => void;
  onReserveSlotError?: (data: ApiErrorResponse) => void;
  onDeleteSlotSuccess?: (data: ApiSuccessResponseWithoutData) => void;
  onDeleteSlotError?: (data: ApiErrorResponse) => void;
  onBookerStateChange?: (state: BookerStoreValues) => void;
  handleSlotReservation?: (timeslot: string) => void;
  locationUrl?: string;
  view?: VIEW_TYPE;
  metadata?: Record<string, string>;
  bannerUrl?: string;
  onDryRunSuccess?: () => void;
  hostsLimit?: number;
  preventEventTypeRedirect?: boolean;
  allowUpdatingUrlParams?: boolean;
  confirmButtonDisabled?: boolean;
  timeZones?: Timezone[];
  isBookingDryRun?: boolean;
  eventMetaChildren?: React.ReactNode;
  onTimeslotsLoaded?: (slots: Record<string, Slot[]>) => void;
  startTime?: string | Date;
  roundRobinHideOrgAndTeam?: boolean;
  silentlyHandleCalendarFailures?: boolean;
  hideEventMetadata?: boolean;
  defaultPhoneCountry?: CountryCode;
};

/**
 * Props for individual (non-team) event bookings.
 *
 * @example
 * // Single user booking
 * <Booker username="john" eventSlug="30min" />
 *
 * @example
 * // Dynamic booking with multiple users (collective availability)
 * <Booker
 *   username={["alice", "bob"]}
 *   eventSlug="30min"
 *   entity={{ considerUnpublished: false, orgSlug: "acme" }}
 * />
 *
 * Note: For dynamic bookings (multiple usernames), all users must have
 * `allowDynamicBooking` enabled. The Booker will show combined availability
 * across all specified users.
 */
export type BookerPlatformWrapperAtomPropsForIndividual = BookerPlatformWrapperAtomProps & {
  /**
   * Username(s) for the booking.
   * - Pass a single string for standard individual bookings.
   * - Pass an array of strings for dynamic bookings (combined availability).
   *
   * For dynamic bookings, usernames are joined with "+" internally (e.g., "alice+bob")
   * to create the dynamic booking identifier.
   */
  username: string | string[];
  isTeamEvent?: false;
  routingFormSearchParams?: RoutingFormSearchParams;
};

/**
 * Props for team event bookings.
 *
 * @example
 * // Team event booking
 * <Booker
 *   teamId={123}
 *   eventSlug="team-meeting"
 *   isTeamEvent={true}
 * />
 *
 * @example
 * // Team event with specific team member
 * <Booker
 *   teamId={123}
 *   username="team-member"
 *   eventSlug="consultation"
 *   isTeamEvent={true}
 * />
 */
export type BookerPlatformWrapperAtomPropsForTeam = BookerPlatformWrapperAtomProps & {
  /**
   * Optional username(s) for team events.
   * When provided with a team event, filters availability to specific team member(s).
   */
  username?: string | string[];
  isTeamEvent: true;
  teamId: number;
  routingFormSearchParams?: RoutingFormSearchParams;
};
