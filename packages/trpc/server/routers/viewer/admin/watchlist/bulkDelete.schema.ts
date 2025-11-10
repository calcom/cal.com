import { z } from "zod";

export const ZBulkDeleteWatchlistEntriesInputSchema = z.object({
  ids: z.array(z.string()).min(1, "At least one entry must be selected"),
});

export type TBulkDeleteWatchlistEntriesInputSchema = z.infer<
  typeof ZBulkDeleteWatchlistEntriesInputSchema
>;
