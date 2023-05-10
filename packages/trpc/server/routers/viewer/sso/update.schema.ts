import { z } from "zod";

export const ZUpdateInputSchema = z.object({
  encodedRawMetadata: z.string(),
  teamId: z.union([z.number(), z.null()]),
});

export type TUpdateInputSchema = z.infer<typeof ZUpdateInputSchema>;
