import { BookingReportReason, BookingReportStatus } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZListBookingReportsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
  searchTerm: z.string().optional(),
  sortBy: z.enum(["createdAt", "reportCount"]).optional().default("createdAt"),
  filters: z
    .object({
      reason: z.array(z.nativeEnum(BookingReportReason)).optional(),
      cancelled: z.boolean().optional(),
      hasWatchlist: z.boolean().optional(),
      status: z.array(z.nativeEnum(BookingReportStatus)).optional(),
    })
    .optional(),
});

export type TListBookingReportsInputSchema = z.infer<typeof ZListBookingReportsInputSchema>;
