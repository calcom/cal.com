import { ErrorOption, FieldPath } from "react-hook-form";

import { Attendee, Booking } from "@calcom/prisma/client";
import { RouterOutputs } from "@calcom/trpc/react";
import { AppsStatus } from "@calcom/types/Calendar";

export type PublicEvent = NonNullable<RouterOutputs["viewer"]["public"]["event"]>;
export type ValidationErrors<T extends object> = { key: FieldPath<T>; error: ErrorOption }[];

export enum EventDetailBlocks {
  DESCRIPTION,
  // Includes duration select when event has multiple durations.
  DURATION,
  LOCATION,
  REQUIRES_CONFIRMATION,
  // Includes input to select # of occurences.
  OCCURENCES,
  PRICE,
}

export type BookingCreateBody = {
  email: string;
  end: string;
  web3Details?: {
    userWallet: string;
    userSignature: unknown;
  };
  eventTypeId: number;
  eventTypeSlug: string;
  guests?: string[];
  location: string;
  name: string;
  notes?: string;
  rescheduleUid?: string;
  recurringEventId?: string;
  start: string;
  timeZone: string;
  user?: string | string[];
  language: string;
  bookingUid?: string;
  customInputs: { label: string; value: string | boolean }[];
  metadata: {
    [key: string]: string;
  };
  hasHashedBookingLink: boolean;
  hashedLink?: string | null;
  smsReminderNumber?: string;
  ethSignature?: string;
};

export type RecurringBookingCreateBody = BookingCreateBody & {
  noEmail?: boolean;
  recurringCount?: number;
  appsStatus?: AppsStatus[] | undefined;
  allRecurringDates?: string[];
  currentRecurringIndex?: number;
};

export type BookingResponse = Booking & {
  paymentUid?: string;
  attendees: Attendee[];
  appsStatus?: AppsStatus[];
};
