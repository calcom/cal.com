import { z } from "zod";

export const ZDeleteWatchlistEntrySchema = z.object({
  id: z.string(),
});

export type TDeleteWatchlistEntrySchema = z.infer<typeof ZDeleteWatchlistEntrySchema>;
