import { z } from "zod";

import {
  _AttendeeModel,
  _BookingModel as Booking,
  _EventTypeModel,
  _PaymentModel,
  _TeamModel,
  _UserModel,
} from "@calcom/prisma/zod";
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

const teamSchema = _TeamModel.pick({
  name: true,
  slug: true,
});

export const schemaBookingReadPublic = Booking.extend({
  eventType: _EventTypeModel
    .pick({
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
      _AttendeeModel.pick({
        id: true,
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
    .nullish(),
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
