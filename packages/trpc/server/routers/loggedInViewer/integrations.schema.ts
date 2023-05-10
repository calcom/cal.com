import { z } from "zod";

export const ZIntegrationsInputSchema = z.object({
  variant: z.string().optional(),
  exclude: z.array(z.string()).optional(),
  onlyInstalled: z.boolean().optional(),
});

export type TIntegrationsInputSchema = z.infer<typeof ZIntegrationsInputSchema>;
