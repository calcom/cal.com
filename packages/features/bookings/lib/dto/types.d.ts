/**
 * Domain types for BookingCreateService
 * These types are framework-agnostic and contain only the data required for booking operations
 */
import type { z } from "zod";

import type getBookingDataSchema from "@calcom/features/bookings/lib/getBookingDataSchema";
import type getBookingDataSchemaForApi from "@calcom/features/bookings/lib/getBookingDataSchemaForApi";
import type { BookingRepository } from "@calcom/lib/server/repository/booking";
import type { BookingCreateBody as MasterCreateBookingData } from "@calcom/prisma/zod/custom/booking";
import type { extendedBookingCreateBody } from "@calcom/prisma/zod/custom/booking";
import type { PartialReference } from "@calcom/types/EventManager";

import type { Booking } from "../handleNewBooking/createBooking";
import type { BookingCreateService } from "../service/BookingCreateService";
import type { InstantBookingCreateService } from "../service/InstantBookingCreateService";

// Use ReturnType from booking repository for type safety
type ExistingBooking = Awaited<ReturnType<BookingRepository["getValidBookingFromEventTypeForAttendee"]>>;

interface ExistingBookingResponse extends Omit<NonNullable<ExistingBooking>, "user"> {
  user: Omit<NonNullable<ExistingBooking>["user"], "email"> & { email: null };
  paymentRequired: boolean;
  seatReferenceUid: string;
  luckyUsers: number[];
  isDryRun: boolean;
  troubleshooterData?: Record<string, unknown>;
  paymentUid?: string;
  paymentId?: number;
}
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

// Type for booking with additional fields from the creation process
export type CreatedBooking = Booking & {
  appsStatus?: import("@calcom/types/Calendar").AppsStatus[];
  paymentUid?: string;
  paymentId?: number;
};

// Base user type that ensures timeZone and name are always available
type BookingUser = {
  id?: number;
  name?: string | null;
  username?: string | null;
  email?: null;
  timeZone?: string;
} | null;

// Discriminated union for legacyHandler return types
export type LegacyHandlerResult =
  // Early return case - existing booking found
  | (Omit<ExistingBookingResponse, "user"> & {
      _type: "existing";
      user: BookingUser;
      paymentUid?: string;
    })
  // Payment required case
  | {
      _type: "payment_required";
      id?: number;
      uid?: string;
      title?: string;
      description?: string | null;
      startTime?: Date;
      endTime?: Date;
      location?: string | null;
      status?: import("@calcom/prisma/enums").BookingStatus;
      metadata?: import("@prisma/client").Prisma.JsonValue | null;
      user?: BookingUser;
      attendees?: Array<{
        id: number;
        name: string;
        email: string;
        timeZone: string;
        phoneNumber: string | null;
      }>;
      eventType?: {
        id?: number;
        title?: string;
        slug?: string;
      } | null;
      paymentRequired: true;
      message: string;
      paymentUid?: string;
      paymentId?: number;
      isDryRun?: boolean;
      troubleshooterData?: Record<string, unknown>;
      luckyUsers?: number[];
      userPrimaryEmail?: string | null;
      responses?: import("@prisma/client").Prisma.JsonValue | null;
      references?: PartialReference[] | CreatedBooking["references"];
      seatReferenceUid?: string;
      videoCallUrl?: string | null;
    }
  // Successful booking case
  | {
      _type: "success";
      id?: number;
      uid?: string;
      title?: string;
      description?: string | null;
      startTime?: Date;
      endTime?: Date;
      location?: string | null;
      status?: import("@calcom/prisma/enums").BookingStatus;
      metadata?: import("@prisma/client").Prisma.JsonValue | null;
      user?: BookingUser;
      attendees?: Array<{
        id: number;
        name: string;
        email: string;
        timeZone: string;
        phoneNumber: string | null;
      }>;
      eventType?: {
        id?: number;
        title?: string;
        slug?: string;
      } | null;
      paymentRequired: false;
      isDryRun?: boolean;
      troubleshooterData?: Record<string, unknown>;
      luckyUsers?: number[];
      paymentUid?: string;
      userPrimaryEmail?: string | null;
      responses?: import("@prisma/client").Prisma.JsonValue | null;
      references?: PartialReference[] | CreatedBooking["references"];
      seatReferenceUid?: string;
      videoCallUrl?: string | null;
    };
