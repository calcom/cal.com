import { z } from "zod";

export const advanceSingleTeamDunningSchema = z.object({
  billingId: z.string(),
  entityType: z.enum(["team", "organization"]),
});
