import { z } from "zod";

export const ZGetWatchlistEntryDetailsInputSchema = z.object({
  id: z.string().uuid(),
});

export type TGetWatchlistEntryDetailsInputSchema = z.infer<typeof ZGetWatchlistEntryDetailsInputSchema>;
