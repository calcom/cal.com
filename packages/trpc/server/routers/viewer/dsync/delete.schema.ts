import { z } from "zod";

export const ZDeleteInputSchema = z.object({
  orgId: z.union([z.number(), z.null()]),
  directoryId: z.string(),
});

export type ZDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
