import { z } from "zod";

import { denullish } from "@calcom/prisma/zod-utils";
import { BookingReferenceSchema } from "@calcom/prisma/zod/modelSchema/BookingReferenceSchema";

export const schemaBookingReferenceBaseBodyParams = BookingReferenceSchema.pick({
  type: true,
  bookingId: true,
  uid: true,
  meetingId: true,
  meetingPassword: true,
  meetingUrl: true,
  deleted: true,
}).partial();

export const schemaBookingReferenceReadPublic = BookingReferenceSchema.pick({
  id: true,
  type: true,
  bookingId: true,
  uid: true,
  meetingId: true,
  meetingPassword: true,
  meetingUrl: true,
  deleted: true,
});

/** Denullish bookingId individually to preserve type inference in zod v4 */
export const schemaBookingCreateBodyParams = BookingReferenceSchema.omit({ id: true, bookingId: true })
  .merge(z.object({ bookingId: denullish(BookingReferenceSchema.shape.bookingId) }))
  .strict();
export const schemaBookingEditBodyParams = schemaBookingCreateBodyParams.partial();
