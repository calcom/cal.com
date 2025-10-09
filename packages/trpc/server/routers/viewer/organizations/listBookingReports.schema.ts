import { z } from "zod";

import { ReportReason } from "@calcom/prisma/enums";

export const ZListBookingReportsInputSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
  searchTerm: z.string().optional(),
  filters: z
    .object({
      reason: z.array(z.nativeEnum(ReportReason)).optional(),
      cancelled: z.boolean().optional(),
      hasWatchlist: z.boolean().optional(),
      dateRange: z
        .object({
          from: z.coerce.date().optional(),
          to: z.coerce.date().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type TListBookingReportsInputSchema = z.infer<typeof ZListBookingReportsInputSchema>;
