import { z } from "zod";

export const ZDeleteClientInputSchema = z.object({
  clientId: z.string().min(1),
});

export type TDeleteClientInputSchema = z.infer<typeof ZDeleteClientInputSchema>;
