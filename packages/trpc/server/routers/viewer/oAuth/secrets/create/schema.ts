import { z } from "zod";

export const ZCreateClientSecretInputSchema = z.object({
  clientId: z.string(),
});

export type TCreateClientSecretInputSchema = z.infer<typeof ZCreateClientSecretInputSchema>;
