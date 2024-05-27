import { z } from "zod";

// Extracted out as utility function so can be reused
// at different endpoints that require this validation.
export const baseApiParams = z.object({
  // since we added apiKey as query param this is required by next-validations helper
  // for query params to work properly and not fail.
  apiKey: z.string().optional(),
  // version required for supporting  /v1/ redirect to query in api as *?version=1
  version: z.string().optional(),
});
