import { z } from "zod";

export const ZDismissReportInputSchema = z.object({
  reportId: z.string().uuid(),
});

export type TDismissReportInputSchema = z.infer<typeof ZDismissReportInputSchema>;
