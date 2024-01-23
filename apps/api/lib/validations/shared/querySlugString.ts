import { withValidation } from "next-validations";
import { z } from "zod";

import { baseApiParams } from "./baseApiParams";

// Extracted out as utility function so can be reused
// at different endpoints that require this validation.
export const schemaQuerySlugAsString = baseApiParams
  .extend({
    slug: z.string(),
  })
  .strict();

export const withValidQuerySlugString = withValidation({
  schema: schemaQuerySlugAsString,
  type: "Zod",
  mode: "query",
});
