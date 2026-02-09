import { z } from "zod";

import slugify from "@calcom/lib/slugify";

export const ZCreateInputSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s.'-]+$/, "Invalid team name"),
  slug: z.string().transform((val) => slugify(val.trim())),
  logo: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v || null),
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
