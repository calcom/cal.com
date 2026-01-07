import { z } from "zod";

export const ZDismissReportInputSchema = z.object({
  reportIds: z.array(z.string().uuid()).min(1),
});

export type TDismissReportInputSchema = z.infer<typeof ZDismissReportInputSchema>;
