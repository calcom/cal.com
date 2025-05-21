import { z } from "zod";

import { routingFormResponseInDbSchema } from "@calcom/app-store/routing-forms/zod";
import { timeZoneSchema } from "@calcom/lib/dayjs/timeZone.schema";
import { iso8601 } from "@calcom/prisma/zod-utils";
import { AttendeeSchema } from "@calcom/prisma/zod/modelSchema/AttendeeSchema";
import { BookingSchema as Booking } from "@calcom/prisma/zod/modelSchema/BookingSchema";
import { EventTypeSchema } from "@calcom/prisma/zod/modelSchema/EventTypeSchema";
import { PaymentSchema } from "@calcom/prisma/zod/modelSchema/PaymentSchema";
import { TeamSchema } from "@calcom/prisma/zod/modelSchema/TeamSchema";
import { UserSchema } from "@calcom/prisma/zod/modelSchema/UserSchema";

import { schemaQueryUserId } from "./shared/queryUserId";

const schemaBookingBaseBodyParams = Booking.pick({
  uid: true,
  userId: true,
  eventTypeId: true,
  title: true,
  description: true,
  startTime: true,
  endTime: true,
  status: true,
  rescheduledBy: true,
  cancelledBy: true,
  createdAt: true,
}).partial();

export const bookingCreateBodySchema = z.object({
  end: z.string().optional(),
  eventTypeId: z.number(),
  eventTypeSlug: z.string().optional(),
  rescheduleUid: z.string().optional(),
  recurringEventId: z.string().optional(),
  rescheduledBy: z.string().email({ message: "Invalid email" }).optional(),
  start: z.string(),
  timeZone: timeZoneSchema,
  user: z.union([z.string(), z.array(z.string())]).optional(),
  language: z.string(),
  bookingUid: z.string().optional(),
  metadata: z.record(z.string()),
  hasHashedBookingLink: z.boolean().optional(),
  hashedLink: z.string().nullish(),
  seatReferenceUid: z.string().optional(),
  orgSlug: z.string().optional(),
  teamMemberEmail: z.string().nullish(),
  crmOwnerRecordType: z.string().nullish(),
  routedTeamMemberIds: z.array(z.number()).nullish(),
  routingFormResponseId: z.number().optional(),
  skipContactOwner: z.boolean().optional(),
  crmAppSlug: z.string().nullish().optional(),
  cfToken: z.string().nullish().optional(),

  /**
   * Holds the corrected responses of the Form for a booking, provided during rerouting
   */
  reroutingFormResponses: routingFormResponseInDbSchema.optional(),
  /**
   * Used to identify if the booking is a dry run.
   */
  _isDryRun: z.boolean().optional(),
  /** Whether to override the cache */
  _shouldServeCache: z.boolean().optional(),
  tracking: z
    .object({
      utm_source: z.string().optional(),
      utm_medium: z.string().optional(),
      utm_campaign: z.string().optional(),
      utm_term: z.string().optional(),
      utm_content: z.string().optional(),
    })
    .optional(),
});

export type BookingCreateBody = z.input<typeof bookingCreateBodySchema>;

export const extendedBookingCreateBody = bookingCreateBodySchema.merge(
  z.object({
    noEmail: z.boolean().optional(),
    recurringCount: z.number().optional(),
    allRecurringDates: z
      .array(
        z.object({
          start: z.string(),
          end: z.string(),
        })
      )
      .optional(),
    currentRecurringIndex: z.number().optional(),
    appsStatus: z
      .array(
        z.object({
          appName: z.string(),
          success: z.number(),
          failures: z.number(),
          type: z.string(),
          errors: z.string().array(),
          warnings: z.string().array().optional(),
        })
      )
      .optional(),
    luckyUsers: z.array(z.number()).optional(),
    customInputs: z.undefined().optional(),
  })
);

// It has only the legacy props that are part of `responses` now. The API can still hit old props
export const bookingCreateSchemaLegacyPropsForApi = z.object({
  email: z.string(),
  name: z.string(),
  guests: z.array(z.string()).optional(),
  notes: z.string().optional(),
  location: z.string(),
  smsReminderNumber: z.string().optional().nullable(),
  rescheduleReason: z.string().optional(),
  customInputs: z.array(z.object({ label: z.string(), value: z.union([z.string(), z.boolean()]) })),
});

// This is the schema that is used for the API. It has all the legacy props that are part of `responses` now.
export const bookingCreateBodySchemaForApi = extendedBookingCreateBody.merge(
  bookingCreateSchemaLegacyPropsForApi.partial()
);

export const schemaBookingCreateBodyParams = extendedBookingCreateBody.merge(schemaQueryUserId.partial());

export const schemaBookingGetParams = z.object({
  dateFrom: iso8601.optional(),
  dateTo: iso8601.optional(),
  order: z.enum(["asc", "desc"]).default("asc"),
  sortBy: z.enum(["createdAt", "updatedAt"]).optional(),
  status: z.enum(["upcoming"]).optional(),
});

export type Status = z.infer<typeof schemaBookingGetParams>["status"];

export const bookingCancelSchema = z.object({
  id: z.number(),
  allRemainingBookings: z.boolean().optional(),
  cancelSubsequentBookings: z.boolean().optional(),
  cancellationReason: z.string().optional().default("Not Provided"),
  seatReferenceUid: z.string().optional(),
  cancelledBy: z.string().email({ message: "Invalid email" }).optional(),
  internalNote: z
    .object({
      id: z.number(),
      name: z.string(),
      cancellationReason: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
});

const schemaBookingEditParams = z
  .object({
    title: z.string().optional(),
    startTime: iso8601.optional(),
    endTime: iso8601.optional(),
    cancelledBy: z.string().email({ message: "Invalid Email" }).optional(),
    rescheduledBy: z.string().email({ message: "Invalid Email" }).optional(),
    // Not supporting responses in edit as that might require re-triggering emails
    // responses
  })
  .strict();

export const schemaBookingEditBodyParams = schemaBookingBaseBodyParams
  .merge(schemaBookingEditParams)
  .omit({ uid: true });

const teamSchema = TeamSchema.pick({
  name: true,
  slug: true,
});

export const schemaBookingReadPublic = Booking.extend({
  eventType: EventTypeSchema.pick({
    title: true,
    slug: true,
  })
    .merge(
      z.object({
        team: teamSchema.nullish(),
      })
    )
    .nullish(),
  attendees: z
    .array(
      AttendeeSchema.pick({
        id: true,
        email: true,
        name: true,
        timeZone: true,
        locale: true,
      })
    )
    .optional(),
  user: UserSchema.pick({
    email: true,
    name: true,
    timeZone: true,
    locale: true,
  }).nullish(),
  payment: z
    .array(
      PaymentSchema.pick({
        id: true,
        success: true,
        paymentOption: true,
      })
    )
    .optional(),
  responses: z.record(z.any()).nullable(),
}).pick({
  id: true,
  userId: true,
  description: true,
  eventTypeId: true,
  uid: true,
  title: true,
  startTime: true,
  endTime: true,
  timeZone: true,
  attendees: true,
  user: true,
  eventType: true,
  payment: true,
  metadata: true,
  status: true,
  responses: true,
  fromReschedule: true,
  cancelledBy: true,
  rescheduledBy: true,
  createdAt: true,
});
