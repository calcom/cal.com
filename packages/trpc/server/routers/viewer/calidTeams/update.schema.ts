import { z } from "zod";

import { intervalLimitsType } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import slugify from "@calcom/lib/slugify";

export const ZUpdateCalidTeamSchema = z.object({
  id: z.number(),
  name: z
    .string()
    .regex(/^[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\s.'-]+$/, "Invalid team name")
    .optional(),
  slug: z
    .string()
    .transform((val) => slugify(val.trim()))
    .optional(),
  logo: z
    .string()
    .transform(async (val) => await resizeBase64Image(val))
    .optional()
    .nullable(),
  bio: z.string().optional(),
  hideTeamBranding: z.boolean().optional(),
  hideTeamProfileLink: z.boolean().optional(),
  isTeamPrivate: z.boolean().optional(),
  hideBookATeamMember: z.boolean().optional(),
  theme: z.string().optional().nullable(),
  brandColor: z.string().optional(),
  darkBrandColor: z.string().optional(),
  bookingFrequency: intervalLimitsType.optional(),
  bannerUrl: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ZUpdateCalidTeamInput = z.infer<typeof ZUpdateCalidTeamSchema>;
