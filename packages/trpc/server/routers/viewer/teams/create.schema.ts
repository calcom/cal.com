import { z } from "zod";

import slugify from "@calcom/lib/slugify";

export const ZCreateInputSchema = z.object({
  name: z.string(),
  slug: z.string().transform((val) => slugify(val.trim())),
  logo: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v || null),
  bio: z.string().optional(),
  isOnboarding: z.boolean().optional(),
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
