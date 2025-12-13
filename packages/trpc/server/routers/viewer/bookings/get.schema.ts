import { z } from "zod";

import { ZTextFilterValue } from "@calcom/features/data-table/lib/types";

// Define type first to use with z.ZodType annotation
// This prevents full Zod generic tree from being emitted in .d.ts files
type BookingStatus = "upcoming" | "recurring" | "past" | "cancelled" | "unconfirmed";

export type TGetInputSchema = {
  filters: {
    teamIds?: number[];
    userIds?: number[];
    status?: BookingStatus;
    statuses?: BookingStatus[];
    eventTypeIds?: number[];
    attendeeEmail?: string | z.infer<typeof ZTextFilterValue>;
    attendeeName?: string | z.infer<typeof ZTextFilterValue>;
    bookingUid?: string;
    afterStartDate?: string;
    beforeEndDate?: string;
    afterUpdatedDate?: string;
    beforeUpdatedDate?: string;
    afterCreatedDate?: string;
    beforeCreatedDate?: string;
  };
  limit: number;
  offset?: number;
  cursor?: string;
};

export const ZGetInputSchema: z.ZodType<TGetInputSchema> = z.object({
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
});
