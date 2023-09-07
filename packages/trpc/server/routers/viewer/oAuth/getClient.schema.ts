import { z } from "zod";

export const ZGetClientInputSchema = z.object({
  clientId: z.string(),
});

export type TGetClientInputSchema = z.infer<typeof ZGetClientInputSchema>;
