import { z } from "zod";

import { _BookingModel as Booking } from "@calcom/prisma/zod";

const schemaBookingBaseBodyParams = Booking.pick({
  userId: true,
  eventTypeId: true,
  title: true,
  startTime: true,
  endTime: true,
}).partial();

const schemaBookingCreateParams = z
  .object({
    eventTypeId: z.number(),
    title: z.string(),
    startTime: z.date().or(z.string()),
    endTime: z.date().or(z.string()),
    recurringCount: z.number().optional(),
  })
  .strict();

export const schemaBookingCreateBodyParams = schemaBookingBaseBodyParams.merge(schemaBookingCreateParams);

const schemaBookingEditParams = z
  .object({
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
