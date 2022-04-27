import { z } from "zod";

import { _BookingReferenceModel as BookingReference } from "@calcom/prisma/zod";

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

const schemaBookingReferenceEditParams = z.object({
  type: z.string(),
  uid: z.string(),
  meetingId: z.string(),
  meetingPassword: z.string(),
  meetingUrl: z.string(),
  deleted: z.boolean(),
});
const schemaBookingReferenceCreateParams = z.object({
  type: z.string(),
  uid: z.string(),
  meetingId: z.string(),
  meetingPassword: z.string(),
  meetingUrl: z.string(),
  deleted: z.boolean(),
});
export const schemaBookingCreateBodyParams = schemaBookingReferenceBaseBodyParams.merge(
  schemaBookingReferenceCreateParams
);
export const schemaBookingEditBodyParams = schemaBookingReferenceBaseBodyParams.merge(
  schemaBookingReferenceEditParams
);
