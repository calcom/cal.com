/**
 * Domain types for BookingService
 * These types are framework-agnostic and contain only the data required for booking operations
 */
import type { z } from "zod";

import type getBookingDataSchema from "@calcom/features/bookings/lib/getBookingDataSchema";
import type getBookingDataSchemaForApi from "@calcom/features/bookings/lib/getBookingDataSchemaForApi";
import type { BookingCreateBody as BaseCreateBookingData } from "@calcom/prisma/zod/custom/booking";
import type { extendedBookingCreateBody } from "@calcom/prisma/zod/custom/booking";

import type { InstantBookingCreateService } from "../service/InstantBookingCreateService";
import type { RegularBookingService } from "../service/RegularBookingService";

export type ExtendedBookingCreateData = z.input<typeof extendedBookingCreateBody>;
export type BookingDataSchemaGetter = typeof getBookingDataSchema | typeof getBookingDataSchemaForApi;

export type CreateRegularBookingData = BaseCreateBookingData;

export type CreateInstantBookingData = BaseCreateBookingData;

export type CreateRecurringBookingData = (BaseCreateBookingData & {
  schedulingType?: SchedulingType;
})[];

export type CreateSeatedBookingInput = BaseCreateBookingData & Pick<MasterCreateBookingData, "bookingUid">;

export type PlatformParams = {
  platformClientId?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
  platformRescheduleUrl?: string;
  platformBookingLocation?: string;
  areCalendarEventsEnabled?: boolean;
};

export type CreateBookingMeta = {
  userId?: number;
  // These used to come from headers but now we're passing them as params
  hostname?: string;
  forcedSlug?: string;
  noEmail?: boolean;
} & PlatformParams;

export type BookingHandlerInput = {
  bookingData: CreateRegularBookingData;
} & CreateBookingMeta;

// TODO: In a followup PR, we working on defining the type here itself instead of inferring it.
export type RegularBookingCreateResult = Awaited<ReturnType<RegularBookingService["createBooking"]>>;

export type InstantBookingCreateResult = Awaited<ReturnType<InstantBookingCreateService["create"]>>;
