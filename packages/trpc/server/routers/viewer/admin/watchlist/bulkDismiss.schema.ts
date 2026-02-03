import { z } from "zod";

export const ZBulkDismissReportsInputSchema = z.object({
  emails: z.array(z.string().email()).min(1, "At least one email must be selected"),
});

export type TBulkDismissReportsInputSchema = z.infer<typeof ZBulkDismissReportsInputSchema>;
