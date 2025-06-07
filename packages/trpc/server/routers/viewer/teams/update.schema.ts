import { z } from "zod";

import { intervalLimitsType } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import type { IntervalLimit } from "@calcom/lib/intervalLimits/intervalLimitSchema";
import { resizeBase64Image } from "@calcom/lib/server/resizeBase64Image";
import slugify from "@calcom/lib/slugify";

export type TUpdateInputSchema = {
  id: number;
  bio?: string;
  name?: string;
  logo?: string | null;
  slug?: string;
  hideBranding?: boolean;
  hideBookATeamMember?: boolean;
  hideTeamProfileLink?: boolean;
  isPrivate?: boolean;
  brandColor?: string;
  darkBrandColor?: string;
  theme?: string | null;
  bookingLimits?: IntervalLimit | null;
  includeManagedEventsInLimits?: boolean;
  rrResetInterval?: "DAY" | "MONTH";
  rrTimestampBasis?: "CREATED_AT" | "START_TIME";
};

export const ZUpdateInputSchema: z.Schema<TUpdateInputSchema> = z.object({
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
  hideTeamProfileLink: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  brandColor: z.string().optional(),
  darkBrandColor: z.string().optional(),
  theme: z.string().optional().nullable(),
  bookingLimits: intervalLimitsType.optional(),
  includeManagedEventsInLimits: z.boolean().optional(),
  rrResetInterval: z.enum(["DAY", "MONTH"]).optional(),
  rrTimestampBasis: z.enum(["CREATED_AT", "START_TIME"]).optional(),
});
