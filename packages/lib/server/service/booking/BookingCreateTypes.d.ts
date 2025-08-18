/**
 * Domain types for BookingCreateService
 * These types are framework-agnostic and contain only the data required for booking operations
 */
import type { z } from "zod";

import type { SchedulingType } from "@calcom/prisma/client";
import type { BookingCreateBody as MasterCreateBookingData } from "@calcom/prisma/zod/custom/booking";
import type { extendedBookingCreateBody } from "@calcom/prisma/zod/custom/booking";

export type ExtendedBookingCreateData = z.input<typeof extendedBookingCreateBody>;

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

type BaseCreateBookingData = MasterCreateBookingData;

export type CreateBookingData = BaseCreateBookingData;

export type CreateInstantBookingData = BaseCreateBookingData & { instant: boolean };

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
} & PlatformParams;

export type BookingHandlerInput = {
  bookingData: CreateBookingData;
} & CreateBookingMeta;

export type CreateRecurringBookingData = (ExtendedBookingCreateData & {
  schedulingType?: SchedulingType;
})[];

export type RecurringBookingHandlerInput = {
  bookingData: (ExtendedBookingCreateData & {
    schedulingType?: SchedulingType;
  })[];
} & CreateBookingMeta & {
    noEmail?: boolean;
  };
