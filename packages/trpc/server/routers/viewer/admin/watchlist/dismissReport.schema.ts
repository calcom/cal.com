import { z } from "zod";

export const ZDismissReportInputSchema = z.object({
  email: z.string().email(),
});

export type TDismissReportInputSchema = z.infer<typeof ZDismissReportInputSchema>;
