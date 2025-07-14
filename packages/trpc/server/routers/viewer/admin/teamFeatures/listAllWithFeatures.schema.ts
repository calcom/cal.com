import { z } from "zod";

export const ZListAllWithFeaturesInputSchema = z.object({
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
  searchTerm: z.string().optional(),
  parentId: z.number().optional(),
});

export type TListAllWithFeaturesInputSchema = z.infer<typeof ZListAllWithFeaturesInputSchema>;
