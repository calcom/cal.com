import { z } from "zod";

export const ZAdminVerifyInput = z.object({
  orgId: z.number(),
});

export type TAdminVerifyInput = z.infer<typeof ZAdminVerifyInput>;
