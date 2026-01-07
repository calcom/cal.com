import { z } from "zod";

export const ZDismissBookingReportInputSchema = z.object({
  reportIds: z.array(z.string().uuid()).min(1),
});

export type TDismissBookingReportInputSchema = z.infer<typeof ZDismissBookingReportInputSchema>;
