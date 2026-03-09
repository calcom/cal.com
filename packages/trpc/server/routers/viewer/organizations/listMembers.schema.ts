import { z } from "zod";

import { ZFilterValue } from "@calcom/features/data-table/lib/types";

const expandableColumns = z.enum(["attributes"]);

const ZListMembersFilter = z.object({
  id: z.string(),
  value: ZFilterValue,
});

export type TListMembersSchema = {
  limit: number;
  offset: number;
  searchTerm?: string;
  expand?: "attributes"[];
  filters?: { id: string; value: z.infer<typeof ZFilterValue> }[];
  oAuthClientId?: string;
};

export const ZListMembersInputSchema: z.ZodType<TListMembersSchema> = z.object({
  limit: z.number().min(1).max(100),
  offset: z.number(),
  searchTerm: z.string().optional(),
  expand: z.array(expandableColumns).optional(),
  filters: z.array(ZListMembersFilter).optional(),
  oAuthClientId: z.string().optional(),
});
