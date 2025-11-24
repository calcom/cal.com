import type { ErrorOption, FieldPath } from "react-hook-form";

import type { RegularBookingCreateResult } from "@calcom/features/bookings/lib/dto/types";
import type { SchedulingType } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { AppsStatus } from "@calcom/types/Calendar";

import type { DatePickerProps } from "../calendars/DatePicker";
import type { BookingCreateBody } from "./lib/bookingCreateBodySchema";

export type PublicEvent = NonNullable<RouterOutputs["viewer"]["public"]["event"]>;

export type BookerEventQuery = {
  isSuccess: boolean;
  isError: boolean;
  isPending: boolean;
  data?: BookerEvent | null;
};

type BookerEventUser = Pick<
  PublicEvent["subsetOfUsers"][number],
  "name" | "username" | "avatarUrl" | "weekStart" | "profile"
> & {
  metadata?: undefined;
  brandColor?: string | null;
  darkBrandColor?: string | null;
  bookerUrl: string;
};

type BookerEventProfile = Pick<PublicEvent["profile"], "name" | "image" | "bookerLayouts">;

// marked as required to keep responsibility on consumers to handle the case where slots is undefined
export type Slots = Required<NonNullable<DatePickerProps["slots"]>>;

export type BookerEvent = Pick<
  PublicEvent,
  | "id"
  | "length"
  | "slug"
  | "schedulingType"
  | "recurringEvent"
  | "entity"
  | "locations"
  | "metadata"
  | "isDynamic"
  | "requiresConfirmation"
  | "price"
  | "currency"
  | "lockTimeZoneToggleOnBookingPage"
  | "lockedTimeZone"
  | "schedule"
  | "seatsPerTimeSlot"
  | "title"
  | "description"
  | "forwardParamsSuccessRedirect"
  | "successRedirectUrl"
  | "subsetOfHosts"
  | "bookingFields"
  | "seatsShowAvailabilityCount"
  | "isInstantEvent"
  | "instantMeetingParameters"
  | "fieldTranslations"
  | "autoTranslateDescriptionEnabled"
  | "disableCancelling"
  | "disableRescheduling"
  | "interfaceLanguage"
  | "team"
  | "owner"
> & {
  subsetOfUsers: BookerEventUser[];
  showInstantEventConnectNowModal: boolean;
} & { profile: BookerEventProfile };

export type ValidationErrors<T extends object> = { key: FieldPath<T>; error: ErrorOption }[];

export type EventPrice = { currency: string; price: number; displayAlternateSymbol?: boolean };

export enum EventDetailBlocks {
  // Includes duration select when event has multiple durations.
  DURATION,
  LOCATION,
  REQUIRES_CONFIRMATION,
  // Includes input to select # of occurrences.
  OCCURENCES,
  PRICE,
}

export type { BookingCreateBody };

export type RecurringBookingCreateBody = BookingCreateBody & {
  noEmail?: boolean;
  recurringCount?: number;
  appsStatus?: AppsStatus[] | undefined;
  allRecurringDates?: Record<string, string>[];
  currentRecurringIndex?: number;
  schedulingType?: SchedulingType;
};

// TODO: Instead of using the two different names, we want to use RegularBookingCreateResult name only but the name BookingResponse is used at ton of places and would be fixed in a separate followup PR.
export type BookingResponse = RegularBookingCreateResult;

export type MarkNoShowResponse = Awaited<
  ReturnType<typeof import("@calcom/features/handleMarkNoShow").default>
>;
