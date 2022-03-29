import { withValidation } from "next-validations";
import { z } from "zod";

// Extracted out as utility function so can be reused
// at different endpoints that require this validation.
const schemaQueryIdAsString = z
  .object({
    // since we added apiKey as query param this is required by next-validations helper
    // for query params to work properly and not fail.
    apiKey: z.string().cuid(),
    // since nextjs parses query params as strings,
    // we need to cast them to numbers using z.transform() and parseInt()
    id: z.string()
  })
  .strict();

const withValidQueryIdString = withValidation({
  schema: schemaQueryIdAsString,
  type: "Zod",
  mode: "query",
});

export { schemaQueryIdAsString, withValidQueryIdString };
