import { z } from "zod";

export const ZUpdateInputSchema = z.object({
  name: z.string().optional(),
  orgId: z
    .string()
    .regex(/^\d+$/)
    .transform((id) => parseInt(id))
    .optional(),
  bio: z.string().optional(),
  logo: z
    .string()
    .optional()
    .nullable()
    .transform((v) => v || null),
  slug: z.string().optional(),
  hideBranding: z.boolean().optional(),
  hideBookATeamMember: z.boolean().optional(),
  brandColor: z.string().optional(),
  darkBrandColor: z.string().optional(),
  theme: z.string().optional().nullable(),
  timeZone: z.string().optional(),
  weekStart: z.string().optional(),
  timeFormat: z.number().optional(),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
