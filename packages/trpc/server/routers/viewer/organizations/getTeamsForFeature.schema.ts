import { z } from "zod";

export const ZGetTeamsForFeatureSchema = z.object({
  featureId: z.string(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.number().optional(),
  searchTerm: z.string().optional(),
});

export type TGetTeamsForFeatureSchema = z.infer<typeof ZGetTeamsForFeatureSchema>;
