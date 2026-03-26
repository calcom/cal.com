/* v8 ignore file -- trigger.dev schema definition */
import { z } from "zod";

export const advanceSingleTeamDunningSchema = z.object({
  billingId: z.string(),
  entityType: z.enum(["team", "organization"]),
});
