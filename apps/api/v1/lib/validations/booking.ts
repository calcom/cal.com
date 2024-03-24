import { z } from "zod";

import { _BookingModel as Booking, _AttendeeModel, _UserModel, _PaymentModel } from "@calcom/prisma/zod";
import { extendedBookingCreateBody, iso8601 } from "@calcom/prisma/zod-utils";

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
}).partial();

export const schemaBookingCreateBodyParams = extendedBookingCreateBody.merge(schemaQueryUserId.partial());

export const schemaBookingGetParams = z.object({
  dateFrom: iso8601.optional(),
  dateTo: iso8601.optional(),
});

const schemaBookingEditParams = z
  .object({
    title: z.string().optional(),
    startTime: iso8601.optional(),
    endTime: iso8601.optional(),
    // Not supporting responses in edit as that might require re-triggering emails
    // responses
  })
  .strict();

export const schemaBookingEditBodyParams = schemaBookingBaseBodyParams
  .merge(schemaBookingEditParams)
  .omit({ uid: true });

export const schemaBookingReadPublic = Booking.extend({
  attendees: z
    .array(
      _AttendeeModel.pick({
        email: true,
        name: true,
        timeZone: true,
        locale: true,
      })
    )
    .optional(),
  user: _UserModel
    .pick({
      email: true,
      name: true,
      timeZone: true,
      locale: true,
    })
    .optional(),
  payment: z
    .array(
      _PaymentModel.pick({
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
  payment: true,
  metadata: true,
  status: true,
  responses: true,
});
