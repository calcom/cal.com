import { z } from "zod";

import { ZFilterValue } from "@calcom/features/data-table/lib/types";

const ZAdminGetAllFilter = z.object({
  id: z.string(),
  value: ZFilterValue,
});

export const ZAdminGetAllInputSchema = z.object({
  limit: z.number().int().min(1).max(100),
  offset: z.number().int().min(0),
  searchTerm: z.string().optional(),
  filters: z.array(ZAdminGetAllFilter).optional(),
});

export type TAdminGetAllSchema = z.infer<typeof ZAdminGetAllInputSchema>;
