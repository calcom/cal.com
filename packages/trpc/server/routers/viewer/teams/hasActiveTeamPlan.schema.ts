import { z } from "zod";

export const ZHasActiveTeamPlanSchema = z.object({
  teamId: z.number().optional(),
});

export type THasActiveTeamPlanSchema = z.infer<typeof ZHasActiveTeamPlanSchema>;
