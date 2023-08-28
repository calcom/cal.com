import { z } from "zod";

import { AppCategories } from "@calcom/prisma/enums";

export const ZIntegrationsInputSchema = z.object({
  variant: z.string().optional(),
  exclude: z.array(z.string()).optional(),
  onlyInstalled: z.boolean().optional(),
  includeTeamInstalledApps: z.boolean().optional(),
  extendsFeature: z.literal("EventType").optional(),
  teamId: z.union([z.number(), z.null()]).optional(),
  sortByMostPopular: z.boolean().optional(),
  categories: z.nativeEnum(AppCategories).array().optional(),
  appId: z.string().optional(),
});

export type TIntegrationsInputSchema = z.infer<typeof ZIntegrationsInputSchema>;
