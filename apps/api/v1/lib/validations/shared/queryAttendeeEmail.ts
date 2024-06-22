import { withValidation } from "next-validations";
import { z } from "zod";

import { emailRegex } from "@calcom/prisma/zod-utils";

import { baseApiParams } from "./baseApiParams";

// Extracted out as utility function so can be reused
// at different endpoints that require this validation.
export const schemaQueryAttendeeEmail = baseApiParams.extend({
  attendeeEmail: z.string().regex(emailRegex),
});

export const schemaQuerySingleOrMultipleAttendeeEmails = z.object({
  attendeeEmail: z.union([z.string().regex(emailRegex), z.array(z.string().regex(emailRegex))]).optional(),
});

export const withValidQueryAttendeeEmail = withValidation({
  schema: schemaQueryAttendeeEmail,
  type: "Zod",
  mode: "query",
});
