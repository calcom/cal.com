import { z } from "zod";

export const ZDismissBookingReportInputSchema = z.object({
  email: z.string().email(),
});

export type TDismissBookingReportInputSchema = z.infer<typeof ZDismissBookingReportInputSchema>;
