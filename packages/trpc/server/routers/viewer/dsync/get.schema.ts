import { z } from "zod";

export const ZGetInputSchema = z.object({
  organizationId: z.union([z.number(), z.null()]),
});

export type ZGetInputSchema = z.infer<typeof ZGetInputSchema>;
