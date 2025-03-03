import { z } from "zod";

import { ZTextFilterValue } from "@calcom/features/data-table/lib/types";

export const ZGetInputSchema = z.object({
  filters: z.object({
    teamIds: z.number().array().optional(),
    userIds: z.number().array().optional(),
    status: z.enum(["upcoming", "recurring", "past", "cancelled", "unconfirmed"]).optional(),
    eventTypeIds: z.number().array().optional(),
    attendeeEmail: z.union([z.string(), ZTextFilterValue]).optional(),
    attendeeName: z.union([z.string(), ZTextFilterValue]).optional(),
    afterStartDate: z.string().optional(),
    beforeEndDate: z.string().optional(),
    afterUpdatedDate: z.string().optional(),
    beforeUpdatedDate: z.string().optional(),
  }),
  limit: z.number().min(1).max(100).nullish(),
  cursor: z.number().nullish(), // <-- "cursor" needs to exist when using useInfiniteQuery, but can be any type
});

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
