import { extendedBookingCreateBody } from "@calcom/features/bookings/lib/bookingCreateBodySchema";
import { AttendeeSchema } from "@calcom/prisma/zod/modelSchema/AttendeeSchema";
import { BookingSchema as Booking } from "@calcom/prisma/zod/modelSchema/BookingSchema";
import { EventTypeSchema } from "@calcom/prisma/zod/modelSchema/EventTypeSchema";
import { PaymentSchema } from "@calcom/prisma/zod/modelSchema/PaymentSchema";
import { TeamSchema } from "@calcom/prisma/zod/modelSchema/TeamSchema";
import { UserSchema } from "@calcom/prisma/zod/modelSchema/UserSchema";
import { iso8601 } from "@calcom/prisma/zod-utils";
import { z } from "zod";
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
  // Override metadata to handle reassignment objects from Round Robin/Managed Events
  // Safe to use z.any() here because:
  // 1. API v1 POST only accepts z.record(z.string()) for metadata (user input restricted)
  // 2. API v1 PATCH does not accept metadata changes at all
  // 3. Complex metadata (objects) are only set by trusted internal features
  metadata: z.record(z.any()).nullable(),
}).pick({
  id: true,
  userId: true,
  description: true,
  eventTypeId: true,
  uid: true,
  title: true,
  startTime: true,
  endTime: true,
  // Note: timeZone is not a field on Booking model - it's in nested attendees/user objects
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

export {
  bookingCreateBodySchemaForApi,
  bookingCreateSchemaLegacyPropsForApi,
} from "@calcom/features/bookings/lib/bookingCreateBodySchema";
