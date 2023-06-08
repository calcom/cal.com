import { z } from "zod";

import { _AttendeeModel, _BookingModel as Booking, _PaymentModel, _UserModel } from "@calcom/prisma/zod";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

export const bookingReadPublicSchema = Booking.extend({
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
    .optional()
    .nullable(),
  payment: z
    .array(
      _PaymentModel.pick({
        id: true,
        success: true,
        paymentOption: true,
      })
    )
    .optional(),
  metadata: EventTypeMetaDataSchema,
  startTime: z.string(),
  endTime: z.string(),
}).pick({
  id: true,
  userId: true,
  description: true,
  eventTypeId: true,
  uid: true,
  title: true,
  timeZone: true,
  attendees: true,
  user: true,
  payment: true,
  status: true,
  responses: true,
});

export const bookingsOutputSchema = z.object({
  bookings: z.array(bookingReadPublicSchema),
  recurringInfo: z.any(),
  nextCursor: z.any(),
});
