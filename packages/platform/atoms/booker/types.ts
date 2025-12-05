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

// Internal entity configuration type - resolved automatically from event data
type BookerEntityConfig = {
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
  /** @internal - Entity configuration is resolved automatically from event data */
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
 * <Booker username={["alice", "bob"]} eventSlug="30min" />
 *
 * Note: For dynamic bookings (multiple usernames), all users must have
 * `allowDynamicBooking` enabled (true by default). The Booker will show
 * combined availability across all specified users.
 */
export type BookerPlatformWrapperAtomPropsForIndividual = BookerPlatformWrapperAtomProps & {
  /**
   * Username(s) for the booking.
   * - Pass a single string for standard individual bookings.
   * - Pass an array of strings for dynamic bookings (combined availability).
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
 * <Booker teamId={123} eventSlug="team-meeting" isTeamEvent={true} />
 */
export type BookerPlatformWrapperAtomPropsForTeam = BookerPlatformWrapperAtomProps & {
  /** Optional username(s) for team events */
  username?: string | string[];
  isTeamEvent: true;
  teamId: number;
  routingFormSearchParams?: RoutingFormSearchParams;
};
