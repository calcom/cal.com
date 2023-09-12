import { z } from "zod";

export const ZToggleInputSchema = z.object({
  slug: z.string(),
  enabled: z.boolean(),
});

export type TToggleInputSchema = z.infer<typeof ZToggleInputSchema>;
