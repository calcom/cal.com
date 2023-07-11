import { z } from "zod";

export const ZIntegrationsInputSchema = z.object({
  variant: z.string().optional(),
  exclude: z.array(z.string()).optional(),
  onlyInstalled: z.boolean().optional(),
  includeTeamInstalledApps: z.boolean().optional(),
  extendsFeature: z.literal("EventType").optional(),
  teamId: z.union([z.number(), z.null()]).optional(),
});

export type TIntegrationsInputSchema = z.infer<typeof ZIntegrationsInputSchema>;
