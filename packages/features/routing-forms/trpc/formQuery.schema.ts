import { z } from "zod";

export const ZFormQueryInputSchema = z.object({
  id: z.string(),
});

export type TFormQueryInputSchema = z.infer<typeof ZFormQueryInputSchema>;
