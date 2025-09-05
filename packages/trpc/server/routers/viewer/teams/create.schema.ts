import slugify from "@calcom/lib/slugify";
import { z } from "zod";

export const ZCreateInputSchema = z.object({
  name: z.string(),
  slug: z.string().transform((val) => slugify(val.trim())),
  logo: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v || null),
});

export type TCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
