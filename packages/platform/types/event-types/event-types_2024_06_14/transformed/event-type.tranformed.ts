import type {
  transformApiEventTypeColors,
  transformApiEventTypeFutureBookingLimits,
  transformApiEventTypeIntervalLimits,
  transformApiEventTypeRecurrence,
  transformApiSeatOptions,
  transformBookingFieldsApiToInternal,
  transformLocationsApiToInternal,
} from "@calcom/lib/event-types/transformers";

import type { CreateEventTypeInput_2024_06_14, ConfirmationPolicyTransformedSchema } from "../inputs";

export type InputEventTransformed_2024_06_14 = Omit<
  CreateEventTypeInput_2024_06_14,
  | "lengthInMinutes"
  | "locations"
  | "bookingFields"
  | "bookingLimitsCount"
  | "bookingLimitsDuration"
  | "bookingWindow"
  | "bookerLayouts"
  | "confirmationPolicy"
  | "recurrence"
  | "color"
  | "seats"
  | "customName"
> & {
  length: number;
  slug: string;
  eventName?: string;
  bookingLimits?: ReturnType<typeof transformApiEventTypeIntervalLimits>;

  locations?: ReturnType<typeof transformLocationsApiToInternal>;
  bookingFields?: ReturnType<typeof transformBookingFieldsApiToInternal>;
  durationLimits?: ReturnType<typeof transformApiEventTypeIntervalLimits>;
  recurringEvent?: ReturnType<typeof transformApiEventTypeRecurrence>;
  eventTypeColor?: ReturnType<typeof transformApiEventTypeColors>;
} & Partial<
    Pick<ConfirmationPolicyTransformedSchema, "requiresConfirmation" | "requiresConfirmationWillBlockSlot">
  > &
  Partial<ReturnType<typeof transformApiSeatOptions>> &
  Partial<ReturnType<typeof transformApiEventTypeFutureBookingLimits>>;

export type InputTeamEventTransformed_2024_06_14 = InputEventTransformed_2024_06_14 & {
  hosts: {
    userId: number;
    isFixed: boolean;
    priority: number;
  }[];
  children: {
    id: number;
    name: string;
    email: string;
    eventTypeSlugs: string[];
  }[];
};
