import { z } from "zod";

export const ZUpdateFeaturesInputSchema = z.object({
  teamId: z.number(),
  features: z.record(z.string(), z.boolean()),
});

export type TUpdateFeaturesInputSchema = z.infer<typeof ZUpdateFeaturesInputSchema>;
