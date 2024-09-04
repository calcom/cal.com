import type {
  transformApiEventTypeBookingFields,
  transformApiEventTypeColors,
  transformApiEventTypeFutureBookingLimits,
  transformApiEventTypeIntervalLimits,
  transformApiEventTypeLocations,
  transformApiEventTypeRecurrence,
  transformApiSeatOptions,
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
  | "requiresConfirmation"
  | "recurrence"
  | "color"
  | "seats"
> & {
  length: number;
  slug: string;
  locations?: ReturnType<typeof transformApiEventTypeLocations>;
  bookingLimits?: ReturnType<typeof transformApiEventTypeIntervalLimits>;
  bookingFields?: ReturnType<typeof transformApiEventTypeBookingFields>;
  durationLimits?: ReturnType<typeof transformApiEventTypeIntervalLimits>;
  recurringEvent?: ReturnType<typeof transformApiEventTypeRecurrence>;
  requiresConfirmation?: ReturnType<typeof transformApiEventTypeColors>;
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
