import { denullishShape } from "@calcom/prisma/zod-utils";
import { _BookingReferenceModel as BookingReference } from "@calcom/prisma/zod/bookingreference";

export const schemaBookingReferenceBaseBodyParams = BookingReference.pick({
  type: true,
  bookingId: true,
  uid: true,
  meetingId: true,
  meetingPassword: true,
  meetingUrl: true,
  deleted: true,
}).partial();

export const schemaBookingReferenceReadPublic = BookingReference.pick({
  id: true,
  type: true,
  bookingId: true,
  uid: true,
  meetingId: true,
  meetingPassword: true,
  meetingUrl: true,
  deleted: true,
});

export const schemaBookingCreateBodyParams = BookingReference.omit({ id: true, bookingId: true })
  .merge(denullishShape(BookingReference.pick({ bookingId: true })))
  .strict();
export const schemaBookingEditBodyParams = schemaBookingCreateBodyParams.partial();
