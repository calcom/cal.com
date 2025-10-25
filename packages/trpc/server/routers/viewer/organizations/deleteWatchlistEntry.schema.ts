import { z } from "zod";

export const ZDeleteWatchlistEntryInputSchema = z.object({
  id: z.string().uuid(),
});

export type TDeleteWatchlistEntryInputSchema = z.infer<typeof ZDeleteWatchlistEntryInputSchema>;
