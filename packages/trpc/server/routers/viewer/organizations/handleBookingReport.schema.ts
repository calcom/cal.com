import { z } from "zod";

export const ZHandleBookingReportInputSchema = z.object({
  reportId: z.string(),
  action: z.enum(["block_email", "block_domain", "ignore"]),
});

export type THandleBookingReportInputSchema = z.infer<typeof ZHandleBookingReportInputSchema>;
