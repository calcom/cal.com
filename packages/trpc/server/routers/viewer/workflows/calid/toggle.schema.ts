import { z } from "zod";

export const ZCalIdToggleInputSchema = z.object({
  id: z.number(),
  disabled: z.boolean().optional().default(false),
});

export type TCalIdToggleInputSchema = z.infer<typeof ZCalIdToggleInputSchema>;
