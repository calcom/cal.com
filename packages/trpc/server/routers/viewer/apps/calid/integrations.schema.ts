import { z } from "zod";

import { AppCategories } from "@calcom/prisma/enums";

export const ZCalIdIntegrationsInputSchema = z.object({
  variant: z.string().optional(),
  exclude: z.array(z.string()).optional(),
  onlyInstalled: z.boolean().optional(),
  includeCalIdTeamInstalledApps: z.boolean().optional(),
  extendsFeature: z.literal("EventType").optional(),
  calIdTeamId: z.union([z.number(), z.null()]).optional(),
  sortByMostPopular: z.boolean().optional(),
  sortByInstalledFirst: z.boolean().optional(),
  categories: z.nativeEnum(AppCategories).array().optional(),
  appId: z.string().optional(),
});

export type TCalIdIntegrationsInputSchema = z.infer<typeof ZCalIdIntegrationsInputSchema>;
