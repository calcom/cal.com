import { z } from "zod";

import { ZTextFilterValue } from "@calcom/features/data-table/lib/types";

export const ZGetInputSchema = z.object({
  filters: z.object({
    teamIds: z.number().array().optional(),
    userIds: z.number().array().optional(),
    // Support both singular 'status' (for API v2) and plural 'statuses' (/bookings page)
    status: z.enum(["upcoming", "recurring", "past", "cancelled", "unconfirmed"]).optional(),
    statuses: z.enum(["upcoming", "recurring", "past", "cancelled", "unconfirmed"]).array().optional(),
    eventTypeIds: z.number().array().optional(),
    attendeeEmail: z.union([z.string(), ZTextFilterValue]).optional(),
    attendeeName: z.union([z.string(), ZTextFilterValue]).optional(),
    bookingUid: z.string().optional(),
    afterStartDate: z.string().optional(),
    beforeEndDate: z.string().optional(),
    afterUpdatedDate: z.string().optional(),
    beforeUpdatedDate: z.string().optional(),
    afterCreatedDate: z.string().optional(),
    beforeCreatedDate: z.string().optional(),
  }),
  limit: z.number().min(1).max(100),
  offset: z.number().default(0),
  // Cursor for infinite query support (calendar view)
  cursor: z.string().optional(),
  // Sort options for controlling result order
  sort: z
    .object({
      sortStart: z.enum(["asc", "desc"]).optional(),
    })
    .optional(),
});

export type TGetInputSchema = z.infer<typeof ZGetInputSchema>;
