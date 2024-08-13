import { z } from "zod";

export const ZCommonInputSchema = z.object({
  token: z.string(),
});

export type TCommonInputSchema = z.infer<typeof ZCommonInputSchema>;
