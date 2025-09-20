import { z } from "zod";

export const ZCalIdFormQueryInputSchema = z.object({
  id: z.string(),
});

export type TCalIdFormQueryInputSchema = z.infer<typeof ZCalIdFormQueryInputSchema>;
