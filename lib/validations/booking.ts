import { withValidation } from "next-validations";

import { _BookingModel as Booking } from "@calcom/prisma/zod";

export const schemaBookingBodyParams = Booking.omit({ id: true });

export const schemaBookingPublic = Booking.omit({});

export const withValidBooking = withValidation({
  schema: schemaBookingBodyParams,
  type: "Zod",
  mode: "body",
});
