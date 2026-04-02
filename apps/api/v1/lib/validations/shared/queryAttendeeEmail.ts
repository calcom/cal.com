import { emailSchema } from "@calcom/lib/emailSchema";
import { withValidation } from "next-validations";
import { z } from "zod";
import { baseApiParams } from "./baseApiParams";

// Extracted out as utility function so can be reused
// at different endpoints that require this validation.
export const schemaQueryAttendeeEmail = baseApiParams.extend({
  attendeeEmail: emailSchema,
});

export const schemaQuerySingleOrMultipleAttendeeEmails = z.object({
  attendeeEmail: z.union([emailSchema, z.array(emailSchema)]).optional(),
});

export const withValidQueryAttendeeEmail = withValidation({
  schema: schemaQueryAttendeeEmail,
  type: "Zod",
  mode: "query",
});
