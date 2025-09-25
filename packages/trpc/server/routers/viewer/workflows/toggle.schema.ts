import { z } from "zod";

export const ZToggleInputSchema = z.object({
  id: z.number(),
  disabled: z.boolean().optional().default(false),
});

export type TToggleInputSchema = z.infer<typeof ZToggleInputSchema>;
