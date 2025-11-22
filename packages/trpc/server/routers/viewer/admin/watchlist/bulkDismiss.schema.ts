import { z } from "zod";

export const ZBulkDismissReportsInputSchema = z.object({
  reportIds: z.array(z.string().uuid()).min(1, "At least one report must be selected"),
});

export type TBulkDismissReportsInputSchema = z.infer<typeof ZBulkDismissReportsInputSchema>;
