import { z } from "zod";

export const ZGetClientInputSchema = z.object({
  clientId: z.string().optional(),
});

export type TGetClientInputSchema = z.infer<typeof ZGetClientInputSchema>;
