import { withValidation } from "next-validations";
import { z } from "zod";

import { _AttendeeModel as Attendee } from "@calcom/prisma/zod";

export const schemaAttendeeBaseBodyParams = Attendee.omit({ id: true }).partial();

export const schemaAttendeePublic = Attendee.omit({});

const schemaAttendeeRequiredParams = z.object({
  email: z.string().email(),
  name: z.string(),
  timeZone: z.string(),
});

export const schemaAttendeeBodyParams = schemaAttendeeBaseBodyParams.merge(schemaAttendeeRequiredParams);

export const withValidAttendee = withValidation({
  schema: schemaAttendeeBodyParams,
  type: "Zod",
  mode: "body",
});
