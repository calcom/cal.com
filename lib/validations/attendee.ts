import { withValidation } from "next-validations";
import { z } from "zod";

import { _AttendeeModel as Attendee } from "@calcom/prisma/zod";

export const schemaAttendeeBaseBodyParams = Attendee.pick({
  bookingId: true,
  email: true,
  name: true,
  timeZone: true,
}).partial();

export const schemaAttendeePublic = Attendee.omit({});

const schemaAttendeeCreateRequiredParams = z.object({
  bookingId: z.any(),
  email: z.string().email(),
  name: z.string(),
  timeZone: z.string(),
});

const schemaAttendeeEditeRequiredParams = z.object({
  // bookingId: z.any(),
  // @note: disallowing email changes in attendee via API for now.
  // email: z.string().email(),
  name: z.string(),
  timeZone: z.string(),
});
export const schemaAttendeeEditBodyParams = schemaAttendeeBaseBodyParams.merge(
  schemaAttendeeEditeRequiredParams
);
export const schemaAttendeeCreateBodyParams = schemaAttendeeBaseBodyParams.merge(
  schemaAttendeeCreateRequiredParams
);
