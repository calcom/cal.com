import { z } from "zod";

export const ZDownloadExpenseLogSchema = z.object({
  teamId: z.number().optional(),
  startDate: z.string(),
  endDate: z.string(),
});

export type TDownloadExpenseLogSchema = z.infer<typeof ZDownloadExpenseLogSchema>;
