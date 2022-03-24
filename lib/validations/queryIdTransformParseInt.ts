import { z } from "zod";

// Extracted out as utility function so can be reused
// at different endpoints that require this validation.
const schema = z
  .object({
    // since nextjs parses query params as strings,
    // we need to cast them to numbers using z.transform() and parseInt()
    id: z
      .string()
      .regex(/^\d+$/)
      .transform((id) => parseInt(id)),
  })
  .strict();
export default schema;
