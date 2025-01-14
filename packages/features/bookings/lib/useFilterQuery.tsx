import z from "zod";

import dayjs from "@calcom/dayjs";
import { queryNumberArray, useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";

// TODO: Move this to zod utils
export const filterQuerySchema = z.object({
  teamIds: queryNumberArray.optional(),
  userIds: queryNumberArray.optional(),
  status: z.enum(["upcoming", "recurring", "past", "cancelled", "unconfirmed"]).optional(),
  eventTypeIds: queryNumberArray.optional(),
  afterStartDate: z
    .string()
    .optional()
    .transform((date) => (date ? dayjs(date).format("YYYY-MM-DD") : undefined)),
  beforeEndDate: z
    .string()
    .optional()
    .transform((date) => (date ? dayjs(date).format("YYYY-MM-DD") : undefined)),
});

export function useFilterQuery() {
  return useTypedQuery(filterQuerySchema);
}
