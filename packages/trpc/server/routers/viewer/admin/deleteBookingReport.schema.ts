import { z } from "zod";

export const ZDeleteBookingReportInputSchema = z.object({
  reportId: z.string().uuid(),
});

export type TDeleteBookingReportInputSchema = z.infer<typeof ZDeleteBookingReportInputSchema>;
