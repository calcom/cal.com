import { withValidation } from "next-validations";
import { z } from "zod";

import { _AttendeeModel as Attendee } from "@calcom/prisma/zod";

export const schemaAttendeeBaseBodyParams = Attendee.pick({
  bookingId: true,
  email: true,
  name: true,
  timeZone: true,
}).partial();

const schemaAttendeeCreateParams = z.object({
  bookingId: z.any(),
  email: z.string().email(),
  name: z.string(),
  timeZone: z.string(),
});

const schemaAttendeeEditParams = z.object({
  // @note: disallowing email/bookingId changes in attendee via API for now as it would introduce side effects
  name: z.string(),
  timeZone: z.string(),
});
export const schemaAttendeeEditBodyParams = schemaAttendeeBaseBodyParams.merge(schemaAttendeeEditParams);
export const schemaAttendeeCreateBodyParams = schemaAttendeeBaseBodyParams.merge(schemaAttendeeCreateParams);

export const schemaAttendeeReadPublic = Attendee.pick({
  bookingId: true,
  name: true,
  email: true,
  timeZone: true,
});
