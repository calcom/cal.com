import type { SchedulingType } from "@prisma/client";
import type { ErrorOption, FieldPath } from "react-hook-form";

import type { BookingCreateBody } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import type { AppsStatus } from "@calcom/types/Calendar";

export type PublicEvent = NonNullable<RouterOutputs["viewer"]["public"]["event"]>;
export type ValidationErrors<T extends object> = { key: FieldPath<T>; error: ErrorOption }[];

export type EventPrice = { currency: string; price: number; displayAlternateSymbol?: boolean };

export enum EventDetailBlocks {
  // Includes duration select when event has multiple durations.
  DURATION,
  LOCATION,
  REQUIRES_CONFIRMATION,
  // Includes input to select # of occurences.
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

export type BookingResponse = Awaited<
  ReturnType<typeof import("@calcom/features/bookings/lib/handleNewBooking").default>
>;

export type InstantBookingResponse = Awaited<
  ReturnType<typeof import("@calcom/features/instant-meeting/handleInstantMeeting").default>
>;
