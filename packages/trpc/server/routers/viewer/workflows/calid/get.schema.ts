import { z } from "zod";

export const ZCalIdGetInputSchema = z.object({
  id: z.number().optional(),
});

export type TCalIdGetInputSchema = z.infer<typeof ZCalIdGetInputSchema>;
