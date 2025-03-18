import type { BookerProps } from "@calcom/features/bookings/Booker";
import type { BookerStore } from "@calcom/features/bookings/Booker/store";
import type { BookingResponse } from "@calcom/platform-libraries";
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiSuccessResponseWithoutData,
  RoutingFormSearchParams,
} from "@calcom/platform-types";
import type { BookerLayouts } from "@calcom/prisma/zod-utils";

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
  | "setOccurenceCount"
  | "setTentativeSelectedTimeslots"
  | "setSelectedTimeslot"
  | "setFormValues"
  | "setOrg"
>;

export type BookerPlatformWrapperAtomProps = Omit<
  BookerProps,
  "username" | "entity" | "isTeamEvent" | "teamId"
> & {
  rescheduleUid?: string;
  rescheduledBy?: string;
  bookingUid?: string;
  entity?: BookerProps["entity"];
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
  locationUrl?: string;
  view?: VIEW_TYPE;
  metadata?: Record<string, string>;
  bannerUrl?: string;
  onDryRunSuccess?: () => void;
  hostsLimit?: number;
  preventEventTypeRedirect?: boolean;
  allowUpdatingUrlParams?: boolean;
};

type VIEW_TYPE = keyof typeof BookerLayouts;

export type BookerPlatformWrapperAtomPropsForIndividual = BookerPlatformWrapperAtomProps & {
  username: string | string[];
  isTeamEvent?: false;
  routingFormSearchParams?: RoutingFormSearchParams;
};

export type BookerPlatformWrapperAtomPropsForTeam = BookerPlatformWrapperAtomProps & {
  username?: string | string[];
  isTeamEvent: true;
  teamId: number;
  routingFormSearchParams?: RoutingFormSearchParams;
};
