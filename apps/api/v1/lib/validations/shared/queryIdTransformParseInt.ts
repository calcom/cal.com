import { withValidation } from "next-validations";
import { z } from "zod";

import { baseApiParams } from "./baseApiParams";

// Extracted out as utility function so can be reused
// at different endpoints that require this validation.
export const schemaQueryIdParseInt = baseApiParams.extend({
  id: z.coerce.number(),
});

export const withValidQueryIdTransformParseInt = withValidation({
  schema: schemaQueryIdParseInt,
  type: "Zod",
  mode: "query",
});
