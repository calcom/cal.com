import { withValidation } from "next-validations";
import { z } from "zod";
import { baseApiParams } from "./baseApiParams";

// Extracted out as utility function so can be reused
// at different endpoints that require this validation.
/** Used for UUID style id queries */
export const schemaQueryIdAsString = baseApiParams
  .extend({
    id: z.string(),
  })
  .strict();

export const withValidQueryIdString = withValidation({
  schema: schemaQueryIdAsString,
  type: "Zod",
  mode: "query",
});
