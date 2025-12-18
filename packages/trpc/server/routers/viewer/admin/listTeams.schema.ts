import { z } from "zod";

import { ZFilterValue, ZSortingState } from "@calcom/features/data-table/lib/types";

const ZListTeamsFilter = z.object({
  id: z.string(),
  value: ZFilterValue,
});

export type TAdminListTeamsSchema = {
  limit: number;
  offset: number;
  searchTerm?: string;
  filters?: { id: string; value: z.infer<typeof ZFilterValue> }[];
  sorting?: z.infer<typeof ZSortingState>;
};

export const ZAdminListTeamsInputSchema: z.ZodType<TAdminListTeamsSchema> = z.object({
  limit: z.number().min(1).max(100),
  offset: z.number().min(0),
  searchTerm: z.string().optional(),
  filters: z.array(ZListTeamsFilter).optional(),
  sorting: ZSortingState.optional(),
});

