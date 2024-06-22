import { withValidation } from "next-validations";
import { z } from "zod";

import { emailRegex } from "@calcom/prisma/zod-utils";

import { baseApiParams } from "./baseApiParams";

// Extracted out as utility function so can be reused
// at different endpoints that require this validation.
export const schemaQueryUserEmail = baseApiParams.extend({
  email: z.string().regex(emailRegex),
});

export const schemaQuerySingleOrMultipleUserEmails = z.object({
  email: z.union([z.string().regex(emailRegex), z.array(z.string().regex(emailRegex))]),
});

export const withValidQueryUserEmail = withValidation({
  schema: schemaQueryUserEmail,
  type: "Zod",
  mode: "query",
});
