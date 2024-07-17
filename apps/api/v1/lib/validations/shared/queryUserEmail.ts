import { withValidation } from "next-validations";
import { z } from "zod";

import { baseApiParams } from "./baseApiParams";

// Extracted out as utility function so can be reused
// at different endpoints that require this validation.
export const schemaQueryUserEmail = baseApiParams.extend({
  email: z.string().email(),
});

export const schemaQuerySingleOrMultipleUserEmails = z.object({
  email: z.union([z.string().email(), z.array(z.string().email())]),
});

export const withValidQueryUserEmail = withValidation({
  schema: schemaQueryUserEmail,
  type: "Zod",
  mode: "query",
});
