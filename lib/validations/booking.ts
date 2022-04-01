import { withValidation } from "next-validations";
import { z } from "zod";

import { _BookingModel as Booking } from "@calcom/prisma/zod";

// Here we remove any parameters that are not needed for the API with omit.
const schemaBookingBaseBodyParams = Booking.omit({ id: true }).partial();
// Here we redeclare the required ones after removing the ones we don't need.
// and making the rest optional with .partial()
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
