import { z } from "zod";

export const ZVerifyInputSchema = z.object({
  name: z.string(),
  isTeam: z.boolean(),
});

export type TVerifyInputSchema = z.infer<typeof ZVerifyInputSchema>;
