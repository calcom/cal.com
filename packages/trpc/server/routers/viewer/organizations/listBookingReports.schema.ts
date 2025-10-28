import { z } from "zod";

import { BookingReportReason } from "@calcom/prisma/enums";

export const ZListBookingReportsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
  searchTerm: z.string().optional(),
  filters: z
    .object({
      reason: z.array(z.nativeEnum(BookingReportReason)).optional(),
      cancelled: z.boolean().optional(),
      hasWatchlist: z.boolean().optional(),
    })
    .optional(),
});

export type TListBookingReportsInputSchema = z.infer<typeof ZListBookingReportsInputSchema>;
