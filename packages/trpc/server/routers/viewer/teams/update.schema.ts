import { z } from "zod";

import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import slugify from "@calcom/lib/slugify";

export const ZUpdateInputSchema = z.object({
  id: z.number(),
  bio: z.string().optional(),
  name: z.string().optional(),
  logo: z
    .string()
    .transform(async (val) => await resizeBase64Image(val))
    .nullable()
    .optional(),
  slug: z
    .string()
    .transform((val) => slugify(val.trim()))
    .optional(),
  hideBranding: z.boolean().optional(),
  hideBookATeamMember: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  brandColor: z.string().optional(),
  darkBrandColor: z.string().optional(),
  theme: z.string().optional().nullable(),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
