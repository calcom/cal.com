import { z } from "zod";

export const ZCalIdDeleteInputSchema = z.object({
  id: z.number(),
});

export type TCalIdDeleteInputSchema = z.infer<typeof ZCalIdDeleteInputSchema>;
