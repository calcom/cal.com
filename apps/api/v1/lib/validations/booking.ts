import { z } from "zod";

import { extendedBookingCreateBody } from "@calcom/features/bookings/lib/bookingCreateBodySchema";
import { iso8601 } from "@calcom/prisma/zod-utils";
import { BookingSchema as Booking } from "@calcom/prisma/zod/modelSchema/BookingSchema";

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

export {
  bookingCreateSchemaLegacyPropsForApi,
  bookingCreateBodySchemaForApi,
} from "@calcom/features/bookings/lib/bookingCreateBodySchema";
