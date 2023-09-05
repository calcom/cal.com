import { z } from "zod";

export const ZDeleteInputSchema = z.object({
  teamId: z.union([z.number(), z.null()]),
  directoryId: z.string(),
});

export type ZDeleteInputSchema = z.infer<typeof ZDeleteInputSchema>;
