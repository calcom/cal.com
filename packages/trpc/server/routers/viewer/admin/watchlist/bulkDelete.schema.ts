import { z } from "zod";

export const ZBulkDeleteWatchlistEntriesInputSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one entry must be selected"),
});

export type TBulkDeleteWatchlistEntriesInputSchema = z.infer<typeof ZBulkDeleteWatchlistEntriesInputSchema>;
