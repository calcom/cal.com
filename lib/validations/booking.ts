import { z } from "zod";

import { _BookingModel as Booking } from "@calcom/prisma/zod";
import { extendedBookingCreateBody } from "@calcom/prisma/zod-utils";

import { schemaQueryUserId } from "./shared/queryUserId";

const schemaBookingBaseBodyParams = Booking.pick({
  uid: true,
  userId: true,
  eventTypeId: true,
  title: true,
  description: true,
  startTime: true,
  endTime: true,
}).partial();

export const schemaBookingCreateBodyParams = extendedBookingCreateBody.merge(schemaQueryUserId.partial());

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
  description: true,
  eventTypeId: true,
  uid: true,
  title: true,
  startTime: true,
  endTime: true,
});
