import { z } from "zod";

export const ZDeleteInputSchema = z.object({
  UserId: z.number(),
  passkeyId: z.string(),
});

export type TDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
