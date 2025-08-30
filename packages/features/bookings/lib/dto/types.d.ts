/**
 * Domain types for BookingCreateService
 * These types are framework-agnostic and contain only the data required for booking operations
 */
import type { z } from "zod";

import type getBookingDataSchema from "@calcom/features/bookings/lib/getBookingDataSchema";
import type getBookingDataSchemaForApi from "@calcom/features/bookings/lib/getBookingDataSchemaForApi";
import type { BookingCreateBody as MasterCreateBookingData } from "@calcom/prisma/zod/custom/booking";
import type { extendedBookingCreateBody } from "@calcom/prisma/zod/custom/booking";
import type { JsonObject } from "@calcom/types/Json";

import type { BookingCreateService } from "../service/BookingCreateService";
import type { InstantBookingCreateService } from "../service/InstantBookingCreateService";

export type ExtendedBookingCreateData = z.input<typeof extendedBookingCreateBody>;
export type BookingDataSchemaGetter = typeof getBookingDataSchema | typeof getBookingDataSchemaForApi;

export interface BookingAttendee {
  name: string;
  email?: string;
  phoneNumber?: string;
  timeZone: string;
  language?: string;
}

export interface BookingRouting {
  responseId: number;
  teamMemberIds: number[];
  teamMemberEmail?: string;
  skipContactOwner?: boolean;
  crmAppSlug?: string;
  crmOwnerRecordType?: string;
}

export interface BookingLocation {
  type: string;
  [key: string]: unknown; // Allow flexible location data based on type
}

type BaseCreateBookingData = MasterCreateBookingData & {
  // Loose type, this is validated at run time through getBookingData
  responses?: JsonObject;
};

export type CreateBookingData = BaseCreateBookingData;

export type CreateInstantBookingData = BaseCreateBookingData & {
  instant: boolean;
};

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
  bookingData: CreateBookingData;
} & CreateBookingMeta;

export type CreateRecurringBookingData = (CreateBookingData & {
  schedulingType?: SchedulingType;
})[];

export type CreateInstantBookingResponse = {
  message: string;
  meetingTokenId: number;
  bookingId: number;
  bookingUid: string;
  expires: Date;
  userId: number | null;
};

// TODO: Ideally we should define the types here instead of letting BookingCreateService send anything and keep using it
export type BookingCreateResult = Awaited<ReturnType<BookingCreateService["create"]>>;

export type InstantBookingCreateResult = Awaited<ReturnType<InstantBookingCreateService["create"]>>;
