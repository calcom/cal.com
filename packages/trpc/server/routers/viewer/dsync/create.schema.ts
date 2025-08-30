import { z } from "zod";

export const ZCreateInputSchema = z.object({
  organizationId: z.union([z.number(), z.null()]),
  name: z.string(),
  provider: z.string(),
});

export type ZCreateInputSchema = z.infer<typeof ZCreateInputSchema>;
