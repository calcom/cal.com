import { denullishShape } from "@calcom/prisma/zod-utils";
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

export const schemaBookingCreateBodyParams = BookingReferenceSchema.omit({ id: true, bookingId: true })
  .merge(denullishShape(BookingReferenceSchema.pick({ bookingId: true })))
  .strict();
export const schemaBookingEditBodyParams = schemaBookingCreateBodyParams.partial();
