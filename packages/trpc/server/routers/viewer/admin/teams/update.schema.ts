import { z } from "zod";

export const ZTeamUpdateSchema = z.object({
  teamId: z.number(),
  data: z.object({
    name: z.string().optional(),
    slug: z.string().optional(),
    bio: z.string().optional(),
    brandColor: z.string().optional(),
    darkBrandColor: z.string().optional(),
    bannerUrl: z.string().optional(),
    timeFormat: z.number().optional(),
    timeZone: z.string().optional(),
    weekStart: z.string().optional(),
  }),
});

export type TTeamUpdateSchema = z.infer<typeof ZTeamUpdateSchema>;
