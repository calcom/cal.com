import { withValidation } from "next-validations";
import { z } from "zod";

import { _BookingModel as Booking } from "@calcom/prisma/zod";

const schemaBookingBaseBodyParams = Booking.omit({ id: true }).partial();

const schemaBookingRequiredParams = z.object({
  uid: z.string(),
  title: z.string(),
  startTime: z.date(),
  endTime: z.date(),
});

export const schemaBookingBodyParams = schemaBookingBaseBodyParams.merge(schemaBookingRequiredParams);

export const schemaBookingPublic = Booking.omit({});

export const withValidBooking = withValidation({
  schema: schemaBookingBodyParams,
  type: "Zod",
  mode: "body",
});
