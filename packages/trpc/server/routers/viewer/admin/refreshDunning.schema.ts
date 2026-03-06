import { z } from "zod";

export const ZRefreshDunningSchema = z.object({
  billingId: z.string(),
  entityType: z.enum(["team", "organization"]),
});

export type TRefreshDunningInput = z.infer<typeof ZRefreshDunningSchema>;
