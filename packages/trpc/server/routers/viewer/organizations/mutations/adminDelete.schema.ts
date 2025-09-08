import { z } from "zod";

export const ZAdminDeleteInput = z.object({
  orgId: z.number(),
});

export type TAdminDeleteInput = z.infer<typeof ZAdminDeleteInput>;
