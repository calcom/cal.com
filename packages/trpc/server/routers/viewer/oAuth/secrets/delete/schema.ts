import { z } from "zod";

export const ZDeleteClientSecretInputSchema = z.object({
  clientId: z.string(),
  secretId: z.number(),
});

export type TDeleteClientSecretInputSchema = z.infer<typeof ZDeleteClientSecretInputSchema>;
