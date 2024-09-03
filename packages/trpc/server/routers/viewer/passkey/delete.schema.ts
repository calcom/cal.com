import { z } from "zod";

export const ZDeleteInputSchema = z.object({
  passkeyId: z.string(),
});

export type TDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
