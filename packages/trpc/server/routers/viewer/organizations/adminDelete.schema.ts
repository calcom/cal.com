import { z } from "zod";

export const ZAdminDeleteInput = z.object({
  orgId: z.number(),
  userRenamingAcknowledged: z.boolean().optional(),
});

export type TAdminDeleteInput = z.infer<typeof ZAdminDeleteInput>;
