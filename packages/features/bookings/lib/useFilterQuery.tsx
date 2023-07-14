import z from "zod";

import { queryNumberArray, useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";

// TODO: Move this to zod utils
export const filterQuerySchema = z.object({
  teamIds: queryNumberArray.optional(),
  userIds: queryNumberArray.optional(),
  status: z.enum(["upcoming", "recurring", "past", "cancelled", "unconfirmed"]).optional(),
  eventTypeIds: queryNumberArray.optional(),
});

export function useFilterQuery() {
  return useTypedQuery(filterQuerySchema);
}
