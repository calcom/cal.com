/**
 * Domain types for Booking Services
 * These types are framework-agnostic and contain only the data required for booking operations
 */
import type getBookingDataSchema from "@calcom/features/bookings/lib/getBookingDataSchema";
import type getBookingDataSchemaForApi from "@calcom/features/bookings/lib/getBookingDataSchemaForApi";
import type { TraceContext } from "@calcom/lib/tracing";
import type { SchedulingType } from "@calcom/prisma/enums";

import type { ExtendedBookingCreateBody } from "../bookingCreateBodySchema";
import type { RegularBookingService } from "../service/RegularBookingService";

export type BookingDataSchemaGetter = typeof getBookingDataSchema | typeof getBookingDataSchemaForApi;

export type CreateRegularBookingData = ExtendedBookingCreateBody;

export type CreateInstantBookingData = ExtendedBookingCreateBody;

export type CreateRecurringBookingData = (ExtendedBookingCreateBody & {
  schedulingType?: SchedulingType;
})[];

export type PlatformParams = {
  platformClientId?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
  platformRescheduleUrl?: string;
  platformBookingLocation?: string;
  areCalendarEventsEnabled?: boolean;
  skipAvailabilityCheck?: boolean;
  skipEventLimitsCheck?: boolean;
  skipCalendarSyncTaskCreation?: boolean;
};

export type CreateBookingMeta = {
  userId?: number;
  userUuid?: string;
  // These used to come from headers but now we're passing them as params
  hostname?: string;
  forcedSlug?: string;
  noEmail?: boolean;
  traceContext?: TraceContext;
  impersonatedByUserUuid?: string;
} & PlatformParams;

export type BookingHandlerInput = {
  bookingData: CreateRegularBookingData;
} & CreateBookingMeta;

// TODO: In a followup PR, we working on defining the type here itself instead of inferring it.
export type RegularBookingCreateResult = Awaited<ReturnType<RegularBookingService["createBooking"]>>;

export type InstantBookingCreateResult = {
  message: "Success";
  meetingTokenId: number;
  bookingId: number;
  bookingUid: string;
  expires: Date;
  userId: number | null;
};

// More properties to be added to this config in followup PRs
export type BookingFlowConfig = {
  isDryRun: boolean;
};
