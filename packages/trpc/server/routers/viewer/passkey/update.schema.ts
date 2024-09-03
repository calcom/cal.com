import { z } from "zod";

export const ZUpdateInputSchema = z.object({
  passkeyId: z.string(),
  name: z.string(),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
