import { z } from "zod";

export const ZTeamsListPaginatedSchema = z.object({
  limit: z.number().min(1).max(100).default(25),
  cursor: z.number().optional(),
  searchTerm: z.string().optional(),
});

export type TTeamsListPaginatedSchema = z.infer<typeof ZTeamsListPaginatedSchema>;
