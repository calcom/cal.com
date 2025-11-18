import { z } from "zod";

export const ZDismissBookingReportInputSchema = z.object({
  reportId: z.string().uuid(),
});

export type TDismissBookingReportInputSchema = z.infer<typeof ZDismissBookingReportInputSchema>;
