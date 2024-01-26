import { z } from "zod";

import { baseApiParams } from "./baseApiParams";

export const schemaQuerySlug = baseApiParams
  .extend({
    slug: z.string(),
    ownerId: z
      .string()
      .optional()
      .transform((value) => (value ? parseInt(value, 10) : null)),
  })
  .strict();
