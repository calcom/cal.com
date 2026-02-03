import { z } from "zod";

export const ZListInvoicesInputSchema = z.object({
  teamId: z.number(),
  limit: z.number().min(1).max(100).default(10),
  cursor: z.string().optional().nullable(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export type TListInvoicesInputSchema = z.infer<typeof ZListInvoicesInputSchema>;
