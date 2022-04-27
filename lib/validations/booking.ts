import { z } from "zod";

import { _BookingModel as Booking } from "@calcom/prisma/zod";

const schemaBookingBaseBodyParams = Booking.pick({
  uid: true,
  userId: true,
  eventTypeId: true,
  title: true,
  startTime: true,
  endTime: true,
}).partial();

const schemaBookingCreateParams = z
  .object({
    uid: z.string(),
    userId: z.number(),
    eventTypeId: z.number(),
    title: z.string(),
    startTime: z.date(),
    endTime: z.date(),
  })
  .strict();

export const schemaBookingCreateBodyParams = schemaBookingBaseBodyParams.merge(schemaBookingCreateParams);

const schemaBookingEditParams = z
  .object({
    uid: z.string().optional(),
    title: z.string().optional(),
    startTime: z.date().optional(),
    endTime: z.date().optional(),
  })
  .strict();

export const schemaBookingEditBodyParams = schemaBookingBaseBodyParams.merge(schemaBookingEditParams);

export const schemaBookingReadPublic = Booking.pick({
  id: true,
  userId: true,
  eventTypeId: true,
  uid: true,
  title: true,
  startTime: true,
  endTime: true,
});
