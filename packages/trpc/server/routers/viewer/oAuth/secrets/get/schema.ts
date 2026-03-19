import { z } from "zod";

export const ZGetClientSecretsInputSchema = z.object({
  clientId: z.string(),
});

export type TGetClientSecretsInputSchema = z.infer<typeof ZGetClientSecretsInputSchema>;
