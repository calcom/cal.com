import { z } from "zod";

import { ReportReason } from "@calcom/prisma/enums";

export const ZReportBookingInputSchema = z.object({
  bookingId: z.number(),
  reason: z.nativeEnum(ReportReason),
  description: z.string().optional(),
});

export type TReportBookingInputSchema = z.infer<typeof ZReportBookingInputSchema>;
