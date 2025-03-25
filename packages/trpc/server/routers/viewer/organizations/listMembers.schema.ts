import { z } from "zod";

import { ZFilterValue } from "@calcom/features/data-table/lib/types";

const expandableColumns = z.enum(["attributes"]);

const ZListMembersFilter = z.object({
  id: z.string(),
  value: ZFilterValue,
});

export const ZListMembersInputSchema = z.object({
  limit: z.number().min(1).max(100),
  offset: z.number(),
  searchTerm: z.string().optional(),
  expand: z.array(expandableColumns).optional(),
  filters: z.array(ZListMembersFilter).optional(),
  oAuthClientId: z.string().optional(),
});

export type TListMembersSchema = z.infer<typeof ZListMembersInputSchema>;
