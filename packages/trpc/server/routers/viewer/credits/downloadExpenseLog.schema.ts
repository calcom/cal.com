import { z } from "zod";

export const ZDownloadExpenseLogSchema = z.object({
  teamId: z.number().optional(),
});

export type TDownloadExpenseLogSchema = z.infer<typeof ZDownloadExpenseLogSchema>;
