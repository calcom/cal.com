import { z } from "zod";

import slugify from "@calcom/lib/slugify";

export const ZCreateInputSchema = z.object({
  name: z.string(),
  slug: z.string().transform((val) => slugify(val.trim())),
  adminEmail: z.string().email(),
  adminUsername: z.string(),
  check: z.boolean().default(true),
  language: z.string().optional(),
  isPlatform: z.boolean().default(false),
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
