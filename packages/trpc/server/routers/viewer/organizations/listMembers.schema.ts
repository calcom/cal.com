import { z } from "zod";

import { ZSelectFilterValue, ZTextFilterValue } from "@calcom/ui/data-table";

const expandableColumns = z.enum(["attributes"]);

const ZListMembersFilter = z.union([
  z.object({
    id: z.string(),
    value: ZSelectFilterValue,
  }),
  z.object({
    id: z.string(),
    value: ZTextFilterValue,
  }),
]);

export const ZListMembersSchema = z.object({
  limit: z.number().min(1).max(100),
  cursor: z.number().nullish(),
  searchTerm: z.string().optional(),
  expand: z.array(expandableColumns).optional(),
  filters: z.array(ZListMembersFilter).optional(),
});

export type TListMembersSchema = z.infer<typeof ZListMembersSchema>;
