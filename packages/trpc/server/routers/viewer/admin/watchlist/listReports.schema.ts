import { BookingReportReason, BookingReportStatus, SystemReportStatus } from "@calcom/prisma/enums";
import { z } from "zod";

export const ZListReportsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
  searchTerm: z.string().optional(),
  sortBy: z.enum(["createdAt", "reportCount"]).optional().default("createdAt"),
  filters: z
    .object({
      status: z.array(z.nativeEnum(BookingReportStatus)).optional(),
      reason: z.array(z.nativeEnum(BookingReportReason)).optional(),
    })
    .optional(),
  systemFilters: z
    .object({
      systemStatus: z.array(z.nativeEnum(SystemReportStatus)).optional(),
    })
    .optional(),
});

export type TListReportsInputSchema = z.infer<typeof ZListReportsInputSchema>;
