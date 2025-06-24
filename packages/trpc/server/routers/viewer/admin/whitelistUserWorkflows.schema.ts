import { z } from "zod";

export const ZWhitelistUserWorkflows = z.object({
  userId: z.number(),
  whitelistWorkflows: z.boolean(),
});

export type TWhitelistUserWorkflows = z.infer<typeof ZWhitelistUserWorkflows>;
