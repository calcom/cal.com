import { z } from "zod";

export const ZAdminGetTeamsForFeatureSchema = z.object({
  featureId: z.string(),
  limit: z.number().min(1).max(100).default(10),
  cursor: z.number().nullish(),
  searchTerm: z.string().optional(),
});

export type TAdminGetTeamsForFeatureSchema = z.infer<typeof ZAdminGetTeamsForFeatureSchema>;
