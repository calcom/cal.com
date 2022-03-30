import { withValidation } from "next-validations";

import { _AttendeeModel as Attendee } from "@calcom/prisma/zod";

export const schemaAttendeeBodyParams = Attendee.omit({ id: true });

export const schemaAttendeePublic = Attendee.omit({});

export const withValidAttendee = withValidation({
  schema: schemaAttendeeBodyParams,
  type: "Zod",
  mode: "body",
});
