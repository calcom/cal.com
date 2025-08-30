import { z } from "zod";

export const ZHasActiveTeamPlanInputSchema = z
  .object({
    ownerOnly: z.boolean().optional(),
  })
  .optional();

export type THasActiveTeamPlanInputSchema = z.infer<typeof ZHasActiveTeamPlanInputSchema>;
