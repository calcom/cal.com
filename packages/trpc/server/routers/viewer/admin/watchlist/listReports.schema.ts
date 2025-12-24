import { z } from "zod";

import { BookingReportReason, BookingReportStatus } from "@calcom/prisma/enums";

export const ZListReportsInputSchema = z.object({
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
  searchTerm: z.string().optional(),
  filters: z
    .object({
      status: z.array(z.nativeEnum(BookingReportStatus)).optional(),
      reason: z.array(z.nativeEnum(BookingReportReason)).optional(),
    })
    .optional(),
});

export type TListReportsInputSchema = z.infer<typeof ZListReportsInputSchema>;
