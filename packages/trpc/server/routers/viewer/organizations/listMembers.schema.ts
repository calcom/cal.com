import { z } from "zod";

import { ZFilterValue } from "@calcom/features/data-table";

const expandableColumns = z.enum(["attributes"]);

const ZListMembersFilter = z.object({
  id: z.string(),
  value: ZFilterValue,
});

export const ZListMembersSchema = z.object({
  limit: z.number().min(1).max(100),
  cursor: z.number().nullish(),
  searchTerm: z.string().optional(),
  expand: z.array(expandableColumns).optional(),
  filters: z.array(ZListMembersFilter).optional(),
});

export type TListMembersSchema = z.infer<typeof ZListMembersSchema>;
