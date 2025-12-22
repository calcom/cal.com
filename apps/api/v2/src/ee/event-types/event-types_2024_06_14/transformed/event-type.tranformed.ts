import type {
  transformEventColorsApiToInternal,
  transformFutureBookingLimitsApiToInternal,
  transformIntervalLimitsApiToInternal,
  transformRecurrenceApiToInternal,
  transformSeatsApiToInternal,
  transformBookingFieldsApiToInternal,
  InternalLocationsSchema,
} from "@/ee/event-types/event-types_2024_06_14/transformers";
import type { z } from "zod";

import type {
  CreateEventTypeInput_2024_06_14,
  ConfirmationPolicyTransformedSchema,
} from "@calcom/platform-types";

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
  | "useDestinationCalendarEmail"
> & {
  length: number;
  slug: string;
  eventName?: string;
  bookingLimits?: ReturnType<typeof transformIntervalLimitsApiToInternal>;
  locations?: z.infer<typeof InternalLocationsSchema>;
  bookingFields?: ReturnType<typeof transformBookingFieldsApiToInternal>;
  durationLimits?: ReturnType<typeof transformIntervalLimitsApiToInternal>;
  recurringEvent?: ReturnType<typeof transformRecurrenceApiToInternal>;
  maxActiveBookingsPerBooker?: number;
  maxActiveBookingPerBookerOfferReschedule?: boolean;
  eventTypeColor?: ReturnType<typeof transformEventColorsApiToInternal>;
  useEventTypeDestinationCalendarEmail?: boolean;
} & Partial<
    Pick<ConfirmationPolicyTransformedSchema, "requiresConfirmation" | "requiresConfirmationWillBlockSlot">
  > &
  Partial<ReturnType<typeof transformSeatsApiToInternal>> &
  Partial<ReturnType<typeof transformFutureBookingLimitsApiToInternal>>;

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
